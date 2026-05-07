FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ─── Install dependencies ───
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/api/package.json ./packages/api/
COPY packages/core/package.json ./packages/core/
COPY packages/scoring/package.json ./packages/scoring/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ─── Build ───
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules
COPY --from=deps /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=deps /app/packages/scoring/node_modules ./packages/scoring/node_modules
COPY . .

RUN pnpm --filter @radar-municipal/core build && \
    pnpm --filter @radar-municipal/scoring build && \
    pnpm --filter @radar-municipal/api build

# ─── Production image ───
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/packages/api/dist ./dist
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/scoring/dist ./packages/scoring/dist
COPY --from=builder /app/data ./data
COPY --from=builder /app/packages/api/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001
ENV API_PORT=3001

CMD ["node", "dist/index.js"]
