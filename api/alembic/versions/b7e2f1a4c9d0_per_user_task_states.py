"""Per-user task state: each intern's board position lives in user_task_states.

Task rows are shared curriculum templates; student transitions, approvals,
and blocker notes used to mutate them globally, so one student's progress
leaked onto every other student's board. This migration adds the per-student
table and restores the shared rows to their seeded template statuses
(AI-001 todo, the rest locked) plus clears globally-set blocker notes.
Per-student approvals and submissions already in the database keep working:
effective status derives approved from a student's own approvals.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b7e2f1a4c9d0'
down_revision: Union[str, None] = '9c3e5a7b8d2f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('user_task_states',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('user_id', sa.String(length=36), nullable=False),
    sa.Column('task_id', sa.String(length=36), nullable=False),
    sa.Column('blocked_reason', sa.Text(), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'task_id', name='uq_user_task_state')
    )
    # The taskstatus enum already exists from the initial migration; reference
    # it directly instead of declaring a column type (avoids CREATE TYPE).
    op.execute('ALTER TABLE user_task_states ADD COLUMN status taskstatus NOT NULL')
    op.create_index(op.f('ix_user_task_states_task_id'), 'user_task_states', ['task_id'], unique=False)
    op.create_index(op.f('ix_user_task_states_user_id'), 'user_task_states', ['user_id'], unique=False)
    op.execute("UPDATE tasks SET status = 'todo' WHERE key = 'AI-001'")
    op.execute("UPDATE tasks SET status = 'locked' WHERE key IN ('AI-002', 'AI-003', 'AI-004', 'AI-005', 'AI-006')")
    op.execute("UPDATE tasks SET blocked_reason = NULL")


def downgrade() -> None:
    op.drop_index(op.f('ix_user_task_states_user_id'), table_name='user_task_states')
    op.drop_index(op.f('ix_user_task_states_task_id'), table_name='user_task_states')
    op.drop_table('user_task_states')
