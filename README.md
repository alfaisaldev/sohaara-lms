# Sohaara LMS

> Enterprise Learning Management System — courses, quizzes, certificates, learning paths, skills tracking, and analytics in a single monorepo.

A self-hosted, production-grade LMS built for organizations that need full control over their training platform. Designed around a provider-based architecture so the same codebase can serve a single tenant today and a multi-tenant SaaS tomorrow.

---

## Highlights

- **Courses** — modules, sections, lessons (video / text / PDF), drag-and-drop curriculum editor, autosave, duplicate, archive, publish workflow
- **Quizzes** — 7 question types, attempt engine with timer, auto-save, auto-grading
- **Assignments** — text / link / file submissions, inline grading with rubrics
- **Certificates** — Figma-style visual builder, templates, logos, public verification page, PDF export
- **Learning Paths** — multi-course journeys with bulk enrollment
- **Skills** — categories, user scoring with progress bars
- **Community** — discussion posts, replies, pinning
- **Blog** — categories, publish workflow
- **Analytics** — org-level and user-level dashboards, exportable reports
- **AI** *(optional)* — question generation, summarization, course recommendations (provider-agnostic; bring your own API key)
- **Search** — full-text cross-entity search powered by Meilisearch
- **Notifications** — in-app bell with per-user preferences

---

## Tech Stack

| Layer | Technology |
|---|---|
| API | NestJS 11, Prisma 6, PostgreSQL 16 |
| Web App | Next.js 16, React 19, Tailwind CSS v4 |
| Admin Panel | Next.js 16, React 19, Tailwind CSS v4 |
| Cache / Queue | Redis 7, BullMQ |
| Search | Meilisearch v1.12 |
| Object Storage | MinIO (S3-compatible) |
| Monorepo | pnpm workspaces |
| Containerization | Docker Compose |

---

## Quick Start (Docker)

The fastest way to run the full stack locally. **One command** brings up the database, applies migrations, seeds the super admin, creates the MinIO bucket, and starts every app.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose on Linux)
- Node.js 20+ and pnpm 9+ — **only required for the local-dev (no-Docker) workflow** below

### 1. Clone

```bash
git clone https://github.com/alfaisaldev/sohaara-lms.git
cd sohaara-lms
```

### 2. Start the stack

```bash
docker compose up -d --build
```

That's it. On first run this:

1. Pulls / builds all images
2. Starts PostgreSQL, Redis, Meilisearch, MinIO (with healthchecks)
3. Runs `sohaara-minio-init` to create the S3 bucket the API expects
4. The `sohaara-api` entrypoint runs `prisma migrate deploy` + seeds the database, then starts the Nest server
5. Starts the API, Web App, and Admin Panel (each with its own healthcheck)

Watch the api's bootstrap step with `docker compose logs -f api`. The whole process takes 2–5 minutes on a clean machine.

### 3. Open the apps

| App | URL |
|---|---|
| Web App (learner) | http://localhost:3000 |
| Admin Panel | http://localhost:3001 |
| API | http://localhost:4000 |
| API docs (Swagger) | http://localhost:4000/api/docs |
| MinIO Console | http://localhost:9001 |
| Meilisearch | http://localhost:7700 |

### 4. Sign in

```
Email:    admin@sohaara.com
Password: Admin123!
```

> Change the seeded admin password immediately for any non-local environment.

### Container map

| Service | Purpose | Restart policy |
|---|---|---|
| `sohaara-postgres` | PostgreSQL 16 | unless-stopped |
| `sohaara-redis` | Redis 7 | unless-stopped |
| `sohaara-meilisearch` | Meilisearch v1.12 | unless-stopped |
| `sohaara-minio` | S3-compatible object store | unless-stopped |
| `sohaara-minio-init` | One-shot: creates the bucket | runs once, exits |
| `sohaara-api` | NestJS API (entrypoint runs migrations + seed, then `exec`s the server) | unless-stopped |
| `sohaara-web` | Next.js learner app (standalone) | unless-stopped |
| `sohaara-admin` | Next.js admin panel (standalone) | unless-stopped |

### Reset everything

To start from a totally clean slate (drops the DB, clears caches, wipes MinIO, etc.):

```bash
docker compose down -v
rm -rf .docker/postgres .docker/redis .docker/meilisearch .docker/minio
docker compose up -d --build
```

---

## Development

### Run everything outside Docker (faster hot-reload)

If you prefer to run Node locally and only Docker the databases:

```bash
docker compose up -d postgres redis meilisearch minio
pnpm install
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm dev          # runs API + Web + Admin concurrently
```

The orchestrator in [`start.js`](start.js) spawns all three apps in parallel with prefixed, color-coded logs and auto-restart on crash.

### Useful scripts

```bash
pnpm dev               # all apps in parallel
pnpm dev:apps          # same, via start.js orchestrator
pnpm build             # production build of every package
pnpm lint              # ESLint across all packages
pnpm typecheck         # tsc --noEmit across all packages
pnpm test              # run tests
pnpm db:generate       # prisma generate
pnpm db:push           # push schema to database
pnpm db:migrate        # run migrations
pnpm db:seed           # seed initial data
pnpm db:studio         # open Prisma Studio
pnpm format            # Prettier write
pnpm docker:up         # docker compose up -d
pnpm docker:down       # docker compose down
```

---

## Project Structure

```
sohaara-lms/
├── apps/
│   ├── api/          NestJS API (22 modules)
│   ├── web/          Next.js learner-facing app
│   └── admin/        Next.js admin panel
├── packages/
│   ├── analytics/    shared analytics helpers
│   ├── auth/         auth utilities (JWT, guards)
│   ├── config/       environment config wrapper
│   ├── database/     Prisma schema (38 models) + seed + migrations
│   ├── notifications/
│   ├── search/       Meilisearch helpers
│   ├── shared/       shared types/utilities
│   ├── storage/      MinIO / S3 helpers
│   ├── types/        cross-package TypeScript types
│   └── ui/           shared design-system components
├── scripts/          operational scripts (seed-courses, etc.)
├── .docker/          Dockerfiles + entrypoint scripts
│   ├── api.Dockerfile / web.Dockerfile / admin.Dockerfile
│   ├── entrypoint.sh  # runs migrations + seed, then exec's the nest server
│   └── minio-init.sh  # creates the bucket (used by the minio/mc init container)
├── docker-compose.yml
└── package.json
```

---

## Environment Variables

The repo ships with `.env.example` at the root and in `apps/api/`. Copy them to `.env` if you need to override the defaults baked into `docker-compose.yml`:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

Key variables (with safe dev defaults already set in `docker-compose.yml`):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `MEILISEARCH_URL` / `MEILISEARCH_KEY` | Search backend |
| `MINIO_*` | Object storage credentials |
| `JWT_SECRET` | **Change for production** |
| `APP_URL` / `ADMIN_URL` / `API_URL` | Public-facing URLs |

---

## Production Notes

The shipped `docker-compose.yml` is for **local development only**. Before deploying:

- Rotate `JWT_SECRET` to a long random value
- Enable CSRF protection
- Set up real mail, real S3 (not MinIO), real Meilisearch or another search backend
- Set secure values for `MINIO_*` and `MEILISEARCH_KEY`
- Put a reverse proxy (nginx / Caddy / Traefik) in front with TLS
- Configure proper backups for PostgreSQL
- Generate a fresh Prisma migration any time you change `schema.prisma` (`pnpm db:migrate` locally) and commit the new file under `packages/database/prisma/migrations/`

---

## License

UNLICENSED — proprietary.
