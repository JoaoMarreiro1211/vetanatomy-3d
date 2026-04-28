# PowerShell script to build Docker image and run tests inside container
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

Write-Host "Building Docker image for tests..."
docker build --build-arg INSTALL_DEV=true -t vetanatomy-api-test .\apps\api

Write-Host "Running tests inside container..."
docker run --rm vetanatomy-api-test sh -c "python -m pytest -q"

Write-Host "Tests finished."
