FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/admin/package.json ./apps/admin/
COPY packages/ui/package.json ./packages/ui/
COPY packages/shared/package.json ./packages/shared/
COPY packages/types/package.json ./packages/types/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
WORKDIR /app
COPY . .
# See web.Dockerfile — `NEXT_PUBLIC_API_URL` is the browser-reachable
# origin (inlined into the client bundle + CSP), `API_INTERNAL_URL` is
# the server-side docker service name used by next.config.ts rewrites.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_APP_URL=http://localhost:3001
ARG API_INTERNAL_URL=http://api:4000
# Keycloak env vars are read by `apps/admin/src/lib/oidc.ts` at build
# time and inlined into the admin client bundle. Same defaults as the
# web app but with `sohaara-admin` as the client_id (separate OIDC
# client in the realm — separate redirect URIs, separate post-logout
# landing).
ARG NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080
ARG NEXT_PUBLIC_KEYCLOAK_REALM=sohaara
ARG NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=sohaara-admin
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV API_INTERNAL_URL=$API_INTERNAL_URL
ENV NEXT_PUBLIC_KEYCLOAK_URL=$NEXT_PUBLIC_KEYCLOAK_URL
ENV NEXT_PUBLIC_KEYCLOAK_REALM=$NEXT_PUBLIC_KEYCLOAK_REALM
ENV NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=$NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
RUN pnpm --filter @sohaara/admin run build

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
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./
# Static chunks must live at apps/admin/.next/static relative to the cwd where
# the standalone server runs, otherwise asset URLs 404 and the client never
# hydrates past its loading shell.
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/public ./apps/admin/public
USER nextjs
EXPOSE 3000
CMD ["node", "apps/admin/server.js"]