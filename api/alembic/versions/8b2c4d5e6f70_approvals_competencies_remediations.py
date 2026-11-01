"""approvals, competencies, remediations

Revision ID: 8b2c4d5e6f70
Revises: 6a7f8e9d0c1b
Create Date: 2026-10-29
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '8b2c4d5e6f70'
down_revision: Union[str, None] = '6a7f8e9d0c1b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('approvals',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('submission_id', sa.String(length=36), nullable=False),
    sa.Column('evaluation_id', sa.String(length=36), nullable=True),
    sa.Column('decision', sa.String(length=20), nullable=False),
    sa.Column('reason', sa.Text(), nullable=False),
    sa.Column('policy_version', sa.String(length=50), nullable=False),
    sa.Column('idempotency_key', sa.String(length=64), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['evaluation_id'], ['evaluations.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['submission_id'], ['submissions.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('idempotency_key'),
    sa.UniqueConstraint('submission_id')
    )
    op.create_index(op.f('ix_approvals_idempotency_key'), 'approvals', ['idempotency_key'], unique=True)
    op.create_index(op.f('ix_approvals_submission_id'), 'approvals', ['submission_id'], unique=True)
    op.create_table('competencies',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('user_id', sa.String(length=36), nullable=False),
    sa.Column('skill', sa.String(length=50), nullable=False),
    sa.Column('score', sa.Integer(), nullable=False),
    sa.Column('evidence_count', sa.Integer(), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'skill', name='uq_competency_user_skill')
    )
    op.create_index(op.f('ix_competencies_skill'), 'competencies', ['skill'], unique=False)
    op.create_index(op.f('ix_competencies_user_id'), 'competencies', ['user_id'], unique=False)
    op.create_table('remediations',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('approval_id', sa.String(length=36), nullable=False),
    sa.Column('failed_checks', sa.JSON(), nullable=False),
    sa.Column('hints', sa.JSON(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['approval_id'], ['approvals.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('approval_id')
    )


def downgrade() -> None:
    op.drop_table('remediations')
    op.drop_index(op.f('ix_competencies_user_id'), table_name='competencies')
    op.drop_index(op.f('ix_competencies_skill'), table_name='competencies')
    op.drop_table('competencies')
    op.drop_index(op.f('ix_approvals_submission_id'), table_name='approvals')
    op.drop_index(op.f('ix_approvals_idempotency_key'), table_name='approvals')
    op.drop_table('approvals')
