# VetAnatomy 3D - Architecture

Monorepo divided into apps and packages. Frontend is Next.js, backend is FastAPI. Database: PostgreSQL. Deployment via Docker, Render, or Google Cloud Run.

Components:
- API: FastAPI with modular routers, SQLAlchemy models, Alembic migrations, RBAC dependencies and local attachment storage.
- Web: Next.js with React Three Fiber for 3D and Cornerstone for DICOM/image preview.
- Infra: Docker Compose for local development, production Compose with Caddy, Render Blueprint and service Dockerfiles.

Core flows:
- Authentication with access token and httpOnly refresh cookie.
- Patient registration and clinical record.
- 3D anatomical annotations.
- DICOM study, series, file upload and imaging findings.
- Surgical plan records.
- Superuser-only user administration endpoints.
