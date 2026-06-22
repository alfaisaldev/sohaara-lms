FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/web/package.json ./apps/web/
COPY packages/ui/package.json ./packages/ui/
COPY packages/shared/package.json ./packages/shared/
COPY packages/types/package.json ./packages/types/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
WORKDIR /app
COPY . .
# Two api URLs are passed in as build args and consumed by `next.config.ts`:
#
#   - `NEXT_PUBLIC_API_URL` is inlined into the client bundle and used by
#     `lib/api.ts` for fetch URLs and by `middleware.ts` for CSP
#     img/media/frame/connect-src entries. It must be the *browser-
#     reachable* origin (`http://localhost:4000` via the host port-
#     forward) because the browser has no access to the docker service
#     name `api`.
#
#   - `API_INTERNAL_URL` is NOT a NEXT_PUBLIC_ var — it's server-only
#     and is used by `next.config.ts` rewrites so the Next.js server,
#     which runs inside the docker network, can reach the api by its
#     docker service name (`http://api:4000`). Without this split the
#     rewrites would either fail (using `localhost:4000` from inside the
#     container, where no api is listening) or be silently broken in the
#     browser (using `http://api:4000`, which doesn't resolve outside the
#     docker network).
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG API_INTERNAL_URL=http://api:4000
# Keycloak env vars are read by `apps/web/src/lib/oidc.ts` at build
# time and inlined into the client bundle. They MUST be NEXT_PUBLIC_*
# (no server-only shadow) because the OIDC client runs in the browser.
# Defaults match the emulator (Keycloak on localhost:8080, realm
# `sohaara`, client `sohaara-web`); override at compose/build time for
# other environments.
ARG NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080
ARG NEXT_PUBLIC_KEYCLOAK_REALM=sohaara
ARG NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=sohaara-web
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV API_INTERNAL_URL=$API_INTERNAL_URL
ENV NEXT_PUBLIC_KEYCLOAK_URL=$NEXT_PUBLIC_KEYCLOAK_URL
ENV NEXT_PUBLIC_KEYCLOAK_REALM=$NEXT_PUBLIC_KEYCLOAK_REALM
ENV NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=$NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
RUN pnpm --filter @sohaara/web run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
# wget is used by the container's healthcheck.
RUN apk add --no-cache wget
# Standalone server bundle (server.js + minimal .next + bundled node_modules).
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
# Static chunks must live at apps/web/.next/static relative to the cwd where
# the standalone server runs, otherwise asset URLs 404 and the client never
# hydrates past its loading shell.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
