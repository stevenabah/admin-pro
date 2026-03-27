#!/bin/bash
# ============================================
# Deployment Script for Docker Compose
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
COMPOSE_FILE="deploy/docker/docker-compose.yml"
ENV_FILE="deploy/docker/.env.production"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    log_warn "Environment file not found. Creating from example..."
    cp "$ENV_FILE.example" "$ENV_FILE"
    log_warn "Please edit $ENV_FILE with your configuration"
fi

# Load environment variables
export $(grep -v '^#' "$ENV_FILE" | xargs)

# Build and deploy
log_info "Building and deploying Admin Pro..."

# Pull latest images
docker compose -f "$COMPOSE_FILE" pull

# Build custom images
docker compose -f "$COMPOSE_FILE" build --no-cache

# Stop existing containers
log_info "Stopping existing containers..."
docker compose -f "$COMPOSE_FILE" down

# Start services
log_info "Starting services..."
docker compose -f "$COMPOSE_FILE" up -d

# Wait for services to be healthy
log_info "Waiting for services to be healthy..."
sleep 10

# Check service status
docker compose -f "$COMPOSE_FILE" ps

# Run database migration
log_info "Running database migration..."
docker compose -f "$COMPOSE_FILE" exec -T backend npx prisma db push

log_info "Deployment complete!"
log_info "Application should be available at http://localhost:8080"
