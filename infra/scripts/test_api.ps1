# PowerShell script to build Docker image and run tests inside container
Set-StrictMode -Version Latest
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Write-Host "Building Docker image for tests..."
docker build -t vetanatomy-api-test .\apps\api
Write-Host "Running tests inside container..."
docker run --rm vetanatomy-api-test sh -c "poetry run pytest -q"
Write-Host "Tests finished."
