FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy dependencies
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs . .

# Note: .env file will be provided by docker-compose env_file directive
# If needed for build, it should be mounted during build

USER nodejs

EXPOSE 3000 3001

# Health check - TEMPORARILY DISABLED FOR DEBUGGING
# The compose healthcheck disable doesn't affect Dockerfile HEALTHCHECK
# Uncomment after verifying app starts correctly
# HEALTHCHECK --interval=30s --timeout=20s --start-period=90s --retries=3 \
#   CMD node healthcheck.js || exit 1

CMD ["node", "src/index.js"]
