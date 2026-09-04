"""Organization + Team CRUD. These define the RBAC scoping hierarchy:
Organization (director-led) -> Team (manager-led) -> Employees.
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.deps import get_scope, require_role
from app.core.rbac import Scope, current_employee_id
from app.db.session import get_db
from app.models.models import Employee, Organization, Team, User
from app.schemas.schemas import (
    OrganizationCreate,
    OrganizationResponse,
    OrganizationUpdate,
    TeamCreate,
    TeamResponse,
    TeamUpdate,
)

router = APIRouter()


async def _to_org_response(org: Organization, db: AsyncSession) -> OrganizationResponse:
    team_count = (await db.execute(select(func.count()).select_from(Team).where(Team.organization_id == org.id))).scalar_one()
    employee_count = (await db.execute(select(func.count()).select_from(Employee).where(Employee.organization_id == org.id))).scalar_one()
    return OrganizationResponse(
        id=org.id, name=org.name, description=org.description,
        leader_id=org.leader_id, leader_name=org.leader.name if org.leader else None,
        team_count=team_count, employee_count=employee_count, created_at=org.created_at,
    )


async def _to_team_response(team: Team, db: AsyncSession) -> TeamResponse:
    employee_count = (await db.execute(select(func.count()).select_from(Employee).where(Employee.team_id == team.id))).scalar_one()
    return TeamResponse(
        id=team.id, organization_id=team.organization_id, name=team.name, description=team.description,
        lead_id=team.lead_id, lead_name=team.lead.name if team.lead else None,
        employee_count=employee_count, created_at=team.created_at,
    )


async def _require_org_admin(org_id: str, scope: Scope, db: AsyncSession) -> Organization:
    """Manage rights come from the chain (leads it, or created it), not a role name."""
    org = await db.get(Organization, org_id)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Organization not found")
    scope.assert_can_manage_org(org_id)
    return org


@router.get("/", response_model=List[OrganizationResponse])
async def list_organizations(
    db: AsyncSession = Depends(get_db), scope: Scope = Depends(get_scope)
):
    """List organizations the caller may select (admins see all). This is what
    populates the organization selector."""
    query = select(Organization).options(joinedload(Organization.leader))
    if not scope.unrestricted:
        if not scope.visible_org_ids:
            return []
        query = query.where(Organization.id.in_(scope.visible_org_ids))
    result = await db.execute(query)
    return [await _to_org_response(o, db) for o in result.scalars().unique().all()]


@router.post("/", response_model=OrganizationResponse, status_code=201)
async def create_organization(
    payload: OrganizationCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin", "director")),
    scope: Scope = Depends(get_scope),
):
    existing = (
        await db.execute(select(Organization).where(Organization.name == payload.name))
    ).scalar_one_or_none()
    if existing is not None:
        # Names are unique across the whole company, but the list this caller can see
        # is scoped to what they lead. A bare "already exists" therefore points at
        # something they cannot find in the UI or act on — so say where it went.
        if scope.can_view_org(existing.id):
            raise HTTPException(
                status.HTTP_409_CONFLICT, "An organization with this name already exists"
            )
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "An organization with this name already exists, but it is outside your "
            "scope. Ask an administrator to make you its leader, or pick another name.",
        )
    if payload.leader_id and await db.get(Employee, payload.leader_id) is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Leader not found")

    leader_id = payload.leader_id
    if leader_id is None:
        # Whoever bootstraps a new org would otherwise be immediately locked out of
        # managing the thing they just created — default to leading it. (created_by
        # also covers this, but an explicit leader keeps the chain walkable.)
        leader_id = scope.self_employee_id or await current_employee_id(user, db)

    org = Organization(
        name=payload.name, description=payload.description, leader_id=leader_id, created_by_user_id=user.id,
    )
    db.add(org)
    await db.commit()
    await db.refresh(org, attribute_names=["leader"])
    return await _to_org_response(org, db)


@router.patch("/{organization_id}", response_model=OrganizationResponse)
async def update_organization(
    organization_id: str,
    updates: OrganizationUpdate,
    db: AsyncSession = Depends(get_db),
    scope: Scope = Depends(get_scope),
):
    org = await _require_org_admin(organization_id, scope, db)
    fields = updates.model_dump(exclude_unset=True)
    if fields.get("leader_id") and await db.get(Employee, fields["leader_id"]) is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Leader not found")
    for field, value in fields.items():
        setattr(org, field, value)
    await db.commit()
    await db.refresh(org, attribute_names=["leader"])
    return await _to_org_response(org, db)


@router.delete("/{organization_id}", status_code=204)
async def delete_organization(
    organization_id: str,
    db: AsyncSession = Depends(get_db),
    scope: Scope = Depends(get_scope),
):
    org = await _require_org_admin(organization_id, scope, db)
    await db.delete(org)
    await db.commit()


@router.get("/{organization_id}/teams", response_model=List[TeamResponse])
async def list_teams(
    organization_id: str,
    db: AsyncSession = Depends(get_db),
    scope: Scope = Depends(get_scope),
):
    # Without this the org id in the URL was taken on trust, so any director could
    # enumerate another organization's teams just by changing the path.
    scope.assert_can_view_org(organization_id)

    query = select(Team).options(joinedload(Team.lead)).where(Team.organization_id == organization_id)
    if not scope.unrestricted and organization_id not in scope.led_org_ids:
        # Visible-but-not-led (e.g. a team lead browsing their own org): only the
        # teams they actually hold a grant on.
        if not scope.visible_team_ids:
            return []
        query = query.where(Team.id.in_(scope.visible_team_ids))
    result = await db.execute(query)
    return [await _to_team_response(t, db) for t in result.scalars().unique().all()]


@router.post("/{organization_id}/teams", response_model=TeamResponse, status_code=201)
async def create_team(
    organization_id: str,
    payload: TeamCreate,
    db: AsyncSession = Depends(get_db),
    scope: Scope = Depends(get_scope),
):
    await _require_org_admin(organization_id, scope, db)
    if payload.organization_id != organization_id:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "organization_id mismatch")
    existing = await db.execute(
        select(Team).where(Team.organization_id == organization_id, Team.name == payload.name)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "A team with this name already exists in this organization")
    if payload.lead_id and await db.get(Employee, payload.lead_id) is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Team lead not found")
    team = Team(organization_id=organization_id, name=payload.name, description=payload.description, lead_id=payload.lead_id)
    db.add(team)
    await db.commit()
    await db.refresh(team, attribute_names=["lead"])
    return await _to_team_response(team, db)


@router.patch("/teams/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: str,
    updates: TeamUpdate,
    db: AsyncSession = Depends(get_db),
    scope: Scope = Depends(get_scope),
):
    team = await db.get(Team, team_id)
    if team is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Team not found")
    await _require_org_admin(team.organization_id, scope, db)
    fields = updates.model_dump(exclude_unset=True)
    if fields.get("lead_id") and await db.get(Employee, fields["lead_id"]) is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Team lead not found")
    for field, value in fields.items():
        setattr(team, field, value)
    await db.commit()
    await db.refresh(team, attribute_names=["lead"])
    return await _to_team_response(team, db)


@router.delete("/teams/{team_id}", status_code=204)
async def delete_team(
    team_id: str,
    db: AsyncSession = Depends(get_db),
    scope: Scope = Depends(get_scope),
):
    team = await db.get(Team, team_id)
    if team is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Team not found")
    await _require_org_admin(team.organization_id, scope, db)
    await db.delete(team)
    await db.commit()
