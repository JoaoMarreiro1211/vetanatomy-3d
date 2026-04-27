#!/usr/bin/env sh
# Build image and run tests inside container (requires docker)
set -e
ROOT_DIR=$(dirname $(dirname "$0"))/..
echo "Building Docker image for tests..."
docker build -t vetanatomy-api-test ./apps/api
echo "Running tests inside container..."
docker run --rm vetanatomy-api-test sh -c "poetry run pytest -q"
echo "Tests finished."
