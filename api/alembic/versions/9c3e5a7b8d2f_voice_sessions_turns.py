"""voice sessions and turns

Revision ID: 9c3e5a7b8d2f
Revises: 8b2c4d5e6f70
Create Date: 2026-10-29
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '9c3e5a7b8d2f'
down_revision: Union[str, None] = '8b2c4d5e6f70'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('voice_sessions',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('user_id', sa.String(length=36), nullable=False),
    sa.Column('persona', sa.String(length=100), nullable=False),
    sa.Column('consent', sa.Boolean(), nullable=False),
    sa.Column('language_hint', sa.String(length=20), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_voice_sessions_user_id'), 'voice_sessions', ['user_id'], unique=False)
    op.create_table('voice_turns',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('session_id', sa.String(length=36), nullable=False),
    sa.Column('sequence', sa.Integer(), nullable=False),
    sa.Column('transcript', sa.Text(), nullable=False),
    sa.Column('submitted_text', sa.Text(), nullable=True),
    sa.Column('stt_mock', sa.Boolean(), nullable=False),
    sa.Column('reply_text', sa.Text(), nullable=True),
    sa.Column('tts_mock', sa.Boolean(), nullable=False),
    sa.Column('audio_stored', sa.Boolean(), nullable=False),
    sa.Column('duration_seconds', sa.Float(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['session_id'], ['voice_sessions.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_voice_turns_session_id'), 'voice_turns', ['session_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_voice_turns_session_id'), table_name='voice_turns')
    op.drop_table('voice_turns')
    op.drop_index(op.f('ix_voice_sessions_user_id'), table_name='voice_sessions')
    op.drop_table('voice_sessions')
