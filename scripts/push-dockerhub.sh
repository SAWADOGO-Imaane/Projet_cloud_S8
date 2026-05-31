#!/usr/bin/env bash
set -euo pipefail

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

: "${DOCKERHUB_USERNAME:?Définir DOCKERHUB_USERNAME dans l'environnement ou .env}"

IMAGE_TAG="${IMAGE_TAG:-latest}"
export IMAGE_NAMESPACE="${DOCKERHUB_USERNAME}"
export IMAGE_TAG

bash "$(dirname "$0")/build-images.sh"

docker push "${DOCKERHUB_USERNAME}/projet-cloud-backend:${IMAGE_TAG}"
docker push "${DOCKERHUB_USERNAME}/projet-cloud-frontend:${IMAGE_TAG}"
