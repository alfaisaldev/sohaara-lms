# Changelog

All notable changes to the Sohaara LMS, on a per-branch basis. Dates use the
user's local calendar.

## test/2026-06-20-sohaara-lms-aws-integration-testing — "Run LMS in Docker against the AWS emulator"

### Added
- **LMS docker-compose now targets the emulator.** The compose no longer
  ships its own Postgres / Redis / MinIO / Meilisearch — those live in
  [`../aws-emulator/`](../aws-emulator/). The three LMS containers
  (`sohaara-api`, `sohaara-web`, `sohaara-admin`) join the emulator's
  external `emu-net` Docker network and reach every data service by
  container name (`emu-postgres`, `emu-redis`, `emu-meilisearch`,
  `emu-minio`, `emu-keycloak`, `emu-mailhog`).

### Changed
- **`docker-compose.yml`** — fully rewritten. Dropped 5 redundant
  service blocks (postgres, redis, meilisearch, minio, minio-init);
  added `emu-net` as an external network; pointed every env var at the
  emulator; web/admin `NEXT_PUBLIC_API_URL` now `http://api:4000` (the
  api's container name on emu-net, not localhost).
- **`.docker/entrypoint.sh`** — `pg_isready` and the Prisma / seed
  `DATABASE_URL` now read `POSTGRES_HOST` / `POSTGRES_PORT` /
  `POSTGRES_USER` / `POSTGRES_DB` from env (with the same defaults as
  before). Lets the same image run against the emulator
  (`emu-postgres:5432`) or a standalone Postgres (`postgres:5432`).
- **`README.md`** — Quick Start now describes a two-step flow: bring up
  the emulator, then `docker compose up -d --build` here. Container map
  trimmed to the three LMS apps. The older "Run everything outside
  Docker" section still exists and now also points at the emulator.

### Verified end-to-end

| Check | Result |
|---|---|
| `docker compose ps` | 3 LMS containers, all `Up` / `healthy` |
| `curl http://localhost:4000/api/v1/health` | `{"status":"healthy","database":"connected",...}` |
| `pg_isready -h emu-postgres` from inside `sohaara-api` | `accepting connections` |
| `redis-cli PING` via `emu-redis:6379` from `sohaara-api` | `PONG` |
| Web → `http://api:4000/api/v1/health` from inside `sohaara-web` | healthy JSON |
| Admin → `http://api:4000/api/v1/health` from inside `sohaara-admin` | healthy JSON |
| `curl http://localhost:3000/` | HTTP 200 |
| `curl http://localhost:3001/` | HTTP 307 (→ /admin/login, expected) |

The api's entrypoint successfully runs `prisma migrate deploy` against
`emu-postgres:5432` on first boot (the existing 3 migrations were
baselined via `prisma migrate resolve --applied` because the schema
was already created by an earlier `db push` against the same DB).

### GitHub
- Branch: [`test/2026-06-20-sohaara-lms-aws-integration-testing`](https://github.com/alfaisaldev/sohaara-lms/tree/test/2026-06-20-sohaara-lms-aws-integration-testing)
- Tag: `v1.0.0-aws-emulator-integration`
- `master` was **not** touched — this lives on a testing branch per the
  "don't touch master, create testing branch" rule.