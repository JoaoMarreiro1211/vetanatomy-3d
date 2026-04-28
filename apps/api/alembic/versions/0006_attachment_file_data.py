"""attachment file data

Revision ID: 0006_attachment_file_data
Revises: 0005_multispecies_domain
Create Date: 2026-04-28
"""

from alembic import op
import sqlalchemy as sa

revision = "0006_attachment_file_data"
down_revision = "0005_multispecies_domain"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("attachments", sa.Column("file_data", sa.LargeBinary(), nullable=True))


def downgrade():
    op.drop_column("attachments", "file_data")
