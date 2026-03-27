# ============================================
# Backend Dockerfile
# ============================================

FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY server/package.json server/pnpm-lock.yaml* ./

# Install dependencies
RUN npm install -g pnpm@8 && \
    pnpm install --frozen-lockfile --prod && \
    pnpm install --frozen-lockfile

# Copy Prisma schema and seed
COPY server/prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY server/ ./src/
COPY server/tsconfig.json ./

# Build TypeScript
RUN pnpm run build

# Create uploads directory
RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-raster -qO- http://localhost:3000/api/health || exit 1

# Start application
CMD ["pnpm", "run", "start"]
