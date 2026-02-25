# ============================================
# Stage 1: Build the application
# ============================================
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

# Required for native modules (sharp, @parcel/watcher)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy workspace root config files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy all package.json files for workspace resolution
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy and build shared package first
COPY packages/shared/ ./packages/shared/
RUN pnpm --filter @taskly/shared build

# Copy API source
COPY apps/api/ ./apps/api/

# Payload CMS needs these at build time
ARG PAYLOAD_SECRET=build-time-secret
ARG DATABASE_URL=mongodb://localhost:27017/taskly
ENV PAYLOAD_SECRET=${PAYLOAD_SECRET}
ENV DATABASE_URL=${DATABASE_URL}

# Build Next.js + Payload CMS
RUN cd apps/api && NODE_OPTIONS='--no-deprecation' npx next build

# ============================================
# Stage 2: Production runtime
# ============================================
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@latest --activate

# Required for sharp runtime
RUN apk add --no-cache libc6-compat

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

# Copy workspace config for pnpm resolution
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built shared package
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/src ./packages/shared/src
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json

# Copy API build output and source files
COPY --from=builder /app/apps/api/.next ./apps/api/.next
COPY --from=builder /app/apps/api/public ./apps/api/public
COPY --from=builder /app/apps/api/next.config.mjs ./apps/api/next.config.mjs
COPY --from=builder /app/apps/api/payload.config.ts ./apps/api/payload.config.ts
COPY --from=builder /app/apps/api/src ./apps/api/src
COPY --from=builder /app/apps/api/tsconfig.json ./apps/api/tsconfig.json
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

# Create media directory for uploads (will be mounted as volume)
RUN mkdir -p /app/apps/api/media && chown nextjs:nodejs /app/apps/api/media

ENV NODE_ENV=production
ENV PORT=3000

USER nextjs

EXPOSE 3000

WORKDIR /app/apps/api

# Run the custom server (includes Socket.io) via tsx
CMD ["npx", "tsx", "src/server.ts"]
