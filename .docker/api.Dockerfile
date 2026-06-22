FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/auth/package.json ./packages/auth/
COPY packages/shared/package.json ./packages/shared/
COPY packages/types/package.json ./packages/types/
COPY packages/notifications/package.json ./packages/notifications/
COPY packages/storage/package.json ./packages/storage/
COPY packages/search/package.json ./packages/search/
COPY packages/analytics/package.json ./packages/analytics/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
WORKDIR /app
COPY . .
RUN pnpm --filter @sohaara/database run generate
# Build the @sohaara/storage package first — its package.json `main` points
# at `dist/index.js`, so the api's compiled JS (which does
# `require('@sohaara/storage')`) needs that file to exist at runtime. The api
# build also recompiles the package source into apps/api/dist/ for its own
# internal use, but Node follows the pnpm symlink to packages/storage/ at
# runtime, so the package's own dist is what gets loaded.
RUN pnpm --filter @sohaara/storage run build
RUN pnpm --filter @sohaara/api run build

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs
# wget is used by the api container's healthcheck. postgresql-client provides
# `pg_isready` which the entrypoint uses as a fast, battle-tested probe for
# whether Postgres is accepting connections (faster than spawning a node
# child process per attempt).
RUN apk add --no-cache wget postgresql-client
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/packages ./packages
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
# Bake the entrypoint script in. It runs migrations + seed (idempotent) and
# then `exec`s the actual nest server, so it becomes PID 1 and gets signals.
COPY --from=builder /app/.docker/entrypoint.sh /app/.docker/entrypoint.sh
RUN chmod +x /app/.docker/entrypoint.sh
USER nestjs
EXPOSE 4000
CMD ["/app/.docker/entrypoint.sh"]
