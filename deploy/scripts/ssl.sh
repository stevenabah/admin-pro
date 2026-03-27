#!/bin/bash
# ============================================
# SSL Certificate Setup Script
# ============================================

set -e

# Configuration
DOMAIN="${DOMAIN:-admin-pro.com}"
EMAIL="${EMAIL:-admin@example.com}"
SSL_DIR="${SSL_DIR:-./deploy/docker/nginx/ssl}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if certbot is installed
check_certbot() {
    if ! command -v certbot &> /dev/null; then
        log_info "Installing certbot..."
        apt-get update && apt-get install -y certbot python3-certbot-nginx
    fi
}

# Generate self-signed certificate (for development)
generate_self_signed() {
    log_info "Generating self-signed certificate..."

    mkdir -p "$SSL_DIR"

    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$SSL_DIR/key.pem" \
        -out "$SSL_DIR/cert.pem" \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN"

    log_info "Self-signed certificate generated in $SSL_DIR"
}

# Generate Let's Encrypt certificate
generate_letsencrypt() {
    check_certbot

    log_info "Generating Let's Encrypt certificate for $DOMAIN..."

    certbot certonly --nginx \
        -d "$DOMAIN" \
        -d "api.$DOMAIN" \
        --email "$EMAIL" \
        --agree-tos \
        --non-interactive \
        --expand \
        --deploy-hook "systemctl reload nginx"

    # Copy certificates
    mkdir -p "$SSL_DIR"
    cp /etc/letsencrypt/live/"$DOMAIN"/fullchain.pem "$SSL_DIR/cert.pem"
    cp /etc/letsencrypt/live/"$DOMAIN"/privkey.pem "$SSL_DIR/key.pem"

    # Setup auto-renewal
    echo "0 0 * * * certbot renew --quiet --deploy-hook 'systemctl reload nginx'" | crontab -

    log_info "Let's Encrypt certificate generated and auto-renewal configured"
}

# Show certificate info
show_cert() {
    if [ -f "$SSL_DIR/cert.pem" ]; then
        log_info "Certificate information:"
        openssl x509 -in "$SSL_DIR/cert.pem" -text -noout | head -20
    else
        log_error "Certificate not found at $SSL_DIR/cert.pem"
    fi
}

# Show usage
usage() {
    echo "Usage: $0 {self-signed|letsencrypt|show}"
    echo ""
    echo "Commands:"
    echo "  self-signed   - Generate self-signed certificate (development)"
    echo "  letsencrypt   - Generate Let's Encrypt certificate (production)"
    echo "  show          - Show certificate information"
}

# Main
case "${1:-show}" in
    self-signed)
        generate_self_signed
        ;;
    letsencrypt)
        generate_letsencrypt
        ;;
    show)
        show_cert
        ;;
    *)
        usage
        exit 1
        ;;
esac
