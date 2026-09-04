"""Employee CRUD endpoints."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_scope, require_employee_access, require_role
from app.core.rbac import Scope
from app.db.session import get_db
from app.models.models import (
    Accomplishment,
    Certification,
    Conference,
    DevelopmentPlanItem,
    Employee,
    MentoringRelation,
    PerformanceScore,
    PromotionReadinessEnum,
    Training,
    User,
)
from app.routers._employee_helpers import DETAIL_RELATIONSHIPS, resolve_assignment, to_employee_detail
from app.schemas.schemas import (
    AccomplishmentCreate,
    AccomplishmentResponse,
    AccomplishmentUpdate,
    CertificationCreate,
    CertificationResponse,
    CertificationUpdate,
    ConferenceCreate,
    ConferenceResponse,
    ConferenceUpdate,
    DevelopmentPlanItemCreate,
    DevelopmentPlanItemResponse,
    EmployeeCreate,
    EmployeeDetail,
    EmployeeUpdate,
    MentoringRelationCreate,
    MentoringRelationResponse,
    MentoringRelationUpdate,
    TrainingCreate,
    TrainingResponse,
    TrainingUpdate,
)
from app.services import evaluation_service
from app.services.ai_service import generate_employee_summary

router = APIRouter()



@router.get("/", response_model=List[EmployeeDetail])
async def list_employees(
    department: Optional[str] = None,
    manager_id: Optional[str] = None,
    organization_id: Optional[str] = None,
    team_id: Optional[str] = None,
    is_high_potential: Optional[bool] = None,
    needs_coaching: Optional[bool] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 500,
    db: AsyncSession = Depends(get_db),
    scope: Scope = Depends(get_scope),
):
    """
    List all employees with optional filtering, fully populated (skills, goals,
    projects, development, performance). The dashboard/skills analytics run
    client-side over the whole roster, so the list endpoint returns full detail
    rather than a lightweight summary.

    Results are scoped by walking the leadership chain (see app/core/rbac.py): an org
    leader sees every team in their organization, a team leader sees their team, and
    a user holding both grants sees the union. Admins see all.

    Asking for an org or team outside that scope is a 403, not a quietly empty list.
    """
    if organization_id:
        scope.assert_can_view_org(organization_id)
    if team_id:
        scope.assert_can_view_team(team_id)

    query = select(Employee).options(*DETAIL_RELATIONSHIPS)
    if not scope.unrestricted:
        if not scope.employee_ids:
            return []
        query = query.where(Employee.id.in_(scope.employee_ids))
    if department:
        query = query.where(Employee.department == department)
    if manager_id:
        query = query.where(Employee.manager_id == manager_id)
    if organization_id:
        query = query.where(Employee.organization_id == organization_id)
    if team_id:
        query = query.where(Employee.team_id == team_id)
    if is_high_potential is not None:
        query = query.where(Employee.is_high_potential == is_high_potential)
    if needs_coaching is not None:
        query = query.where(Employee.needs_coaching == needs_coaching)
    if search:
        like = f"%{search}%"
        query = query.where(or_(Employee.name.ilike(like), Employee.email.ilike(like)))
    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    return [to_employee_detail(e) for e in result.scalars().all()]


@router.get("/{employee_id}", response_model=EmployeeDetail)
async def get_employee(
    employee_id: str,
    db: AsyncSession = Depends(get_db),
    _scope: Scope = Depends(require_employee_access),
):
    """Get full employee profile including skills, goals, development records."""
    query = select(Employee).options(*DETAIL_RELATIONSHIPS).where(Employee.id == employee_id)
    result = await db.execute(query)
    employee = result.scalar_one_or_none()
    if employee is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Employee not found")
    return to_employee_detail(employee)


@router.post("/", response_model=EmployeeDetail, status_code=201)
async def create_employee(
    employee: EmployeeCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role("director", "admin")),
    scope: Scope = Depends(get_scope),
):
    """Create a new employee profile. Director/Admin only, and only into an
    organization the caller actually leads."""
    existing = await db.execute(
        select(Employee).where(Employee.employee_id == employee.employee_id)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "employee_id already exists")

    if employee.manager_id:
        if await db.get(Employee, employee.manager_id) is None:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Manager not found")
        scope.assert_can_view_employee(employee.manager_id)

    fields = employee.model_dump()
    fields["organization_id"], fields["team_id"] = await resolve_assignment(
        db, scope, employee.organization_id, employee.team_id
    )

    db_employee = Employee(**fields)
    db.add(db_employee)
    await db.flush()
    # Every employee carries a performance score (defaults to neutral until recalculated),
    # matching the invariant the frontend relies on.
    db.add(PerformanceScore(employee_id=db_employee.id, overall=50, trend="stable"))
    await db.commit()
    query = select(Employee).options(*DETAIL_RELATIONSHIPS).where(Employee.id == db_employee.id)
    result = await db.execute(query)
    return to_employee_detail(result.scalar_one())


@router.patch("/{employee_id}", response_model=EmployeeDetail)
async def update_employee(
    employee_id: str,
    updates: EmployeeUpdate,
    db: AsyncSession = Depends(get_db),
    scope: Scope = Depends(require_employee_access),
):
    """Update employee profile fields."""
    employee = await db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Employee not found")

    update_fields = updates.model_dump(exclude_unset=True)
    if "manager_id" in update_fields:
        new_manager_id = update_fields["manager_id"]
        if new_manager_id == employee_id:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "An employee cannot manage themselves")
        if new_manager_id:
            if await db.get(Employee, new_manager_id) is None:
                raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Manager not found")
            scope.assert_can_view_employee(new_manager_id)

    # Re-assignment is the privilege-escalation path: without this, a team lead could
    # move themselves (or someone else) into an organization they have no grant over.
    # Both the source and the destination org must be manageable by the caller.
    if "organization_id" in update_fields or "team_id" in update_fields:
        if employee.organization_id:
            scope.assert_can_manage_org(employee.organization_id)
        update_fields["organization_id"], update_fields["team_id"] = await resolve_assignment(
            db,
            scope,
            update_fields.get("organization_id", employee.organization_id),
            update_fields.get("team_id", employee.team_id),
        )

    for field, value in update_fields.items():
        setattr(employee, field, value)

    await db.commit()
    query = select(Employee).options(*DETAIL_RELATIONSHIPS).where(Employee.id == employee_id)
    result = await db.execute(query)
    return to_employee_detail(result.scalar_one())


@router.delete("/{employee_id}", status_code=204)
async def deactivate_employee(
    employee_id: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role("director", "admin")),
    _scope: Scope = Depends(require_employee_access),
):
    """Remove an employee record (and all owned data) from the team. Director/Admin only."""
    employee = await db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Employee not found")
    await db.delete(employee)
    await db.commit()


@router.get("/{employee_id}/performance", tags=["Performance"])
async def get_performance_score(
    employee_id: str,
    db: AsyncSession = Depends(get_db),
    _scope: Scope = Depends(require_employee_access),
):
    """Get the calculated performance scores for an employee."""
    result = await db.execute(select(PerformanceScore).where(PerformanceScore.employee_id == employee_id))
    score = result.scalar_one_or_none()
    if score is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No performance score calculated yet")
    return score


@router.post("/{employee_id}/performance/recalculate", tags=["Performance"])
async def recalculate_performance(
    employee_id: str,
    db: AsyncSession = Depends(get_db),
    _scope: Scope = Depends(require_employee_access),
):
    """Trigger recalculation of performance scores using current weight config."""
    query = (
        select(Employee)
        .options(
            selectinload(Employee.goals),
            selectinload(Employee.project_contributions),
            selectinload(Employee.certifications),
            selectinload(Employee.training_records),
            selectinload(Employee.conferences),
            selectinload(Employee.mentoring_relations),
            selectinload(Employee.performance_score),
        )
        .where(Employee.id == employee_id)
    )
    result = await db.execute(query)
    employee = result.scalar_one_or_none()
    if employee is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Employee not found")

    goals = [
        {"status": g.status.value if g.status else "Not Started", "priority": g.priority.value if g.priority else "Medium", "progress": g.progress}
        for g in employee.goals
    ]
    contributions = [
        {
            "date": c.date,
            "leadership_score": c.leadership_score,
            "collaboration_score": c.collaboration_score,
            "innovation_score": c.innovation_score,
        }
        for c in employee.project_contributions
    ]

    goal_score = evaluation_service.calculate_goal_achievement_score(goals)
    project_score = evaluation_service.calculate_project_contribution_score(contributions)
    dev_score = evaluation_service.calculate_development_score(
        {
            "certifications": employee.certifications,
            "training": [{"status": t.status} for t in employee.training_records],
            "conferences": [{"role": c.role} for c in employee.conferences],
            "mentoring": [{"active": m.active} for m in employee.mentoring_relations],
        }
    )

    # Leadership/collaboration/innovation derived from raw 1-5 project scores (no dedicated tracking yet).
    def _avg_project_dimension(field: str) -> float:
        values = [getattr(c, field) for c in employee.project_contributions if getattr(c, field) is not None]
        return round((sum(values) / len(values)) * 20) if values else 50.0

    leadership_score = _avg_project_dimension("leadership_score")
    collaboration_score = _avg_project_dimension("collaboration_score")
    innovation_score = _avg_project_dimension("innovation_score")

    overall = evaluation_service.calculate_overall_score(
        goal_score=goal_score,
        project_score=project_score,
        development_score=dev_score,
        leadership_score=leadership_score,
        collaboration_score=collaboration_score,
        innovation_score=innovation_score,
    )

    tenure_months = 0
    if employee.hire_date:
        from datetime import datetime

        tenure_months = max(0, (datetime.now() - employee.hire_date).days // 30)
    has_cross_team_influence = any((c.leadership_score or 0) >= 4 for c in employee.project_contributions)

    promotion_score = evaluation_service.calculate_promotion_readiness_score(
        overall=overall,
        growth_score=dev_score,
        leadership_readiness=leadership_score,
        tenure_at_level_months=tenure_months,
        has_cross_team_influence=has_cross_team_influence,
    )
    promotion_label = evaluation_service.score_to_promotion_readiness(promotion_score)

    score = employee.performance_score
    previous_overall = score.overall if score else None
    if score is None:
        score = PerformanceScore(employee_id=employee_id)
        db.add(score)
    score.goal_achievement = goal_score
    score.project_contributions = project_score
    score.professional_development = dev_score
    score.leadership_behaviors = leadership_score
    score.collaboration = collaboration_score
    score.innovation = innovation_score
    score.growth_score = dev_score
    score.leadership_readiness = leadership_score
    score.overall = overall
    score.promotion_readiness = promotion_score
    if previous_overall is not None:
        score.trend = "up" if overall > previous_overall else "down" if overall < previous_overall else "stable"

    employee.promotion_readiness = PromotionReadinessEnum(promotion_label)

    await db.commit()
    await db.refresh(score)
    return score


@router.get("/{employee_id}/summary/ai", tags=["AI"])
async def get_ai_summary(
    employee_id: str,
    period: str = Query("quarterly", pattern="^(monthly|quarterly|annual)$"),
    db: AsyncSession = Depends(get_db),
    _scope: Scope = Depends(require_employee_access),
):
    """
    Generate an AI-powered performance summary for the employee.
    Calls OpenAI/Azure OpenAI with structured performance context.
    """
    query = select(Employee).options(*DETAIL_RELATIONSHIPS).where(Employee.id == employee_id)
    result = await db.execute(query)
    employee = result.scalar_one_or_none()
    if employee is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Employee not found")

    summary = await generate_employee_summary(to_employee_detail(employee).model_dump(mode="json"), period=period)
    return {"summary": summary}


@router.get("/{employee_id}/development-plan", response_model=List[DevelopmentPlanItemResponse])
async def list_development_plan(
    employee_id: str,
    db: AsyncSession = Depends(get_db),
    _scope: Scope = Depends(require_employee_access),
):
    result = await db.execute(
        select(DevelopmentPlanItem).where(DevelopmentPlanItem.employee_id == employee_id)
    )
    return result.scalars().all()


@router.post("/{employee_id}/development-plan", response_model=DevelopmentPlanItemResponse, status_code=201)
async def add_development_plan_item(
    employee_id: str,
    item: DevelopmentPlanItemCreate,
    db: AsyncSession = Depends(get_db),
    _scope: Scope = Depends(require_employee_access),
):
    db_item = DevelopmentPlanItem(employee_id=employee_id, **item.model_dump())
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    return db_item


@router.delete("/{employee_id}/development-plan/{item_id}", status_code=204)
async def delete_development_plan_item(
    employee_id: str,
    item_id: str,
    db: AsyncSession = Depends(get_db),
    _scope: Scope = Depends(require_employee_access),
):
    item = await db.get(DevelopmentPlanItem, item_id)
    if item is None or item.employee_id != employee_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Development plan item not found")
    await db.delete(item)
    await db.commit()


@router.get("/{employee_id}/accomplishments", response_model=List[AccomplishmentResponse])
async def list_accomplishments(
    employee_id: str,
    db: AsyncSession = Depends(get_db),
    _scope: Scope = Depends(require_employee_access),
):
    result = await db.execute(select(Accomplishment).where(Accomplishment.employee_id == employee_id))
    return result.scalars().all()


@router.post("/{employee_id}/accomplishments", response_model=AccomplishmentResponse, status_code=201)
async def add_accomplishment(
    employee_id: str,
    accomplishment: AccomplishmentCreate,
    db: AsyncSession = Depends(get_db),
    _scope: Scope = Depends(require_employee_access),
):
    db_accomplishment = Accomplishment(employee_id=employee_id, **accomplishment.model_dump())
    db.add(db_accomplishment)
    await db.commit()
    await db.refresh(db_accomplishment)
    return db_accomplishment


@router.patch("/{employee_id}/accomplishments/{accomplishment_id}", response_model=AccomplishmentResponse)
async def update_accomplishment(
    employee_id: str,
    accomplishment_id: str,
    updates: AccomplishmentUpdate,
    db: AsyncSession = Depends(get_db),
    _scope: Scope = Depends(require_employee_access),
):
    accomplishment = await db.get(Accomplishment, accomplishment_id)
    if accomplishment is None or accomplishment.employee_id != employee_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Accomplishment not found")
    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(accomplishment, field, value)
    await db.commit()
    await db.refresh(accomplishment)
    return accomplishment


@router.delete("/{employee_id}/accomplishments/{accomplishment_id}", status_code=204)
async def delete_accomplishment(
    employee_id: str,
    accomplishment_id: str,
    db: AsyncSession = Depends(get_db),
    _scope: Scope = Depends(require_employee_access),
):
    accomplishment = await db.get(Accomplishment, accomplishment_id)
    if accomplishment is None or accomplishment.employee_id != employee_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Accomplishment not found")
    await db.delete(accomplishment)
    await db.commit()


# ---- Professional development sub-resources (certs, training, conferences, mentoring) ----

@router.post("/{employee_id}/certifications", response_model=CertificationResponse, status_code=201)
async def add_certification(
    employee_id: str,
    certification: CertificationCreate,
    db: AsyncSession = Depends(get_db),
    _scope: Scope = Depends(require_employee_access),
):
    db_cert = Certification(employee_id=employee_id, **certification.model_dump())
    db.add(db_cert)
    await db.commit()
    await db.refresh(db_cert)
    return db_cert


@router.patch("/{employee_id}/certifications/{certification_id}", response_model=CertificationResponse)
async def update_certification(
    employee_id: str,
    certification_id: str,
    updates: CertificationUpdate,
    db: AsyncSession = Depends(get_db),
    _scope: Scope = Depends(require_employee_access),
):
    cert = await db.get(Certification, certification_id)
    if cert is None or cert.employee_id != employee_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Certification not found")
    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(cert, field, value)
    await db.commit()
    await db.refresh(cert)
    return cert


@router.delete("/{employee_id}/certifications/{certification_id}", status_code=204)
async def delete_certification(
    employee_id: str,
    certification_id: str,
    db: AsyncSession = Depends(get_db),
    _scope: Scope = Depends(require_employee_access),
):
    cert = await db.get(Certification, certification_id)
    if cert is None or cert.employee_id != employee_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Certification not found")
    await db.delete(cert)
    await db.commit()


@router.post("/{employee_id}/training", response_model=TrainingResponse, status_code=201)
async def add_training(
    employee_id: str,
    training: TrainingCreate,
    db: AsyncSession = Depends(get_db),
    _scope: Scope = Depends(require_employee_access),
):
    db_training = Training(employee_id=employee_id, **training.model_dump())
    db.add(db_training)
    await db.commit()
    await db.refresh(db_training)
    return db_training


@router.patch("/{employee_id}/training/{training_id}", response_model=TrainingResponse)
async def update_training(
    employee_id: str,
    training_id: str,
    updates: TrainingUpdate,
    db: AsyncSession = Depends(get_db),
    _scope: Scope = Depends(require_employee_access),
):
    training = await db.get(Training, training_id)
    if training is None or training.employee_id != employee_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Training record not found")
    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(training, field, value)
    await db.commit()
    await db.refresh(training)
    return training


@router.delete("/{employee_id}/training/{training_id}", status_code=204)
async def delete_training(
    employee_id: str,
    training_id: str,
    db: AsyncSession = Depends(get_db),
    _scope: Scope = Depends(require_employee_access),
):
    training = await db.get(Training, training_id)
    if training is None or training.employee_id != employee_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Training record not found")
    await db.delete(training)
    await db.commit()


@router.post("/{employee_id}/conferences", response_model=ConferenceResponse, status_code=201)
async def add_conference(
    employee_id: str,
    conference: ConferenceCreate,
    db: AsyncSession = Depends(get_db),
    _scope: Scope = Depends(require_employee_access),
):
    db_conference = Conference(employee_id=employee_id, **conference.model_dump())
    db.add(db_conference)
    await db.commit()
    await db.refresh(db_conference)
    return db_conference


@router.patch("/{employee_id}/conferences/{conference_id}", response_model=ConferenceResponse)
async def update_conference(
    employee_id: str,
    conference_id: str,
    updates: ConferenceUpdate,
    db: AsyncSession = Depends(get_db),
    _scope: Scope = Depends(require_employee_access),
):
    conference = await db.get(Conference, conference_id)
    if conference is None or conference.employee_id != employee_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conference not found")
    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(conference, field, value)
    await db.commit()
    await db.refresh(conference)
    return conference


@router.delete("/{employee_id}/conferences/{conference_id}", status_code=204)
async def delete_conference(
    employee_id: str,
    conference_id: str,
    db: AsyncSession = Depends(get_db),
    _scope: Scope = Depends(require_employee_access),
):
    conference = await db.get(Conference, conference_id)
    if conference is None or conference.employee_id != employee_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conference not found")
    await db.delete(conference)
    await db.commit()


@router.post("/{employee_id}/mentoring", response_model=MentoringRelationResponse, status_code=201)
async def add_mentoring_relation(
    employee_id: str,
    mentoring: MentoringRelationCreate,
    db: AsyncSession = Depends(get_db),
    _scope: Scope = Depends(require_employee_access),
):
    db_mentoring = MentoringRelation(employee_id=employee_id, **mentoring.model_dump())
    db.add(db_mentoring)
    await db.commit()
    await db.refresh(db_mentoring)
    return db_mentoring


@router.patch("/{employee_id}/mentoring/{mentoring_id}", response_model=MentoringRelationResponse)
async def update_mentoring_relation(
    employee_id: str,
    mentoring_id: str,
    updates: MentoringRelationUpdate,
    db: AsyncSession = Depends(get_db),
    _scope: Scope = Depends(require_employee_access),
):
    mentoring = await db.get(MentoringRelation, mentoring_id)
    if mentoring is None or mentoring.employee_id != employee_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Mentoring relation not found")
    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(mentoring, field, value)
    await db.commit()
    await db.refresh(mentoring)
    return mentoring


@router.delete("/{employee_id}/mentoring/{mentoring_id}", status_code=204)
async def delete_mentoring_relation(
    employee_id: str,
    mentoring_id: str,
    db: AsyncSession = Depends(get_db),
    _scope: Scope = Depends(require_employee_access),
):
    mentoring = await db.get(MentoringRelation, mentoring_id)
    if mentoring is None or mentoring.employee_id != employee_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Mentoring relation not found")
    await db.delete(mentoring)
    await db.commit()

