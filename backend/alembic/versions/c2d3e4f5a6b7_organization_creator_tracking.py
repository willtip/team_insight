"""organization creator tracking

Revision ID: c2d3e4f5a6b7
Revises: b1c2d3e4f5a6
Create Date: 2026-09-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c2d3e4f5a6b7'
down_revision: Union[str, None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('organizations', sa.Column('created_by_user_id', sa.String(), nullable=True))
    op.create_foreign_key(
        'fk_organizations_created_by_user_id', 'organizations', 'users', ['created_by_user_id'], ['id']
    )


def downgrade() -> None:
    op.drop_constraint('fk_organizations_created_by_user_id', 'organizations', type_='foreignkey')
    op.drop_column('organizations', 'created_by_user_id')
