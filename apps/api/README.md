# VetAnatomy API

Backend FastAPI do VetAnatomy 3D.

## Rodar Localmente

```bash
poetry install
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

## Testes

```bash
pytest -q
```

## Autenticacao

O login retorna `access_token` no corpo da resposta e grava o refresh token em cookie httpOnly chamado `refresh_token`.

Em producao, configure:

- `REFRESH_TOKEN_COOKIE_SECURE=True`
- `BACKEND_CORS_ORIGINS` com a origem real do frontend
- `SECRET_KEY` com um valor forte
