"""onboarding fields on enrollments

Revision ID: 20261028_0002
Revises: 20261027_0001
Create Date: 2026-10-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20261028_0002"
down_revision: Union[str, None] = "20261027_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("enrollments", sa.Column("experience_level", sa.String(length=50), nullable=True))
    op.add_column("enrollments", sa.Column("diagnostic_result", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("enrollments", "diagnostic_result")
    op.drop_column("enrollments", "experience_level")
