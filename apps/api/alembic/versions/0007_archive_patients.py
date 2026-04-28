"""archive patients

Revision ID: 0007_archive_patients
Revises: 0006_attachment_file_data
Create Date: 2026-04-28
"""

from alembic import op
import sqlalchemy as sa

revision = "0007_archive_patients"
down_revision = "0006_attachment_file_data"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("patients", sa.Column("is_archived", sa.Boolean(), nullable=True, server_default=sa.false()))
    op.execute("UPDATE patients SET is_archived = false WHERE is_archived IS NULL")


def downgrade():
    op.drop_column("patients", "is_archived")
