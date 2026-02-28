#!/bin/bash
#
# MAIDAR Database Restore Script
#
# This script restores a PostgreSQL database from a backup file.
#
# Usage: ./restore-database.sh <backup_file> [environment]
# Example: ./restore-database.sh maidar-production-20260228-103000.sql.gz.gpg production
#

set -e  # Exit on error
set -u  # Exit on undefined variable

# ============================================================================
# Configuration
# ============================================================================

BACKUP_FILE=$1
ENVIRONMENT=${2:-production}

# Database connection
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-maidar}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD}

# ============================================================================
# Functions
# ============================================================================

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
    exit 1
}

confirm_restore() {
    echo "⚠️  WARNING ⚠️"
    echo "This will OVERWRITE the database: $DB_NAME"
    echo "Backup file: $BACKUP_FILE"
    echo "Environment: $ENVIRONMENT"
    echo ""
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " CONFIRM

    if [ "$CONFIRM" != "yes" ]; then
        error "Restore cancelled by user"
    fi
}

check_backup_file() {
    log "Checking backup file..."

    if [ ! -f "$BACKUP_FILE" ]; then
        error "Backup file not found: $BACKUP_FILE"
    fi

    log "Backup file found: $BACKUP_FILE"
}

decrypt_backup() {
    log "Decrypting backup..."

    if [[ "$BACKUP_FILE" == *.gpg ]]; then
        gpg --decrypt "$BACKUP_FILE" > "${BACKUP_FILE%.gpg}"
        DECRYPTED_FILE="${BACKUP_FILE%.gpg}"
        log "Backup decrypted: $DECRYPTED_FILE"
    else
        DECRYPTED_FILE="$BACKUP_FILE"
        log "Backup is not encrypted"
    fi
}

create_pre_restore_backup() {
    log "Creating pre-restore backup..."

    PRE_RESTORE_BACKUP="pre-restore-$(date +%Y%m%d-%H%M%S).sql.gz"

    export PGPASSWORD="$DB_PASSWORD"

    pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --format=custom \
        --compress=9 \
        --file="$PRE_RESTORE_BACKUP"

    unset PGPASSWORD

    log "Pre-restore backup created: $PRE_RESTORE_BACKUP"
}

terminate_connections() {
    log "Terminating active database connections..."

    export PGPASSWORD="$DB_PASSWORD"

    psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d postgres \
        -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();"

    unset PGPASSWORD

    log "Connections terminated"
}

restore_database() {
    log "Starting database restore..."

    export PGPASSWORD="$DB_PASSWORD"

    # Drop and recreate database
    dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" --if-exists
    createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"

    # Restore backup
    pg_restore \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --no-owner \
        --no-acl \
        "$DECRYPTED_FILE"

    unset PGPASSWORD

    log "Database restore complete"
}

verify_restore() {
    log "Verifying restore..."

    export PGPASSWORD="$DB_PASSWORD"

    # Check if tables exist
    TABLE_COUNT=$(psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")

    unset PGPASSWORD

    log "Tables found: $TABLE_COUNT"

    if [ "$TABLE_COUNT" -lt 5 ]; then
        error "Restore verification failed: Too few tables"
    fi

    log "Restore verification successful"
}

cleanup_temp_files() {
    log "Cleaning up temporary files..."

    if [ -f "$DECRYPTED_FILE" ] && [ "$DECRYPTED_FILE" != "$BACKUP_FILE" ]; then
        rm "$DECRYPTED_FILE"
    fi

    log "Cleanup complete"
}

# ============================================================================
# Main
# ============================================================================

main() {
    log "==================================================================="
    log "MAIDAR Database Restore - Environment: $ENVIRONMENT"
    log "==================================================================="

    confirm_restore
    check_backup_file
    decrypt_backup
    create_pre_restore_backup
    terminate_connections
    restore_database
    verify_restore
    cleanup_temp_files

    log "==================================================================="
    log "Restore completed successfully!"
    log "Pre-restore backup: $PRE_RESTORE_BACKUP"
    log "==================================================================="
}

# Run main function
main

exit 0
