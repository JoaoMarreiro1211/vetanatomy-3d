# Deploy em Producao

Este guia deixa o VetAnatomy 3D pronto para subir em producao com tres rotas suportadas:

- Render Blueprint: mais simples para publicar a API e o banco PostgreSQL no plano free.
- Vercel: mais simples para publicar o frontend Next.js.
- VPS com Docker Compose + Caddy: controle total com HTTPS automatico.

## Checklist Obrigatorio

Antes de publicar:

1. Configure dominio para web e API.
2. Gere `SECRET_KEY` forte.
3. Use PostgreSQL persistente.
4. Configure storage persistente para anexos/DICOM (`/app/storage` no Docker).
5. Configure HTTPS.
6. Configure CORS com a URL final do frontend.
7. Configure cookie seguro:
   - `REFRESH_TOKEN_COOKIE_SECURE=True`
   - `REFRESH_TOKEN_COOKIE_SAMESITE=none` quando web e API estiverem em dominios diferentes.
8. Rode migrations: `alembic upgrade head`.
9. Rode smoke tests depois do deploy.

## Variaveis de Ambiente

Backend:

```env
SECRET_KEY=replace-with-a-strong-random-secret
DATABASE_URL=postgresql://user:password@host:5432/vetanatomy
BACKEND_CORS_ORIGINS=["https://app.example.com"]
ACCESS_TOKEN_EXPIRE_MINUTES=480
REFRESH_TOKEN_COOKIE_SECURE=True
REFRESH_TOKEN_COOKIE_SAMESITE=none
REFRESH_TOKEN_EXPIRE_DAYS=30
LOCAL_STORAGE_PATH=/app/storage
```

Frontend:

```env
NEXT_PUBLIC_API_BASE=https://api.example.com/api/v1
```

## Opcao 1: Render para API

Arquivo pronto: `render.yaml` na raiz do repositorio. Ha uma copia de referencia em `infra/render/render.yaml`. Ele usa `runtime: docker`, `dockerContext`, `dockerfilePath` e banco PostgreSQL no plano `free`.

Observacao importante: no plano free do Render, o armazenamento local do container nao deve ser tratado como persistente. Para anexos e DICOM em producao real, use uma opcao persistente como S3/Cloud Storage ou publique em uma infraestrutura com volume persistente.

Passos:

1. Suba o repositorio para GitHub.
2. No Render, crie um Blueprint. O Render deve detectar `render.yaml` na raiz automaticamente.
3. Quando o Render pedir variaveis `sync: false`, preencha:
   - API `BACKEND_CORS_ORIGINS`: `["https://SEU_WEB"]`
4. Depois que a API tiver URL definitiva, use essa URL no frontend:
   - `NEXT_PUBLIC_API_BASE=https://SEU_API_ON_RENDER/api/v1`
5. Se alterar `NEXT_PUBLIC_API_BASE`, faca rebuild/redeploy da Web, porque variavel `NEXT_PUBLIC_*` entra no build do Next.

Healthcheck:

- API: `https://SEU_API/health`

Smoke test:

```bash
curl https://SEU_API/health
```

## Opcao 2: Vercel para Web

Arquivo pronto: `vercel.json` na raiz do repositorio. Ele publica o app `vetanatomy-web` em Next.js.

Passos:

1. Importe o repositorio no Vercel.
2. Configure a variavel:
   - `NEXT_PUBLIC_API_BASE=https://SEU_API_ON_RENDER/api/v1`
3. Faca o deploy.

Healthcheck:

- Web: `https://SEU_WEB/api/health`

Smoke test de API + Web:

```bash
API_URL=https://SEU_API WEB_URL=https://SEU_WEB sh infra/scripts/smoke_test.sh
```

No Windows PowerShell:

```powershell
.\infra\scripts\smoke_test.ps1 -ApiUrl https://SEU_API -WebUrl https://SEU_WEB
```

## Opcao 3: VPS com Docker Compose + Caddy

Requisitos no servidor:

- Docker
- Docker Compose
- DNS apontando:
  - `app.example.com` para o IP da VPS
  - `api.example.com` para o IP da VPS

Crie `.env.production` na raiz baseado em `.env.production.example`:

```env
WEB_DOMAIN=app.example.com
API_DOMAIN=api.example.com
POSTGRES_USER=vetanatomy
POSTGRES_PASSWORD=replace-with-a-strong-db-password
POSTGRES_DB=vetanatomy
SECRET_KEY=replace-with-a-strong-random-secret
ACCESS_TOKEN_EXPIRE_MINUTES=480
```

Suba:

```bash
docker compose --env-file .env.production -f infra/docker/docker-compose.prod.yml up -d --build
```

Verifique:

```bash
docker compose --env-file .env.production -f infra/docker/docker-compose.prod.yml ps
docker compose --env-file .env.production -f infra/docker/docker-compose.prod.yml logs -f api
```

Smoke test:

```bash
curl https://api.example.com/health
curl https://app.example.com/api/health
```

Windows PowerShell:

```powershell
.\infra\scripts\smoke_test.ps1 -ApiUrl https://api.example.com -WebUrl https://app.example.com
```

## Migrations

O container da API executa automaticamente:

```bash
alembic upgrade head
```

antes de iniciar o Uvicorn.

Para rodar manualmente:

```bash
docker compose --env-file .env.production -f infra/docker/docker-compose.prod.yml exec api alembic upgrade head
```

## Seed Inicial

Opcional:

```bash
docker compose --env-file .env.production -f infra/docker/docker-compose.prod.yml exec api python scripts/seed.py
```

Credencial criada pelo seed:

- Email: `admin@vetanatomy.local`
- Senha: `adminpass`

Troque a senha depois do primeiro acesso em uma implementacao real de administracao.

## Backups

Backup PostgreSQL em VPS:

```bash
docker compose --env-file .env.production -f infra/docker/docker-compose.prod.yml exec db pg_dump -U vetanatomy vetanatomy > backup.sql
```

Restore:

```bash
cat backup.sql | docker compose --env-file .env.production -f infra/docker/docker-compose.prod.yml exec -T db psql -U vetanatomy vetanatomy
```

Backup de anexos/DICOM em VPS:

```bash
docker run --rm -v vetanatomy-3d_api-storage:/data -v "$PWD":/backup alpine tar czf /backup/storage-backup.tar.gz -C /data .
```

## Rollback

Em VPS, volte para o commit anterior e rode:

```bash
git checkout <commit-anterior>
docker compose --env-file .env.production -f infra/docker/docker-compose.prod.yml up -d --build
```

Em Render, use a tela de deploys do servico e selecione redeploy de uma versao anterior.

## Problemas Comuns

- Login funciona mas refresh falha: confira `REFRESH_TOKEN_COOKIE_SAMESITE=none`, `REFRESH_TOKEN_COOKIE_SECURE=True` e HTTPS.
- Frontend chama API errada: ajuste `NEXT_PUBLIC_API_BASE` e faca rebuild da Web.
- CORS bloqueado: `BACKEND_CORS_ORIGINS` deve conter exatamente a origem do frontend, com `https://`.
- API sobe antes do banco: no Compose de producao o Postgres tem healthcheck; confira logs do `db`.
