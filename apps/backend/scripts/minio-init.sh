#!/bin/sh

set -eu

MINIO_ALIAS_NAME="${MINIO_ALIAS_NAME:-local}"
MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://minio:9000}"
MINIO_BUCKET_NAME="${MINIO_BUCKET_NAME:-wallpaper}"
MINIO_READY_RETRIES="${MINIO_READY_RETRIES:-90}"

i=1
while [ "$i" -le "$MINIO_READY_RETRIES" ]; do
  if mc alias set "$MINIO_ALIAS_NAME" "$MINIO_ENDPOINT" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null 2>&1; then
    break
  fi

  sleep 1
  i=$((i + 1))
done

mc mb --ignore-existing "${MINIO_ALIAS_NAME}/${MINIO_BUCKET_NAME}"
mc anonymous set download "${MINIO_ALIAS_NAME}/${MINIO_BUCKET_NAME}"
