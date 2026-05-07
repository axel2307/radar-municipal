FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ─── Install dependencies ───
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/web/package.json ./packages/web/
COPY packages/core/package.json ./packages/core/
COPY packages/scoring/package.json ./packages/scoring/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ─── Build ───
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/web/node_modules ./packages/web/node_modules
COPY --from=deps /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=deps /app/packages/scoring/node_modules ./packages/scoring/node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm --filter @radar-municipal/web build

# ─── Production image ───
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/packages/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/packages/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/packages/web/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
