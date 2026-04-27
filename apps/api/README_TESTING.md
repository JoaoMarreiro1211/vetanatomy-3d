Running tests

Two options to run the backend test suite:

1) Locally with Python/Poetry

- Create and activate a virtualenv (optional) and install dependencies:

```
cd apps/api
python -m venv .venv
.\.venv\Scripts\activate   # Windows PowerShell
pip install --upgrade pip
pip install poetry
poetry install
```

- Run tests:

```
poetry run pytest -q
```

2) Using Docker (no local Python/Poetry required)

- Build image and run tests (Linux/macOS):

```
sh infra/scripts/test_api.sh
```

- Or on Windows PowerShell:

```
.\infra\scripts\test_api.ps1
```

Notes

- The project CI already runs tests via GitHub Actions on push/PR to `main`.
- If you prefer to run tests against Postgres (CI-style), start a local Postgres and set `DATABASE_URL`/env appropriately before running tests.
