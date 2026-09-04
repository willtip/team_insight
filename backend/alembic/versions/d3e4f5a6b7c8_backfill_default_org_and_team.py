"""backfill unassigned employees into a default org and team

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
Create Date: 2026-09-04 00:00:00.000000

Organization/Team scoping made `employees.organization_id` / `team_id` the basis for
every visibility decision, but both arrived nullable and every pre-existing row has
them NULL. Under the new rules a NULL row is reachable by nobody except an admin, so
without this an existing deployment would silently lose its whole roster on deploy.

This creates one "Unassigned" organization and team, moves every orphan into it, and
gives it a leader (the first director with an employee record) so the data still has
someone who can see it. It also repairs any row whose `organization_id` disagrees
with its team's — the pair is now an invariant the API enforces on write.
"""
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd3e4f5a6b7c8'
down_revision: Union[str, None] = 'c2d3e4f5a6b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_ORG_NAME = "Unassigned Organization"
DEFAULT_TEAM_NAME = "Unassigned Team"


def upgrade() -> None:
    conn = op.get_bind()

    # Repair rows that disagree with their team before anything else — these are not
    # "unassigned", just inconsistent, and the team is the authority.
    conn.execute(
        sa.text(
            """
            UPDATE employees AS e
               SET organization_id = t.organization_id
              FROM teams AS t
             WHERE e.team_id = t.id
               AND (e.organization_id IS DISTINCT FROM t.organization_id)
            """
        )
    )

    orphans = conn.execute(
        sa.text(
            "SELECT COUNT(*) FROM employees WHERE organization_id IS NULL OR team_id IS NULL"
        )
    ).scalar_one()
    if not orphans:
        return

    org_id = conn.execute(
        sa.text("SELECT id FROM organizations WHERE name = :name"),
        {"name": DEFAULT_ORG_NAME},
    ).scalar_one_or_none()
    if org_id is None:
        org_id = str(uuid.uuid4())
        conn.execute(
            sa.text(
                "INSERT INTO organizations (id, name, description) VALUES (:id, :name, :description)"
            ),
            {
                "id": org_id,
                "name": DEFAULT_ORG_NAME,
                "description": "Created automatically for employees that predate org/team scoping.",
            },
        )

    team_id = conn.execute(
        sa.text("SELECT id FROM teams WHERE organization_id = :org AND name = :name"),
        {"org": org_id, "name": DEFAULT_TEAM_NAME},
    ).scalar_one_or_none()
    if team_id is None:
        team_id = str(uuid.uuid4())
        conn.execute(
            sa.text(
                "INSERT INTO teams (id, organization_id, name, description)"
                " VALUES (:id, :org, :name, :description)"
            ),
            {
                "id": team_id,
                "org": org_id,
                "name": DEFAULT_TEAM_NAME,
                "description": "Created automatically for employees that predate org/team scoping.",
            },
        )

    # An org with no leader is visible to admins only, which would defeat the point of
    # the backfill. Fall back to the first director who has an employee record.
    leader_id = conn.execute(
        sa.text(
            """
            SELECT e.id
              FROM employees AS e
              JOIN users AS u ON u.id = e.user_id
             WHERE u.role = 'DIRECTOR'
             ORDER BY e.created_at NULLS LAST, e.id
             LIMIT 1
            """
        )
    ).scalar_one_or_none()
    if leader_id:
        conn.execute(
            sa.text("UPDATE organizations SET leader_id = :leader WHERE id = :id AND leader_id IS NULL"),
            {"leader": leader_id, "id": org_id},
        )
        conn.execute(
            sa.text("UPDATE teams SET lead_id = :lead WHERE id = :id AND lead_id IS NULL"),
            {"lead": leader_id, "id": team_id},
        )

    # Assign team first so the org can be derived from it, keeping the two consistent.
    conn.execute(
        sa.text("UPDATE employees SET team_id = :team WHERE team_id IS NULL"),
        {"team": team_id},
    )
    conn.execute(
        sa.text(
            """
            UPDATE employees AS e
               SET organization_id = t.organization_id
              FROM teams AS t
             WHERE e.team_id = t.id
               AND e.organization_id IS NULL
            """
        )
    )


def downgrade() -> None:
    conn = op.get_bind()
    # Only detach the rows this migration parked in the default team; anything moved
    # to a real team since then is left alone.
    conn.execute(
        sa.text(
            """
            UPDATE employees
               SET team_id = NULL, organization_id = NULL
             WHERE team_id IN (
                   SELECT t.id FROM teams AS t
                     JOIN organizations AS o ON o.id = t.organization_id
                    WHERE o.name = :org AND t.name = :team
             )
            """
        ),
        {"org": DEFAULT_ORG_NAME, "team": DEFAULT_TEAM_NAME},
    )
    conn.execute(
        sa.text(
            "DELETE FROM teams WHERE name = :team AND organization_id IN"
            " (SELECT id FROM organizations WHERE name = :org)"
        ),
        {"org": DEFAULT_ORG_NAME, "team": DEFAULT_TEAM_NAME},
    )
    conn.execute(sa.text("DELETE FROM organizations WHERE name = :org"), {"org": DEFAULT_ORG_NAME})
