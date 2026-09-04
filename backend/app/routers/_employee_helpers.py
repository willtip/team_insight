"""Shared helpers for building EmployeeDetail responses with all nested data eager-loaded."""
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.core.rbac import Scope
from app.models.models import DirectorNote, Employee, Organization, Team
from app.schemas.schemas import DirectorNoteResponse, EmployeeDetail, ProfessionalDevelopmentResponse

# joinedload for to-one relations (single extra JOIN, no round trip); selectinload for
# one-to-many collections (each needs its own WHERE IN query regardless of strategy).
DETAIL_RELATIONSHIPS = (
    selectinload(Employee.skills),
    selectinload(Employee.goals),
    joinedload(Employee.performance_score),
    joinedload(Employee.manager),
    joinedload(Employee.organization),
    joinedload(Employee.team),
    selectinload(Employee.project_contributions),
    selectinload(Employee.certifications),
    selectinload(Employee.training_records),
    selectinload(Employee.conferences),
    selectinload(Employee.mentoring_relations),
    selectinload(Employee.director_notes).joinedload(DirectorNote.author),
)


def to_employee_detail(employee: Employee) -> EmployeeDetail:
    employee.tags = employee.tags or []
    detail = EmployeeDetail.model_validate(employee)
    detail.manager_name = employee.manager.name if employee.manager else None
    detail.organization_name = employee.organization.name if employee.organization else None
    detail.team_name = employee.team.name if employee.team else None
    detail.development = ProfessionalDevelopmentResponse(
        certifications=employee.certifications,
        training=employee.training_records,
        conferences=employee.conferences,
        mentoring=employee.mentoring_relations,
    )
    detail.notes = [
        DirectorNoteResponse(
            id=note.id,
            employee_id=note.employee_id,
            author_id=note.author_id,
            author_name=note.author.name if note.author else "Unknown",
            category=note.category,
            title=note.title,
            content=note.content,
            follow_up_date=note.follow_up_date,
            is_private=note.is_private,
            tags=note.tags or [],
            created_at=note.created_at,
            updated_at=note.updated_at,
        )
        for note in employee.director_notes
    ]
    return detail


async def resolve_assignment(
    db: AsyncSession,
    scope: Scope,
    organization_id: Optional[str],
    team_id: Optional[str],
) -> tuple[Optional[str], Optional[str]]:
    """Validate an employee's org/team assignment and return the pair to persist.

    The team is the authority: an employee belongs to exactly one team and, by
    extension, to that team's organization. `organization_id` stays denormalized on
    the row for cheap filtering, so it is derived here rather than trusted, which
    also closes the hole where a caller could park someone on a team in org A while
    labelling them org B.

    The caller must be able to manage the destination organization, otherwise a team
    lead could move an engineer into an org they have no authority over.
    """
    if team_id:
        team = await db.get(Team, team_id)
        if team is None:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Team not found")
        if organization_id and organization_id != team.organization_id:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "team_id belongs to a different organization than organization_id",
            )
        scope.assert_can_manage_org(team.organization_id)
        return team.organization_id, team.id

    if organization_id:
        if await db.get(Organization, organization_id) is None:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Organization not found")
        scope.assert_can_manage_org(organization_id)
        return organization_id, None

    return None, None
