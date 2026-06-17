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