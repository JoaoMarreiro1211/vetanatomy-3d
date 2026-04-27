"""multispecies domain

Revision ID: 0005_multispecies_domain
Revises: 0004_storage_and_dicom_files
Create Date: 2026-04-27
"""

import sqlalchemy as sa
from alembic import op

revision = "0005_multispecies_domain"
down_revision = "0004_storage_and_dicom_files"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    dialect_name = bind.dialect.name

    op.create_table(
        "species_groups",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("workflow_profile", sa.JSON(), nullable=True),
        sa.Column("clinical_defaults", sa.JSON(), nullable=True),
        sa.Column("imaging_compatibility", sa.JSON(), nullable=True),
    )
    op.create_index("ix_species_groups_id", "species_groups", ["id"])
    op.create_index("ix_species_groups_code", "species_groups", ["code"], unique=True)

    op.add_column("species", sa.Column("common_name", sa.String(), nullable=True))
    op.add_column("species", sa.Column("scientific_name", sa.String(), nullable=True))
    op.add_column("species", sa.Column("group_id", sa.Integer(), nullable=True))
    op.add_column("species", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("species", sa.Column("profile_extensions", sa.JSON(), nullable=True))
    op.add_column("species", sa.Column("clinical_form_schema", sa.JSON(), nullable=True))
    op.create_index("ix_species_group_id", "species", ["group_id"])
    if dialect_name != "sqlite":
        op.create_foreign_key("fk_species_group_id", "species", "species_groups", ["group_id"], ["id"])

    op.create_table(
        "anatomical_model_templates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("species_id", sa.Integer(), nullable=True),
        sa.Column("species_group_id", sa.Integer(), nullable=True),
        sa.Column("asset_url", sa.String(), nullable=True),
        sa.Column("preview_url", sa.String(), nullable=True),
        sa.Column("fallback_shape", sa.String(), nullable=False, server_default="quadruped"),
        sa.Column("regions_map", sa.JSON(), nullable=True),
        sa.Column("defaults", sa.JSON(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.ForeignKeyConstraint(["species_id"], ["species.id"]),
        sa.ForeignKeyConstraint(["species_group_id"], ["species_groups.id"]),
    )
    op.create_index("ix_anatomical_model_templates_id", "anatomical_model_templates", ["id"])
    op.create_index("ix_anatomical_model_templates_code", "anatomical_model_templates", ["code"], unique=True)
    op.create_index("ix_anatomical_model_templates_species_id", "anatomical_model_templates", ["species_id"])
    op.create_index("ix_anatomical_model_templates_species_group_id", "anatomical_model_templates", ["species_group_id"])

    op.create_table(
        "anatomical_regions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("template_id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("parent_code", sa.String(), nullable=True),
        sa.Column("region_type", sa.String(), nullable=False, server_default="surface"),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(["template_id"], ["anatomical_model_templates.id"]),
    )
    op.create_index("ix_anatomical_regions_id", "anatomical_regions", ["id"])
    op.create_index("ix_anatomical_regions_template_id", "anatomical_regions", ["template_id"])
    op.create_index("ix_anatomical_regions_code", "anatomical_regions", ["code"])


def downgrade():
    bind = op.get_bind()
    dialect_name = bind.dialect.name

    op.drop_index("ix_anatomical_regions_code", table_name="anatomical_regions")
    op.drop_index("ix_anatomical_regions_template_id", table_name="anatomical_regions")
    op.drop_index("ix_anatomical_regions_id", table_name="anatomical_regions")
    op.drop_table("anatomical_regions")
    op.drop_index("ix_anatomical_model_templates_species_group_id", table_name="anatomical_model_templates")
    op.drop_index("ix_anatomical_model_templates_species_id", table_name="anatomical_model_templates")
    op.drop_index("ix_anatomical_model_templates_code", table_name="anatomical_model_templates")
    op.drop_index("ix_anatomical_model_templates_id", table_name="anatomical_model_templates")
    op.drop_table("anatomical_model_templates")
    if dialect_name != "sqlite":
        op.drop_constraint("fk_species_group_id", "species", type_="foreignkey")
    op.drop_index("ix_species_group_id", table_name="species")
    op.drop_column("species", "clinical_form_schema")
    op.drop_column("species", "profile_extensions")
    op.drop_column("species", "is_active")
    op.drop_column("species", "group_id")
    op.drop_column("species", "scientific_name")
    op.drop_column("species", "common_name")
    op.drop_index("ix_species_groups_code", table_name="species_groups")
    op.drop_index("ix_species_groups_id", table_name="species_groups")
    op.drop_table("species_groups")
