"""Completion certificates: at most one per student, publicly verifiable code.

Revision ID: c8d9e0f1a2b3
Revises: b7e2f1a4c9d0
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c8d9e0f1a2b3'
down_revision: Union[str, None] = 'b7e2f1a4c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('certificates',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('user_id', sa.String(length=36), nullable=False),
    sa.Column('code', sa.String(length=64), nullable=False),
    sa.Column('track', sa.String(length=100), nullable=False),
    sa.Column('recipient_name', sa.String(length=200), nullable=False),
    sa.Column('skills', sa.JSON(), nullable=False),
    sa.Column('issued_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_certificates_code'), 'certificates', ['code'], unique=True)
    op.create_index(op.f('ix_certificates_user_id'), 'certificates', ['user_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_certificates_user_id'), table_name='certificates')
    op.drop_index(op.f('ix_certificates_code'), table_name='certificates')
    op.drop_table('certificates')
