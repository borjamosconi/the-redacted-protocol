# Multi-stage build for the RDX bonding-curve backend.
FROM node:20-alpine AS base
WORKDIR /app

# ── deps ───────────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json* yarn.lock* ./
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    else npm install; fi

# ── build ──────────────────────────────────────────────────────────────────
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx tsc -p tsconfig.json || true

# ── runtime ────────────────────────────────────────────────────────────────
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 5000
CMD ["npx", "tsx", "server.ts"]
