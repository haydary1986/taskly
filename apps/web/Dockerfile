# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:20-alpine AS deps

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace root config files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy all package.json files for workspace resolution
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json

# Install all dependencies
RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2: Build the application
# ============================================
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy installed dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

# Copy and build shared package first
COPY packages/shared/ ./packages/shared/
RUN pnpm --filter @taskly/shared build

# Copy web source
COPY apps/web/ ./apps/web/

# Build Nuxt (produces self-contained .output/ directory)
ARG NUXT_PUBLIC_API_BASE=http://localhost:3000
ENV NUXT_PUBLIC_API_BASE=${NUXT_PUBLIC_API_BASE}

RUN cd apps/web && npx nuxt build

# ============================================
# Stage 3: Production runtime
# ============================================
FROM node:20-alpine AS runner

# Create non-root user
RUN addgroup --system --gid 1001 nuxtjs && \
    adduser --system --uid 1001 nuxtjs

WORKDIR /app

# Nuxt .output is self-contained (Nitro server with bundled deps)
# No node_modules needed in the runner stage
COPY --from=builder /app/apps/web/.output ./.output

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001
ENV NUXT_PUBLIC_API_BASE=http://localhost:3000

USER nuxtjs

EXPOSE 3001

# Nitro server entry point
CMD ["node", ".output/server/index.mjs"]
