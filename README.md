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
- **Notifications** — in-app bell + email (Mailpit for local dev)

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
| Mail | Mailpit (local dev) |
| Monorepo | pnpm workspaces |
| Containerization | Docker Compose |

---

## Quick Start (Docker)

The fastest way to run the full stack locally:

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose on Linux)
- Node.js 20+
- pnpm 9+

### 1. Clone

```bash
git clone https://github.com/alfaisaldev/sohaara-lms.git
cd sohaara-lms
```

### 2. Start services

```bash
docker compose up -d --build
```

This brings up eight containers:

| Service | Port | URL |
|---|---|---|
| PostgreSQL | 5432 | `localhost:5432` |
| Redis | 6379 | `localhost:6379` |
| Meilisearch | 7700 | `localhost:7700` |
| MinIO API | 9000 | `localhost:9000` |
| MinIO Console | 9001 | `localhost:9001` |
| Mailpit | 1025 / 8025 | `localhost:8025` |
| **API** | 4000 | http://localhost:4000/api/v1/health |
| **Web App** | 3000 | http://localhost:3000 |
| **Admin Panel** | 3001 | http://localhost:3001 |

### 3. Initialize the database (one-time)

```bash
docker compose exec api sh -c "pnpm db:generate && pnpm db:push && pnpm db:seed"
```

This generates the Prisma client, pushes the schema, and seeds the super admin + roles + feature flags + sample courses.

### 4. Sign in

Default seeded admin credentials (see [`packages/database/src/seed.ts`](packages/database/src/seed.ts) for the exact values):

```
Email:    admin@sohaara.com
Password: Admin@123
```

> Change the seeded admin password immediately for any non-local environment.

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
│   ├── database/     Prisma schema (38 models) + seed
│   ├── notifications/
│   ├── search/       Meilisearch helpers
│   ├── shared/       shared types/utilities
│   ├── storage/      MinIO / S3 helpers
│   ├── types/        cross-package TypeScript types
│   └── ui/           shared design-system components
├── scripts/          operational scripts (seed-courses, etc.)
├── .docker/          Dockerfiles for each app
├── docker-compose.yml
└── package.json
```

---

## Development

### Run everything outside Docker (faster hot-reload)

If you prefer to run Node locally and only Docker the databases:

```bash
docker compose up -d postgres redis meilisearch minio mailpit
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
| `MAIL_HOST` / `MAIL_PORT` | SMTP (Mailpit in dev) |
| `APP_URL` / `ADMIN_URL` / `API_URL` | Public-facing URLs |

---

## Production Notes

The shipped `docker-compose.yml` is for **local development only**. Before deploying:

- Rotate `JWT_SECRET` to a long random value
- Enable CSRF protection
- Set up real mail (S provider), real S3 (not MinIO), real Meilisearch or another search backend
- Set secure values for `MINIO_*` and `MEILISEARCH_KEY`
- Put a reverse proxy (nginx / Caddy / Traefik) in front with TLS
- Configure proper backups for PostgreSQL

---

## License

UNLICENSED — proprietary.
