#!/bin/bash
# ============================================
# Database Backup Script
# ============================================

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS="${RETENTION_DAYS:-7}"
DATABASE_URL="${DATABASE_URL:-postgresql://admin_pro:admin@localhost:5432/admin_pro}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL
backup_postgres() {
    log_info "Starting PostgreSQL backup..."

    BACKUP_FILE="$BACKUP_DIR/postgres_${DATE}.sql.gz"

    pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"

    if [ -f "$BACKUP_FILE" ]; then
        log_info "Backup created: $BACKUP_FILE"
        log_info "Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
    else
        log_error "Backup failed!"
        exit 1
    fi

    # Cleanup old backups
    find "$BACKUP_DIR" -name "postgres_*.sql.gz" -mtime "+$RETENTION_DAYS" -delete
    log_info "Old backups cleaned up (retention: $RETENTION_DAYS days)"
}

# Backup Redis
backup_redis() {
    log_info "Starting Redis backup..."

    REDIS_BACKUP_FILE="$BACKUP_DIR/redis_${DATE}.rdb.gz"

    redis-cli SAVE
    gzip < /var/lib/redis/dump.rdb > "$REDIS_BACKUP_FILE" 2>/dev/null || \
    docker compose exec -T redis redis-cli SAVE | gzip > "$REDIS_BACKUP_FILE"

    if [ -f "$REDIS_BACKUP_FILE" ]; then
        log_info "Redis backup created: $REDIS_BACKUP_FILE"
    fi
}

# Restore PostgreSQL
restore_postgres() {
    local BACKUP_FILE=$1
    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi

    log_info "Restoring PostgreSQL from: $BACKUP_FILE"

    gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL"

    log_info "Restore complete!"
}

# Main
case "${1:-backup}" in
    backup)
        backup_postgres
        backup_redis
        log_info "All backups complete!"
        ;;
    restore)
        restore_postgres "$2"
        ;;
    *)
        echo "Usage: $0 {backup|restore <backup_file>}"
        ;;
esac
