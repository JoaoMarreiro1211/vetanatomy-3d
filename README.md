# VetAnatomy 3D

Veterinary diagnosis and hospital management platform with 3D anatomy, DICOM viewer, and multispecies digital clinical records.

Plataforma web para gestao hospitalar veterinaria com prontuario digital, anotacoes anatomicas em 3D, base para imagem DICOM, planejamento cirurgico e dashboard operacional.

## Stack

- Monorepo com Turbo e pnpm
- Frontend: Next.js 14, TypeScript, Tailwind CSS, React Query, Zustand
- 3D: React Three Fiber, Three.js e Drei
- DICOM: Cornerstone com upload local persistente
- Backend: FastAPI, SQLAlchemy, Alembic, RBAC e PostgreSQL
- Infra: Docker Compose para banco, API e web

## Rodar Localmente

### Opcao 1: Docker

```bash
cd "c:\temp\projects\projeto computacao grafica\vetanatomy-3d"
docker compose -f infra/docker/docker-compose.yml up --build
```

Servicos:

- Web: `http://localhost:3000`
- API: `http://localhost:8000`
- OpenAPI: `http://localhost:8000/api/v1/openapi.json`

### Opcao 2: Desenvolvimento manual

```bash
pnpm install
pnpm dev
```

Para a API:

```bash
cd apps/api
poetry install
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

## Variaveis de Ambiente

Copie `.env.example` para `.env` e ajuste se necessario. O frontend usa `NEXT_PUBLIC_API_BASE=http://localhost:8000/api/v1` por padrao.

## Testes

```bash
cd apps/api
pytest -q
```

## Producao

O guia completo de deploy esta em `docs/DEPLOYMENT.md`.

Opcoes prontas:

- Render Blueprint: `render.yaml`
- VPS com Docker Compose + Caddy: `infra/docker/docker-compose.prod.yml`

Smoke test depois do deploy:

```bash
API_URL=https://api.example.com WEB_URL=https://app.example.com sh infra/scripts/smoke_test.sh
```

## Fluxo Principal

1. Criar conta ou entrar.
2. Abrir o dashboard.
3. Cadastrar um paciente.
4. Abrir o prontuario.
5. Clicar no modelo 3D para escolher um ponto anatomico.
6. Registrar tipo, severidade e notas.
7. Subir imagem DICOM ou imagem diagnostica.
8. Consultar historico, imagem e planejamento cirurgico no prontuario.

## Funcionalidades

A lista completa de recursos para apresentacao esta em `docs/FUNCIONALIDADES.md`.
