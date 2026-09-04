"""organizations and teams (rbac scoping)

Revision ID: b1c2d3e4f5a6
Revises: 970ade8f2e9b
Create Date: 2026-09-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, None] = '970ade8f2e9b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'organizations',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('leader_id', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )

    op.add_column('employees', sa.Column('organization_id', sa.String(), nullable=True))
    op.add_column('employees', sa.Column('team_id', sa.String(), nullable=True))
    op.create_index(op.f('ix_employees_organization_id'), 'employees', ['organization_id'])
    op.create_index(op.f('ix_employees_team_id'), 'employees', ['team_id'])
    op.create_foreign_key(
        'fk_employees_organization_id', 'employees', 'organizations', ['organization_id'], ['id']
    )

    op.create_table(
        'teams',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('organization_id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('lead_id', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['lead_id'], ['employees.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', 'name', name='uq_team_org_name'),
    )
    op.create_index(op.f('ix_teams_organization_id'), 'teams', ['organization_id'])

    op.create_foreign_key(
        'fk_employees_team_id', 'employees', 'teams', ['team_id'], ['id']
    )
    op.create_foreign_key(
        'fk_organizations_leader_id', 'organizations', 'employees', ['leader_id'], ['id']
    )


def downgrade() -> None:
    op.drop_constraint('fk_organizations_leader_id', 'organizations', type_='foreignkey')
    op.drop_constraint('fk_employees_team_id', 'employees', type_='foreignkey')
    op.drop_index(op.f('ix_teams_organization_id'), table_name='teams')
    op.drop_table('teams')
    op.drop_constraint('fk_employees_organization_id', 'employees', type_='foreignkey')
    op.drop_index(op.f('ix_employees_team_id'), table_name='employees')
    op.drop_index(op.f('ix_employees_organization_id'), table_name='employees')
    op.drop_column('employees', 'team_id')
    op.drop_column('employees', 'organization_id')
    op.drop_table('organizations')
