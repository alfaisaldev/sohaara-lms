#!/bin/sh
# Api container entrypoint: applies pending Prisma migrations, then seeds
# the database (both idempotent), then `exec`s the nest server so it inherits
# PID 1 and receives container signals. On restarts the migration is a no-op
# when nothing is pending and the seed only inserts what's missing.
#
# Waits for Postgres to accept TCP connections before running migrations.
# `pg_isready` is much faster than spawning a node child process per attempt
# and avoids the scenario where the api's own healthcheck passes before the
# database is actually reachable.
set -e

echo "[entrypoint] waiting for postgres"
i=0
while [ "$i" -lt 60 ]; do
  i=$((i + 1))
  if pg_isready -h "${POSTGRES_HOST:-postgres}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-sohaara}" -d "${POSTGRES_DB:-sohaara_lms}" -q; then
    echo "  ready after ${i} attempt(s)"
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "  gave up after 60 attempts"
    exit 1
  fi
  sleep 1
done

cd /app/packages/database

echo "[entrypoint] prisma migrate deploy"
DATABASE_URL="${DATABASE_URL:-postgresql://sohaara:sohaara_dev_password@${POSTGRES_HOST:-postgres}:${POSTGRES_PORT:-5432}/${POSTGRES_DB:-sohaara_lms}?schema=public}" \
  /app/node_modules/.bin/prisma migrate deploy

echo "[entrypoint] seed"
DATABASE_URL="${DATABASE_URL:-postgresql://sohaara:sohaara_dev_password@${POSTGRES_HOST:-postgres}:${POSTGRES_PORT:-5432}/${POSTGRES_DB:-sohaara_lms}?schema=public}" \
  /app/node_modules/.bin/tsx src/seed.ts

echo "[entrypoint] starting api"
cd /app
exec node apps/api/dist/apps/api/src/main
