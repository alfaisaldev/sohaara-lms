#!/bin/sh
# Runs once on `docker compose up`: ensures the MinIO bucket the API expects
# actually exists. MinIO doesn't auto-create buckets on write, so without this
# the first upload call would 404. Idempotent — `mc mb --ignore-existing` is a
# no-op when the bucket is already there.
set -e

: "${MINIO_ROOT_USER:?MINIO_ROOT_USER is required}"
: "${MINIO_ROOT_PASSWORD:?MINIO_ROOT_PASSWORD is required}"
: "${MINIO_BUCKET:?MINIO_BUCKET is required}"
: "${MINIO_ENDPOINT:?MINIO_ENDPOINT is required}"

# mc needs a scheme; default to http for the in-cluster endpoint unless the
# caller set MINIO_USE_SSL=true.
SCHEME="http"
if [ "${MINIO_USE_SSL:-false}" = "true" ]; then
  SCHEME="https"
fi

echo "[minio-init] configuring mc alias for ${SCHEME}://${MINIO_ENDPOINT}"
mc alias set local "${SCHEME}://${MINIO_ENDPOINT}" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}" >/dev/null

echo "[minio-init] ensuring bucket '${MINIO_BUCKET}' exists"
mc mb --ignore-existing "local/${MINIO_BUCKET}"

echo "[minio-init] done"
