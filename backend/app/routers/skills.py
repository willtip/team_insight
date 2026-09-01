"""Skill catalog, role profiles, thresholds, and per-employee assessment endpoints."""
import re
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.models import (
    Employee,
    RoleProfile,
    SkillAssessment,
    SkillDefinition,
    SkillThresholds,
    User,
)
from app.schemas.schemas import (
    RoleProfileCreate,
    RoleProfileResponse,
    RoleProfileUpdate,
    SkillAssessmentResponse,
    SkillAssessmentUpsert,
    SkillDefinitionCreate,
    SkillDefinitionResponse,
    SkillDefinitionUpdate,
    SkillThresholdsResponse,
    SkillThresholdsUpdate,
)

router = APIRouter()


def _slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


async def _unique_slug(db: AsyncSession, model, base: str) -> str:
    slug = base
    suffix = 1
    while await db.get(model, slug) is not None:
        suffix += 1
        slug = f"{base}-{suffix}"
    return slug


# ---- Skill Catalog ----

@router.get("/catalog", response_model=List[SkillDefinitionResponse])
async def list_catalog(db: AsyncSession = Depends(get_db), _user: User = Depends(get_current_user)):
    result = await db.execute(select(SkillDefinition).order_by(SkillDefinition.code))
    return result.scalars().all()


@router.post("/catalog", response_model=SkillDefinitionResponse, status_code=201)
async def create_skill_definition(
    skill: SkillDefinitionCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role("director", "admin")),
):
    max_code = (await db.execute(select(func.max(SkillDefinition.code)))).scalar() or 0
    slug = await _unique_slug(db, SkillDefinition, _slugify(skill.name))
    db_skill = SkillDefinition(id=slug, code=max_code + 1, custom=True, **skill.model_dump())
    db.add(db_skill)
    await db.commit()
    await db.refresh(db_skill)
    return db_skill


@router.patch("/catalog/{skill_id}", response_model=SkillDefinitionResponse)
async def update_skill_definition(
    skill_id: str,
    updates: SkillDefinitionUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role("director", "admin")),
):
    skill = await db.get(SkillDefinition, skill_id)
    if skill is None:
        raise HTTPException(404, "Skill not found")
    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(skill, field, value)
    await db.commit()
    await db.refresh(skill)
    return skill


@router.delete("/catalog/{skill_id}", status_code=204)
async def delete_skill_definition(
    skill_id: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role("director", "admin")),
):
    skill = await db.get(SkillDefinition, skill_id)
    if skill is None:
        raise HTTPException(404, "Skill not found")

    # Cascade: drop this skill from every role profile's depth areas.
    result = await db.execute(select(RoleProfile))
    for profile in result.scalars().all():
        if skill_id in (profile.depth_skill_ids or []):
            profile.depth_skill_ids = [s for s in profile.depth_skill_ids if s != skill_id]

    await db.delete(skill)
    await db.commit()


# ---- Role Profiles ----

@router.get("/role-profiles", response_model=List[RoleProfileResponse])
async def list_role_profiles(db: AsyncSession = Depends(get_db), _user: User = Depends(get_current_user)):
    result = await db.execute(select(RoleProfile))
    return result.scalars().all()


@router.post("/role-profiles", response_model=RoleProfileResponse, status_code=201)
async def create_role_profile(
    profile: RoleProfileCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role("director", "admin")),
):
    slug = await _unique_slug(db, RoleProfile, _slugify(profile.name))
    db_profile = RoleProfile(id=slug, **profile.model_dump())
    db.add(db_profile)
    await db.commit()
    await db.refresh(db_profile)
    return db_profile


@router.patch("/role-profiles/{role_id}", response_model=RoleProfileResponse)
async def update_role_profile(
    role_id: str,
    updates: RoleProfileUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role("director", "admin")),
):
    profile = await db.get(RoleProfile, role_id)
    if profile is None:
        raise HTTPException(404, "Role profile not found")
    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    await db.commit()
    await db.refresh(profile)
    return profile


@router.delete("/role-profiles/{role_id}", status_code=204)
async def delete_role_profile(
    role_id: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role("director", "admin")),
):
    profile = await db.get(RoleProfile, role_id)
    if profile is None:
        raise HTTPException(404, "Role profile not found")

    result = await db.execute(select(Employee).where(Employee.role_profile_id == role_id))
    for employee in result.scalars().all():
        employee.role_profile_id = None

    await db.delete(profile)
    await db.commit()


# ---- Thresholds (single active org-wide row) ----

async def _get_or_create_thresholds(db: AsyncSession) -> SkillThresholds:
    result = await db.execute(select(SkillThresholds).where(SkillThresholds.is_active.is_(True)))
    thresholds = result.scalar_one_or_none()
    if thresholds is None:
        thresholds = SkillThresholds()
        db.add(thresholds)
        await db.commit()
        await db.refresh(thresholds)
    return thresholds


@router.get("/thresholds", response_model=SkillThresholdsResponse)
async def get_thresholds(db: AsyncSession = Depends(get_db), _user: User = Depends(get_current_user)):
    return await _get_or_create_thresholds(db)


@router.patch("/thresholds", response_model=SkillThresholdsResponse)
async def update_thresholds(
    updates: SkillThresholdsUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role("director", "admin")),
):
    thresholds = await _get_or_create_thresholds(db)
    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(thresholds, field, value)
    await db.commit()
    await db.refresh(thresholds)
    return thresholds


# ---- Matrix / Gaps ----

@router.get("/matrix")
async def get_skills_matrix(
    employee_ids: Optional[List[str]] = None,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Return full skills matrix (assessments joined to catalog) for team heatmap visualization."""
    query = select(SkillAssessment)
    if employee_ids:
        query = query.where(SkillAssessment.employee_id.in_(employee_ids))
    result = await db.execute(query)
    assessments = [SkillAssessmentResponse.model_validate(a) for a in result.scalars().all()]

    catalog_result = await db.execute(select(SkillDefinition))
    catalog = [SkillDefinitionResponse.model_validate(s) for s in catalog_result.scalars().all()]
    return {"catalog": catalog, "assessments": assessments}


@router.get("/gaps")
async def get_skill_gaps(
    db: AsyncSession = Depends(get_db), _user: User = Depends(get_current_user)
):
    """Identify catalog skills where team coverage is below the org's coverage threshold."""
    thresholds = await _get_or_create_thresholds(db)
    catalog_result = await db.execute(select(SkillDefinition))
    catalog = catalog_result.scalars().all()

    assessments_result = await db.execute(select(SkillAssessment))
    assessments = assessments_result.scalars().all()

    gaps = []
    for skill in catalog:
        ratings = [
            a.reviewer_rating if a.reviewer_rating is not None else a.self_rating
            for a in assessments
            if a.skill_id == skill.id
        ]
        ratings = [r for r in ratings if r is not None]
        covered = sum(1 for r in ratings if r >= thresholds.coverage)
        if covered == 0:
            gaps.append(
                {
                    "skill_id": skill.id,
                    "skill_name": skill.name,
                    "domain": skill.domain,
                    "critical": skill.critical,
                    "covered_count": covered,
                    "rated_count": len(ratings),
                }
            )
    return gaps


# ---- Per-employee assessments ----

@router.get("/{employee_id}", response_model=List[SkillAssessmentResponse])
async def get_employee_skills(
    employee_id: str, db: AsyncSession = Depends(get_db), _user: User = Depends(get_current_user)
):
    result = await db.execute(select(SkillAssessment).where(SkillAssessment.employee_id == employee_id))
    return result.scalars().all()


@router.post("/{employee_id}", response_model=SkillAssessmentResponse, status_code=201)
async def upsert_employee_skill(
    employee_id: str,
    skill: SkillAssessmentUpsert,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create or update this employee's rating for a catalog skill."""
    result = await db.execute(
        select(SkillAssessment).where(
            SkillAssessment.employee_id == employee_id, SkillAssessment.skill_id == skill.skill_id
        )
    )
    assessment = result.scalar_one_or_none()
    if assessment is None:
        assessment = SkillAssessment(employee_id=employee_id, skill_id=skill.skill_id)
        db.add(assessment)

    for field, value in skill.model_dump(exclude={"skill_id"}, exclude_unset=True).items():
        setattr(assessment, field, value)
    assessment.assessed_at = datetime.utcnow()
    assessment.assessed_by = user.id

    await db.commit()
    await db.refresh(assessment)
    return assessment


@router.patch("/{employee_id}/{skill_id}", response_model=SkillAssessmentResponse)
async def update_employee_skill(
    employee_id: str,
    skill_id: str,
    updates: SkillAssessmentUpsert,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SkillAssessment).where(
            SkillAssessment.employee_id == employee_id, SkillAssessment.skill_id == skill_id
        )
    )
    assessment = result.scalar_one_or_none()
    if assessment is None:
        raise HTTPException(404, "Skill assessment not found")

    for field, value in updates.model_dump(exclude={"skill_id"}, exclude_unset=True).items():
        setattr(assessment, field, value)
    assessment.assessed_at = datetime.utcnow()
    assessment.assessed_by = user.id

    await db.commit()
    await db.refresh(assessment)
    return assessment
