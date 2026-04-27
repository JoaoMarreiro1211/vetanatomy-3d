param(
  [Parameter(Mandatory = $true)]
  [string]$ApiUrl,

  [Parameter(Mandatory = $true)]
  [string]$WebUrl
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "Checking API health..."
Invoke-RestMethod "$ApiUrl/health" | ConvertTo-Json -Compress

Write-Host "Checking Web health..."
Invoke-RestMethod "$WebUrl/api/health" | ConvertTo-Json -Compress

Write-Host "Checking OpenAPI schema..."
Invoke-WebRequest "$ApiUrl/api/v1/openapi.json" | Out-Null

Write-Host "Smoke test passed."
