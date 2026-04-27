"""initial

Revision ID: 0001_initial
Revises: 
Create Date: 2026-04-27
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # roles
    op.create_table(
        'roles',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name', sa.String, nullable=False, unique=True),
    )

    # users
    op.create_table(
        'users',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('email', sa.String, nullable=False, unique=True, index=True),
        sa.Column('full_name', sa.String, nullable=True),
        sa.Column('hashed_password', sa.String, nullable=False),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('is_superuser', sa.Boolean, default=False),
        sa.Column('role_id', sa.Integer, sa.ForeignKey('roles.id')),
    )

    # species, breeds, tutors, patients
    op.create_table('species', sa.Column('id', sa.Integer, primary_key=True), sa.Column('name', sa.String, nullable=False, unique=True))
    op.create_table('breeds', sa.Column('id', sa.Integer, primary_key=True), sa.Column('name', sa.String, nullable=False), sa.Column('species_id', sa.Integer, sa.ForeignKey('species.id')))
    op.create_table('tutors', sa.Column('id', sa.Integer, primary_key=True), sa.Column('name', sa.String, nullable=False), sa.Column('phone', sa.String), sa.Column('email', sa.String))
    op.create_table('patients',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name', sa.String, nullable=False),
        sa.Column('species_id', sa.Integer, sa.ForeignKey('species.id')),
        sa.Column('breed_id', sa.Integer, sa.ForeignKey('breeds.id')),
        sa.Column('sex', sa.String),
        sa.Column('weight', sa.Float),
        sa.Column('birth_date', sa.Date),
        sa.Column('record_number', sa.String, unique=True),
        sa.Column('owner_id', sa.Integer, sa.ForeignKey('tutors.id')),
    )

    # annotations, dicom, series, findings, surgical plans
    op.create_table('anatomical_annotations',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('patient_id', sa.Integer, sa.ForeignKey('patients.id'), nullable=False),
        sa.Column('geometry', sa.JSON, nullable=False),
        sa.Column('annotation_type', sa.String, nullable=False),
        sa.Column('severity', sa.String),
        sa.Column('notes', sa.String),
        sa.Column('created_at', sa.DateTime),
        sa.Column('created_by', sa.Integer, sa.ForeignKey('users.id')),
    )

    op.create_table('dicom_studies', sa.Column('id', sa.Integer, primary_key=True), sa.Column('patient_id', sa.Integer, sa.ForeignKey('patients.id')), sa.Column('study_uid', sa.String, nullable=False, unique=True), sa.Column('description', sa.String), sa.Column('modality', sa.String), sa.Column('date', sa.DateTime))
    op.create_table('dicom_series', sa.Column('id', sa.Integer, primary_key=True), sa.Column('study_id', sa.Integer, sa.ForeignKey('dicom_studies.id')), sa.Column('series_uid', sa.String, nullable=False, unique=True), sa.Column('description', sa.String))
    op.create_table('imaging_findings', sa.Column('id', sa.Integer, primary_key=True), sa.Column('series_id', sa.Integer, sa.ForeignKey('dicom_series.id')), sa.Column('annotation_id', sa.Integer, sa.ForeignKey('anatomical_annotations.id')), sa.Column('findings', sa.JSON), sa.Column('created_at', sa.DateTime))

    op.create_table('surgical_plans', sa.Column('id', sa.Integer, primary_key=True), sa.Column('patient_id', sa.Integer, sa.ForeignKey('patients.id')), sa.Column('structure', sa.String), sa.Column('plan', sa.JSON), sa.Column('created_at', sa.DateTime), sa.Column('created_by', sa.Integer, sa.ForeignKey('users.id')))

    op.create_table('hospital_rooms', sa.Column('id', sa.Integer, primary_key=True), sa.Column('name', sa.String, nullable=False), sa.Column('is_icu', sa.Boolean, default=False), sa.Column('capacity', sa.Integer, default=1))
    op.create_table('admissions', sa.Column('id', sa.Integer, primary_key=True), sa.Column('patient_id', sa.Integer, sa.ForeignKey('patients.id')), sa.Column('room_id', sa.Integer, sa.ForeignKey('hospital_rooms.id')), sa.Column('admitted_at', sa.DateTime), sa.Column('discharged_at', sa.DateTime), sa.Column('status', sa.String))

    op.create_table('attachments', sa.Column('id', sa.Integer, primary_key=True), sa.Column('filename', sa.String, nullable=False), sa.Column('url', sa.String, nullable=False), sa.Column('uploaded_at', sa.DateTime), sa.Column('uploaded_by', sa.Integer, sa.ForeignKey('users.id')))

    op.create_table('audit_logs', sa.Column('id', sa.Integer, primary_key=True), sa.Column('action', sa.String, nullable=False), sa.Column('detail', sa.JSON), sa.Column('performed_by', sa.Integer, sa.ForeignKey('users.id')), sa.Column('created_at', sa.DateTime))


def downgrade():
    op.drop_table('audit_logs')
    op.drop_table('attachments')
    op.drop_table('admissions')
    op.drop_table('hospital_rooms')
    op.drop_table('surgical_plans')
    op.drop_table('imaging_findings')
    op.drop_table('dicom_series')
    op.drop_table('dicom_studies')
    op.drop_table('anatomical_annotations')
    op.drop_table('patients')
    op.drop_table('tutors')
    op.drop_table('breeds')
    op.drop_table('species')
    op.drop_table('users')
    op.drop_table('roles')
