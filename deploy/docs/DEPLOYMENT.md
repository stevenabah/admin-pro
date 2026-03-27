# ============================================

# Deployment Guide

# ============================================

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Docker Compose Deployment](#docker-compose-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Post-Deployment](#post-deployment)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

### For All Deployments

- Git
- Bash shell
- OpenSSL (for SSL certificates)

### For Docker Compose

- Docker Engine 20.10+
- Docker Compose v2+

### For Kubernetes

- kubectl 1.28+
- Kubernetes cluster 1.28+
- Helm 3.12+

## Environment Setup

### 1. Clone and Configure

```bash
# Clone repository
git clone https://github.com/your-org/admin-pro.git
cd admin-pro

# Create production environment file
cp deploy/docker/.env.production.example deploy/docker/.env.production

# Edit environment variables
vim deploy/docker/.env.production
```

### 2. Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://admin_pro:YOUR_PASSWORD@postgres:5432/admin_pro

# JWT Authentication (generate secure secret)
JWT_SECRET=your-32-character-minimum-secret-key

# Redis
REDIS_PASSWORD=your_redis_password

# CORS
CORS_ORIGIN=https://your-domain.com
```

## Docker Compose Deployment

### Quick Start

```bash
# Build and start all services
make up

# Or use the deployment script
chmod +x deploy/scripts/deploy.sh
./deploy/scripts/deploy.sh
```

### Manual Deployment

```bash
# 1. Build images
docker compose -f deploy/docker/docker-compose.yml build

# 2. Start services
docker compose -f deploy/docker/docker-compose.yml up -d

# 3. Check status
docker compose -f deploy/docker/docker-compose.yml ps

# 4. View logs
docker compose -f deploy/docker/docker-compose.yml logs -f
```

### Services

| Service  | Port | Description              |
| -------- | ---- | ------------------------ |
| frontend | 80   | Vue.js web application   |
| backend  | 3000 | Express.js API server    |
| postgres | 5432 | PostgreSQL database      |
| redis    | 6379 | Redis cache              |
| nginx    | 8080 | Reverse proxy (optional) |

### SSL Certificate Setup

```bash
# For development (self-signed)
./deploy/scripts/ssl.sh self-signed

# For production (Let's Encrypt)
DOMAIN=your-domain.com EMAIL=your@email.com ./deploy/scripts/ssl.sh letsencrypt
```

## Kubernetes Deployment

### Prerequisites

1. Kubernetes cluster access
2. kubectl configured
3. Helm installed

### Deployment Steps

```bash
# 1. Configure kubectl
kubectl config use-context your-cluster

# 2. Deploy all components
chmod +x deploy/scripts/migrate.sh
./deploy/scripts/migrate.sh deploy

# 3. Check deployment status
./deploy/scripts/migrate.sh status

# 4. View logs
./deploy/scripts/migrate.sh logs backend
```

### Components Deployed

| Component    | Type                    | Replicas |
| ------------ | ----------------------- | -------- |
| namespace    | Namespace               | 1        |
| postgres     | StatefulSet             | 1        |
| redis        | StatefulSet             | 1        |
| backend      | Deployment              | 2+       |
| frontend     | Deployment              | 2+       |
| backend-hpa  | HorizontalPodAutoscaler | 2-10     |
| frontend-hpa | HorizontalPodAutoscaler | 2-10     |
| backend-pdb  | PodDisruptionBudget     | 1        |
| frontend-pdb | PodDisruptionBudget     | 1        |

### Ingress Configuration

The ingress requires:

1. nginx-ingress controller installed
2. cert-manager for SSL certificates
3. DNS pointing to ingress IP

```bash
# Install nginx-ingress
helm install nginx-ingress nginx-ingress/ingress-nginx \
  --namespace ingressnginx \
  --create-namespace

# Install cert-manager
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true
```

## Post-Deployment

### 1. Database Migration

```bash
# Docker Compose
docker compose -f deploy/docker/docker-compose.yml exec backend npx prisma db push

# Kubernetes
kubectl exec -n admin-pro deployment/backend -- npx prisma db push
```

### 2. Seed Initial Data (Optional)

```bash
docker compose -f deploy/docker/docker-compose.yml exec backend pnpm db:seed
```

### 3. Verify Deployment

```bash
# Check health endpoints
curl https://your-domain.com/api/health
curl https://your-domain.com/health
```

### 4. Configure Monitoring

```bash
# Deploy Prometheus and Grafana
kubectl create namespace monitoring
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/prometheus -n monitoring
```

## Troubleshooting

### Common Issues

#### 1. Container won't start

```bash
# Check logs
docker compose logs <service-name>

# Check resource usage
docker stats
```

#### 2. Database connection failed

```bash
# Verify DATABASE_URL
docker compose exec backend env | grep DATABASE

# Test connection
docker compose exec postgres psql -U admin_pro -d admin_pro -c "SELECT 1"
```

#### 3. Build failures

```bash
# Clean build cache
docker builder prune -a

# Rebuild without cache
docker compose -f deploy/docker/docker-compose.yml build --no-cache
```

#### 4. Pod stuck in CrashLoopBackOff

```bash
# Check pod logs
kubectl logs -n admin-pro <pod-name> --previous

# Check pod events
kubectl describe pod -n admin-pro <pod-name>
```

### Health Check Commands

```bash
# Docker Compose
curl http://localhost:3000/api/health
curl http://localhost/health

# Kubernetes
kubectl exec -n admin-pro deployment/backend -- curl -s http://localhost:3000/api/health
```

### Backup Commands

```bash
# Create backup
./deploy/scripts/backup.sh backup

# Restore from backup
./deploy/scripts/backup.sh restore backups/postgres_20240101_120000.sql.gz
```

## Security Checklist

- [ ] Change default passwords
- [ ] Enable SSL/TLS
- [ ] Configure firewall rules
- [ ] Enable audit logging
- [ ] Set up fail2ban
- [ ] Configure rate limiting
- [ ] Review CORS settings
- [ ] Enable database encryption at rest
- [ ] Set up log aggregation
- [ ] Configure alerts
