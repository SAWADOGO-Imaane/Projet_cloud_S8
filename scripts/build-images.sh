#!/usr/bin/env bash
set -euo pipefail

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

IMAGE_NAMESPACE="${IMAGE_NAMESPACE:-${DOCKERHUB_USERNAME:-projet-cloud-local}}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
VITE_API_URL="${VITE_API_URL:-/api}"
VITE_GOOGLE_CLIENT_ID="${VITE_GOOGLE_CLIENT_ID:-}"

docker build \
  -t "${IMAGE_NAMESPACE}/projet-cloud-backend:${IMAGE_TAG}" \
  backend

docker build \
  --build-arg "VITE_API_URL=${VITE_API_URL}" \
  --build-arg "VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}" \
  -t "${IMAGE_NAMESPACE}/projet-cloud-frontend:${IMAGE_TAG}" \
  frontend

echo "Images construites :"
echo "- ${IMAGE_NAMESPACE}/projet-cloud-backend:${IMAGE_TAG}"
echo "- ${IMAGE_NAMESPACE}/projet-cloud-frontend:${IMAGE_TAG}"
