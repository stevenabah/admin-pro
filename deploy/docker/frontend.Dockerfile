# ============================================
# Frontend Dockerfile - Multi-stage Build
# ============================================

# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY client/package.json client/pnpm-lock.yaml* ./

# Install dependencies
RUN npm install -g pnpm@8 && \
    pnpm install --frozen-lockfile

# Copy source code
COPY client/ ./

# Build application
RUN pnpm run build

# Stage 2: Production stage with Nginx
FROM nginx:alpine AS production

# Install nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY deploy/docker/nginx/frontend.conf /etc/nginx/conf.d/

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-raster -qO- http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
