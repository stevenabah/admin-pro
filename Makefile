# ============================================
# Makefile for Admin Pro Deployment
# ============================================

.PHONY: help build up down restart logs ps test lint clean db-migrate db-reset backup restore ssl

# Default target
help:
	@echo "Admin Pro Deployment Commands"
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Run development environment (requires local Node.js)"
	@echo "  make dev:docker   - Run development with Docker Compose"
	@echo ""
	@echo "Docker:"
	@echo "  make build        - Build Docker images"
	@echo "  make up           - Start all services"
	@echo "  make down         - Stop all services"
	@echo "  make restart      - Restart all services"
	@echo "  make logs         - Show logs"
	@echo "  make ps           - Show running containers"
	@echo ""
	@echo "Database:"
	@echo "  make db-migrate   - Run database migration"
	@echo "  make db-reset     - Reset database"
	@echo "  make db-seed      - Seed database"
	@echo "  make backup       - Backup database"
	@echo ""
	@echo "Production:"
	@echo "  make deploy       - Deploy to production (Kubernetes)"
	@echo "  make ssl          - Setup SSL certificates"
	@echo ""
	@echo "Quality:"
	@echo "  make lint         - Run linters"
	@echo "  make test         - Run tests"
	@echo "  make clean        - Clean build artifacts"

# Development
dev:
	@echo "Starting development server..."
	cd server && pnpm dev &
	cd client && pnpm dev

dev:docker:
	docker compose -f deploy/docker/docker-compose.yml up -d
	docker compose -f deploy/docker/docker-compose.yml exec backend pnpm dev

# Docker commands
build:
	docker compose -f deploy/docker/docker-compose.yml build --no-cache

up:
	docker compose -f deploy/docker/docker-compose.yml up -d
	@echo "Services started. Application available at http://localhost:8080"

down:
	docker compose -f deploy/docker/docker-compose.yml down

restart: down up

logs:
	docker compose -f deploy/docker/docker-compose.yml logs -f

ps:
	docker compose -f deploy/docker/docker-compose.yml ps

# Database commands
db-migrate:
	docker compose -f deploy/docker/docker-compose.yml exec backend npx prisma db push

db-reset:
	docker compose -f deploy/docker/docker-compose.yml exec backend npx prisma db push --force-reset

db-seed:
	docker compose -f deploy/docker/docker-compose.yml exec backend pnpm db:seed

backup:
	./deploy/scripts/backup.sh backup

restore:
	./deploy/scripts/backup.sh restore $(FILE)

# Kubernetes
deploy:
	./deploy/scripts/migrate.sh deploy

delete:
	./deploy/scripts/migrate.sh delete

status:
	./deploy/scripts/migrate.sh status

klogs:
	./deploy/scripts/migrate.sh logs $(SERVICE)

# SSL
ssl:
	./deploy/scripts/ssl.sh $(CERT_TYPE)

# Quality
lint:
	pnpm --filter client lint || true
	pnpm --filter server lint || true

test:
	pnpm --filter client test
	pnpm --filter server test

clean:
	rm -rf client/dist server/dist
	docker system prune -f
