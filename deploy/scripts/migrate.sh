#!/bin/bash
# ============================================
# Kubernetes Deployment Script
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
NAMESPACE="admin-pro"
KUBECONFIG_PATH="${KUBECONFIG:-$HOME/.kube/config}"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check kubectl
if ! command -v kubectl &> /dev/null; then
    log_error "kubectl not found. Please install kubectl first."
    exit 1
fi

# Check kubeconfig
if [ ! -f "$KUBECONFIG_PATH" ]; then
    log_error "Kubeconfig not found at $KUBECONFIG_PATH"
    exit 1
fi

# Deploy function
deploy() {
    log_info "Deploying Admin Pro to Kubernetes..."

    # Create namespace
    log_info "Creating namespace..."
    kubectl apply -f deploy/kubernetes/namespace.yaml

    # Apply ConfigMaps
    log_info "Applying ConfigMaps..."
    kubectl apply -f deploy/kubernetes/configmap.yaml

    # Apply Secrets (create from example if not exists)
    log_info "Applying Secrets..."
    if ! kubectl get secret admin-pro-secrets -n "$NAMESPACE" &> /dev/null; then
        log_warn "Secret not found. Please create admin-pro-secrets in namespace $NAMESPACE"
        log_warn "See deploy/kubernetes/secret.yaml for the required structure"
    else
        kubectl apply -f deploy/kubernetes/secret.yaml
    fi

    # Deploy PostgreSQL
    log_info "Deploying PostgreSQL..."
    kubectl apply -f deploy/kubernetes/postgres.yaml

    # Deploy Redis
    log_info "Deploying Redis..."
    kubectl apply -f deploy/kubernetes/redis.yaml

    # Wait for database
    log_info "Waiting for PostgreSQL..."
    kubectl wait --for=condition=ready pod -l app=postgres -n "$NAMESPACE" --timeout=300s

    # Deploy Backend
    log_info "Deploying Backend..."
    kubectl apply -f deploy/kubernetes/backend.yaml

    # Deploy Frontend
    log_info "Deploying Frontend..."
    kubectl apply -f deploy/kubernetes/frontend.yaml

    # Apply Ingress
    log_info "Applying Ingress..."
    kubectl apply -f deploy/kubernetes/ingress.yaml

    # Apply HPA
    log_info "Applying Horizontal Pod Autoscalers..."
    kubectl apply -f deploy/kubernetes/hpa.yaml

    # Apply PDB
    log_info "Applying Pod Disruption Budgets..."
    kubectl apply -f deploy/kubernetes/pdb.yaml

    # Wait for deployments
    log_info "Waiting for deployments to be ready..."
    kubectl rollout status deployment/backend -n "$NAMESPACE" --timeout=600s
    kubectl rollout status deployment/frontend -n "$NAMESPACE" --timeout=600s

    log_info "Deployment complete!"
}

# Delete function
delete() {
    log_warn "Deleting Admin Pro from Kubernetes..."
    kubectl delete -f deploy/kubernetes/ --ignore-not-found=true
    log_info "Deletion complete!"
}

# Status function
status() {
    log_info "Checking status..."
    kubectl get all -n "$NAMESPACE"
    kubectl get ingress -n "$NAMESPACE"
}

# Logs function
logs() {
    SERVICE=${1:-backend}
    kubectl logs -n "$NAMESPACE" -l app="$SERVICE" --tail=100 -f
}

# Show usage
usage() {
    echo "Usage: $0 {deploy|delete|status|logs}"
    echo ""
    echo "Commands:"
    echo "  deploy   - Deploy to Kubernetes"
    echo "  delete   - Delete from Kubernetes"
    echo "  status   - Show deployment status"
    echo "  logs     - Show logs (specify service as argument)"
}

# Main
case "${1:-deploy}" in
    deploy)
        deploy
        ;;
    delete)
        delete
        ;;
    status)
        status
        ;;
    logs)
        logs "$2"
        ;;
    *)
        usage
        exit 1
        ;;
esac
