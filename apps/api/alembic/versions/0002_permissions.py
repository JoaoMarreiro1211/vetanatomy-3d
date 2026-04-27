"""add permissions

Revision ID: 0002_permissions
Revises: 0001_initial
Create Date: 2026-04-27
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_permissions"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'permissions',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name', sa.String, nullable=False, unique=True),
    )

    op.create_table(
        'role_permissions',
        sa.Column('role_id', sa.Integer, sa.ForeignKey('roles.id'), nullable=False),
        sa.Column('permission_id', sa.Integer, sa.ForeignKey('permissions.id'), nullable=False),
    )


def downgrade():
    op.drop_table('role_permissions')
    op.drop_table('permissions')
