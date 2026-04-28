#!/usr/bin/env sh
# Build image and run tests inside container (requires docker)
set -e
ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
cd "$ROOT_DIR"

echo "Building Docker image for tests..."
docker build --build-arg INSTALL_DEV=true -t vetanatomy-api-test ./apps/api

echo "Running tests inside container..."
docker run --rm vetanatomy-api-test sh -c "python -m pytest -q"

echo "Tests finished."
