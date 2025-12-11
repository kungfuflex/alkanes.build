# Alkanes Documentation & Governance Platform
# Multi-stage build for Cloud Run deployment

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy package files and prisma schema (needed for postinstall)
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma/

# Copy ts-sdk (local dependency)
COPY ts-sdk ./ts-sdk/

# Install dependencies
RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN pnpm db:generate

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN pnpm build

# Prepare prisma packages for production (resolve symlinks and create proper structure)
RUN mkdir -p /app/prisma-pkg/node_modules/@prisma && \
    cp -rL node_modules/prisma /app/prisma-pkg/node_modules/prisma && \
    cp -rL node_modules/.pnpm/@prisma+engines@*/node_modules/@prisma/engines /app/prisma-pkg/node_modules/@prisma/engines && \
    cp -rL node_modules/.pnpm/@prisma+debug@*/node_modules/@prisma/debug /app/prisma-pkg/node_modules/@prisma/debug && \
    cp -rL node_modules/.pnpm/@prisma+engines-version@*/node_modules/@prisma/engines-version /app/prisma-pkg/node_modules/@prisma/engines-version && \
    cp -rL node_modules/.pnpm/@prisma+fetch-engine@*/node_modules/@prisma/fetch-engine /app/prisma-pkg/node_modules/@prisma/fetch-engine && \
    cp -rL node_modules/.pnpm/@prisma+get-platform@*/node_modules/@prisma/get-platform /app/prisma-pkg/node_modules/@prisma/get-platform && \
    cp -rL node_modules/@prisma/client /app/prisma-pkg/node_modules/@prisma/client || true

# ============================================
# Stage 3: Runner
# ============================================
FROM node:20-alpine3.18 AS runner
WORKDIR /app

# Alpine 3.18 has OpenSSL 1.1 which Prisma needs
RUN apk add --no-cache openssl

# Install pnpm for running commands
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma for migrations (from prepared directory with resolved symlinks)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma-pkg/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma-pkg/node_modules/prisma ./node_modules/prisma

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
