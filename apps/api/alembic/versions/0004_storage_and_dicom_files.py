"""storage and dicom files

Revision ID: 0004_storage_and_dicom_files
Revises: 0003_add_refresh_tokens
Create Date: 2026-04-27
"""

from alembic import op
import sqlalchemy as sa

revision = "0004_storage_and_dicom_files"
down_revision = "0003_add_refresh_tokens"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    dialect_name = bind.dialect.name

    op.add_column("attachments", sa.Column("patient_id", sa.Integer(), nullable=True))
    op.add_column("attachments", sa.Column("content_type", sa.String(), nullable=True))
    op.add_column("attachments", sa.Column("size_bytes", sa.Integer(), nullable=True))
    op.add_column("attachments", sa.Column("category", sa.String(), nullable=True))
    if dialect_name != "sqlite":
        op.create_foreign_key("fk_attachments_patient_id_patients", "attachments", "patients", ["patient_id"], ["id"])
    op.add_column("dicom_studies", sa.Column("file_url", sa.String(), nullable=True))


def downgrade():
    bind = op.get_bind()
    dialect_name = bind.dialect.name

    op.drop_column("dicom_studies", "file_url")
    if dialect_name != "sqlite":
        op.drop_constraint("fk_attachments_patient_id_patients", "attachments", type_="foreignkey")
    op.drop_column("attachments", "category")
    op.drop_column("attachments", "size_bytes")
    op.drop_column("attachments", "content_type")
    op.drop_column("attachments", "patient_id")
