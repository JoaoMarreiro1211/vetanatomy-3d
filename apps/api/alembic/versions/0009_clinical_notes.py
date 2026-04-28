"""clinical notes

Revision ID: 0009_clinical_notes
Revises: 0008_clinical_reminders
Create Date: 2026-04-28
"""

from alembic import op
import sqlalchemy as sa

revision = "0009_clinical_notes"
down_revision = "0008_clinical_reminders"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "clinical_notes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id"), nullable=False),
        sa.Column("note_type", sa.String(), nullable=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("subjective", sa.String(), nullable=True),
        sa.Column("objective", sa.String(), nullable=True),
        sa.Column("assessment", sa.String(), nullable=True),
        sa.Column("plan", sa.String(), nullable=True),
        sa.Column("vitals", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
    )


def downgrade():
    op.drop_table("clinical_notes")
