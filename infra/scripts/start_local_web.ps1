Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repo = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$webDir = Join-Path $repo "apps\web"
$nodeDir = Get-ChildItem (Join-Path $repo ".tools") -Directory -Filter "node-v20*-win-x64" | Select-Object -First 1 -ExpandProperty FullName

$env:PATH = "$nodeDir;$nodeDir\node_modules\npm\bin;$env:PATH"
$env:NEXT_PUBLIC_API_BASE = "http://localhost:8000/api/v1"

Set-Location $webDir
& "$nodeDir\pnpm.cmd" dev --hostname 127.0.0.1 --port 3000
