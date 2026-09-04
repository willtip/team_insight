"""Org/Team scoping rules.

Visibility is computed by walking the leadership chain, never by role name:

    Organization (leader_id) -> Team (lead_id) -> Employee (team_id/organization_id)

A user's scope is the *union* of every grant they hold:

- leading an Organization grants every team in it and every employee in it;
- leading a Team grants every employee on that team;
- everyone always sees their own employee record.

Because those grants are unioned as sets, a person who is both an org leader and a
team leader gets the correct combined scope with no duplicates and no special case
— the team grant simply contributes nothing the org grant did not already cover.

`User.role` deliberately plays no part in *visibility*. It remains a coarse
capability flag (who may create an organization, who may write notes) and the
single exception below:

- admin: unrestricted. `Scope.unrestricted` is True and every check short-circuits.
"""
from dataclasses import dataclass, field
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Employee, Organization, Team, User


@dataclass(frozen=True)
class Scope:
    """An immutable snapshot of what one user is allowed to see, resolved per request."""

    user_id: str
    unrestricted: bool
    #: The Employee row linked to this user account, if one exists.
    self_employee_id: Optional[str] = None
    #: Organizations this user leads — full visibility of every team/employee inside.
    led_org_ids: frozenset[str] = field(default_factory=frozenset)
    #: Teams granting full visibility: led directly, or belonging to a led org.
    led_team_ids: frozenset[str] = field(default_factory=frozenset)
    #: Organizations that may be *selected* — led, plus the org behind any team led,
    #: plus the user's own org. Selecting one does not imply seeing all of it; the
    #: employee filter still applies.
    visible_org_ids: frozenset[str] = field(default_factory=frozenset)
    #: Teams that may be selected — led, plus the user's own team.
    visible_team_ids: frozenset[str] = field(default_factory=frozenset)
    #: Every employee id this user may read.
    employee_ids: frozenset[str] = field(default_factory=frozenset)
    #: Organizations this user may modify (create teams in, assign leaders, delete).
    manage_org_ids: frozenset[str] = field(default_factory=frozenset)

    def can_view_employee(self, employee_id: str) -> bool:
        return self.unrestricted or employee_id in self.employee_ids

    def can_view_org(self, organization_id: str) -> bool:
        return self.unrestricted or organization_id in self.visible_org_ids

    def can_view_team(self, team_id: str) -> bool:
        return self.unrestricted or team_id in self.visible_team_ids

    def can_manage_org(self, organization_id: str) -> bool:
        return self.unrestricted or organization_id in self.manage_org_ids

    # --- assertions: these raise 403 rather than returning a filtered/empty 200 ---

    def assert_can_view_employee(self, employee_id: str) -> None:
        if not self.can_view_employee(employee_id):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not permitted to view this employee")

    def assert_can_view_employees(self, employee_ids) -> None:
        for employee_id in employee_ids:
            self.assert_can_view_employee(employee_id)

    def assert_can_view_org(self, organization_id: str) -> None:
        if not self.can_view_org(organization_id):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not permitted to view this organization")

    def assert_can_view_team(self, team_id: str) -> None:
        if not self.can_view_team(team_id):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not permitted to view this team")

    def assert_can_manage_org(self, organization_id: str) -> None:
        if not self.can_manage_org(organization_id):
            raise HTTPException(
                status.HTTP_403_FORBIDDEN, "Not permitted to manage this organization"
            )


async def current_employee_id(user: User, db: AsyncSession) -> Optional[str]:
    """The Employee row linked to this User's account, if any."""
    result = await db.execute(select(Employee.id).where(Employee.user_id == user.id))
    return result.scalar_one_or_none()


async def _scalars(db: AsyncSession, query) -> set[str]:
    result = await db.execute(query)
    return {row[0] for row in result.all() if row[0] is not None}


async def build_scope(user: User, db: AsyncSession) -> Scope:
    """Resolve one user's full visibility by walking org -> team -> employee.

    Every grant is unioned; nothing here branches on ``user.role`` except the
    admin short-circuit.
    """
    if user.role.value == "admin":
        return Scope(user_id=user.id, unrestricted=True)

    self_id = await current_employee_id(user, db)

    # Orgs this user created — a director who just bootstrapped an org has no
    # employees in it yet and would otherwise be locked out of the thing they made.
    created_org_ids = await _scalars(
        db, select(Organization.id).where(Organization.created_by_user_id == user.id)
    )

    if self_id is None:
        # No linked Employee row: no leadership grants are possible. Note that
        # `Organization.leader_id == None` would compile to `IS NULL` and match every
        # unassigned org, so this branch must not fall through to the queries below.
        return Scope(
            user_id=user.id,
            unrestricted=False,
            visible_org_ids=frozenset(created_org_ids),
            manage_org_ids=frozenset(created_org_ids),
        )

    # --- grant 1: organizations led ---
    led_org_ids = await _scalars(
        db, select(Organization.id).where(Organization.leader_id == self_id)
    )

    # --- grant 2: teams led directly ---
    direct_team_ids = await _scalars(db, select(Team.id).where(Team.lead_id == self_id))

    # Every team inside a led org is covered by the org grant. Unioning here is what
    # makes the dual-role case fall out arithmetically instead of via a role check.
    org_team_ids: set[str] = set()
    if led_org_ids:
        org_team_ids = await _scalars(
            db, select(Team.id).where(Team.organization_id.in_(led_org_ids))
        )
    led_team_ids = direct_team_ids | org_team_ids

    # --- employees: union of both grants, plus always oneself ---
    employee_ids: set[str] = {self_id}
    predicates = []
    if led_org_ids:
        predicates.append(Employee.organization_id.in_(led_org_ids))
    if led_team_ids:
        predicates.append(Employee.team_id.in_(led_team_ids))
    if predicates:
        employee_ids |= await _scalars(db, select(Employee.id).where(or_(*predicates)))

    # --- selectable orgs/teams: what the org/team pickers may offer ---
    self_row = await db.execute(
        select(Employee.organization_id, Employee.team_id).where(Employee.id == self_id)
    )
    self_org_id, self_team_id = self_row.one_or_none() or (None, None)

    # A team leader needs to see the org their team sits in, or they cannot navigate
    # to their own team through the org -> team selector.
    team_org_ids: set[str] = set()
    if direct_team_ids:
        team_org_ids = await _scalars(
            db, select(Team.organization_id).where(Team.id.in_(direct_team_ids))
        )

    visible_org_ids = led_org_ids | team_org_ids | created_org_ids
    if self_org_id:
        visible_org_ids.add(self_org_id)

    visible_team_ids = set(led_team_ids)
    if self_team_id:
        visible_team_ids.add(self_team_id)

    return Scope(
        user_id=user.id,
        unrestricted=False,
        self_employee_id=self_id,
        led_org_ids=frozenset(led_org_ids),
        led_team_ids=frozenset(led_team_ids),
        visible_org_ids=frozenset(visible_org_ids),
        visible_team_ids=frozenset(visible_team_ids),
        employee_ids=frozenset(employee_ids),
        manage_org_ids=frozenset(led_org_ids | created_org_ids),
    )


async def visible_employee_ids(user: User, db: AsyncSession) -> Optional[set[str]]:
    """Back-compat shim: None means "no restriction" (admin), else the allowed set."""
    scope = await build_scope(user, db)
    return None if scope.unrestricted else set(scope.employee_ids)
