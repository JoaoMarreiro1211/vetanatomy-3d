"""clinical reminders

Revision ID: 0008_clinical_reminders
Revises: 0007_archive_patients
Create Date: 2026-04-28
"""

from alembic import op
import sqlalchemy as sa

revision = "0008_clinical_reminders"
down_revision = "0007_archive_patients"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "clinical_reminders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id"), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("reminder_type", sa.String(), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("priority", sa.String(), nullable=True),
        sa.Column("notes", sa.String(), nullable=True),
        sa.Column("is_done", sa.Boolean(), nullable=True, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
    )


def downgrade():
    op.drop_table("clinical_reminders")
