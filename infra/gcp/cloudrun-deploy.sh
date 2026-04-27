#!/bin/bash
set -e

# Usage: ./cloudrun-deploy.sh <service-name> <image>
SERVICE_NAME="$1"
IMAGE="$2"
PROJECT="$GCP_PROJECT"
REGION="us-central1"

if [ -z "$SERVICE_NAME" ] || [ -z "$IMAGE" ]; then
  echo "Usage: $0 <service-name> <image>"
  exit 1
fi

gcloud run deploy "$SERVICE_NAME" --image "$IMAGE" --platform managed --region "$REGION" --project "$PROJECT" --allow-unauthenticated
