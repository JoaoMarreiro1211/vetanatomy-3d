Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repo = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$apiDir = Join-Path $repo "apps\api"
$python = Resolve-Path (Join-Path $repo "..\.venv\Scripts\python.exe")

$env:SQLALCHEMY_DATABASE_URI = "sqlite:///./dev.db"
$env:LOCAL_STORAGE_PATH = "./storage"

Set-Location $apiDir
& $python -m alembic upgrade head
& $python -m scripts.seed
& $python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
