#!/usr/bin/env sh
set -eu

API_URL="${API_URL:?Set API_URL, e.g. https://api.example.com}"
WEB_URL="${WEB_URL:?Set WEB_URL, e.g. https://app.example.com}"

echo "Checking API health..."
curl -fsS "$API_URL/health"
echo

echo "Checking Web health..."
curl -fsS "$WEB_URL/api/health"
echo

echo "Checking OpenAPI schema..."
curl -fsS "$API_URL/api/v1/openapi.json" >/dev/null

echo "Smoke test passed."
