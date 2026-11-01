"""github repositories, webhook deliveries, submission PR fields

Revision ID: 6a7f8e9d0c1b
Revises: 05ddb56cb4fd
Create Date: 2026-10-29
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '6a7f8e9d0c1b'
down_revision: Union[str, None] = '05ddb56cb4fd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('repositories',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('user_id', sa.String(length=36), nullable=False),
    sa.Column('full_name', sa.String(length=200), nullable=False),
    sa.Column('github_id', sa.Integer(), nullable=True),
    sa.Column('installation_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'full_name', name='uq_repository_user_full_name')
    )
    op.create_index(op.f('ix_repositories_full_name'), 'repositories', ['full_name'], unique=False)
    op.create_index(op.f('ix_repositories_user_id'), 'repositories', ['user_id'], unique=False)
    op.create_table('webhook_deliveries',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('delivery_id', sa.String(length=100), nullable=False),
    sa.Column('event', sa.String(length=100), nullable=False),
    sa.Column('action', sa.String(length=100), nullable=True),
    sa.Column('repo_full_name', sa.String(length=200), nullable=True),
    sa.Column('processed', sa.Boolean(), nullable=False),
    sa.Column('error', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('delivery_id')
    )
    op.create_index(op.f('ix_webhook_deliveries_delivery_id'), 'webhook_deliveries', ['delivery_id'], unique=True)
    op.add_column('submissions', sa.Column('pr_state', sa.String(length=20), nullable=False, server_default='open'))
    op.add_column('submissions', sa.Column('merged', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('submissions', sa.Column('source', sa.String(length=20), nullable=False, server_default='webhook'))
    op.add_column('submissions', sa.Column('last_delivery_id', sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column('submissions', 'last_delivery_id')
    op.drop_column('submissions', 'source')
    op.drop_column('submissions', 'merged')
    op.drop_column('submissions', 'pr_state')
    op.drop_index(op.f('ix_webhook_deliveries_delivery_id'), table_name='webhook_deliveries')
    op.drop_table('webhook_deliveries')
    op.drop_index(op.f('ix_repositories_user_id'), table_name='repositories')
    op.drop_index(op.f('ix_repositories_full_name'), table_name='repositories')
    op.drop_table('repositories')
