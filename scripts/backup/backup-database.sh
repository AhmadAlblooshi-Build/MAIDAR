#!/bin/bash
#
# MAIDAR Database Backup Script
#
# This script creates a backup of the PostgreSQL database with compression and encryption.
# Backups are stored locally and optionally uploaded to S3.
#
# Usage: ./backup-database.sh [environment]
# Example: ./backup-database.sh production
#

set -e  # Exit on error
set -u  # Exit on undefined variable

# ============================================================================
# Configuration
# ============================================================================

ENVIRONMENT=${1:-production}
BACKUP_DIR="/var/backups/maidar"
S3_BUCKET="maidar-backups-${ENVIRONMENT}"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="maidar-${ENVIRONMENT}-${DATE}.sql.gz"
ENCRYPTED_FILE="${BACKUP_FILE}.gpg"

# Database connection (from environment variables or .env)
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-maidar}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD}

# Encryption key (GPG)
GPG_KEY=${GPG_KEY:-maidar-backup@company.com}

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

check_dependencies() {
    log "Checking dependencies..."

    # Check if pg_dump is available
    if ! command -v pg_dump &> /dev/null; then
        error "pg_dump not found. Install PostgreSQL client tools."
    fi

    # Check if gzip is available
    if ! command -v gzip &> /dev/null; then
        error "gzip not found. Install gzip."
    fi

    # Check if gpg is available (optional for encryption)
    if ! command -v gpg &> /dev/null; then
        log "Warning: gpg not found. Backup will not be encrypted."
    fi

    # Check if aws cli is available (optional for S3 upload)
    if ! command -v aws &> /dev/null; then
        log "Warning: AWS CLI not found. Backup will not be uploaded to S3."
    fi
}

create_backup_directory() {
    log "Creating backup directory: $BACKUP_DIR"

    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
    fi
}

backup_database() {
    log "Starting database backup..."

    export PGPASSWORD="$DB_PASSWORD"

    # Create backup with compression
    pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --format=custom \
        --compress=9 \
        --verbose \
        --file="$BACKUP_DIR/$BACKUP_FILE"

    unset PGPASSWORD

    # Check if backup was created
    if [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
        error "Backup file not created"
    fi

    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    log "Backup created: $BACKUP_FILE (Size: $BACKUP_SIZE)"
}

encrypt_backup() {
    log "Encrypting backup..."

    if command -v gpg &> /dev/null; then
        gpg \
            --encrypt \
            --recipient "$GPG_KEY" \
            --output "$BACKUP_DIR/$ENCRYPTED_FILE" \
            "$BACKUP_DIR/$BACKUP_FILE"

        # Remove unencrypted file
        rm "$BACKUP_DIR/$BACKUP_FILE"

        log "Backup encrypted: $ENCRYPTED_FILE"
    else
        log "Skipping encryption (gpg not available)"
        ENCRYPTED_FILE="$BACKUP_FILE"
    fi
}

upload_to_s3() {
    log "Uploading backup to S3..."

    if command -v aws &> /dev/null; then
        aws s3 cp \
            "$BACKUP_DIR/$ENCRYPTED_FILE" \
            "s3://$S3_BUCKET/$ENCRYPTED_FILE" \
            --storage-class STANDARD_IA \
            --region me-south-1

        log "Backup uploaded to S3: s3://$S3_BUCKET/$ENCRYPTED_FILE"
    else
        log "Skipping S3 upload (AWS CLI not available)"
    fi
}

cleanup_old_backups() {
    log "Cleaning up old backups (older than $RETENTION_DAYS days)..."

    # Local cleanup
    find "$BACKUP_DIR" -name "maidar-${ENVIRONMENT}-*.sql.gz*" -mtime +$RETENTION_DAYS -delete

    # S3 cleanup (if AWS CLI available)
    if command -v aws &> /dev/null; then
        CUTOFF_DATE=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)

        aws s3 ls "s3://$S3_BUCKET/" | \
            awk '{print $4}' | \
            while read file; do
                FILE_DATE=$(echo "$file" | grep -oP '\d{8}' | head -1)
                if [ "$FILE_DATE" -lt "$CUTOFF_DATE" ]; then
                    log "Deleting old backup: $file"
                    aws s3 rm "s3://$S3_BUCKET/$file"
                fi
            done
    fi

    log "Cleanup complete"
}

verify_backup() {
    log "Verifying backup integrity..."

    # List contents of backup file
    pg_restore --list "$BACKUP_DIR/$ENCRYPTED_FILE" &> /dev/null || \
        error "Backup verification failed"

    log "Backup verification successful"
}

send_notification() {
    STATUS=$1
    MESSAGE=$2

    # Send Slack notification (if webhook configured)
    if [ -n "${SLACK_WEBHOOK:-}" ]; then
        curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"text\": \"Backup $STATUS: $MESSAGE\"}"
    fi

    # Send email notification (if configured)
    if [ -n "${NOTIFICATION_EMAIL:-}" ]; then
        echo "$MESSAGE" | mail -s "Backup $STATUS" "$NOTIFICATION_EMAIL"
    fi
}

# ============================================================================
# Main
# ============================================================================

main() {
    log "==================================================================="
    log "MAIDAR Database Backup - Environment: $ENVIRONMENT"
    log "==================================================================="

    check_dependencies
    create_backup_directory
    backup_database
    encrypt_backup
    upload_to_s3
    cleanup_old_backups
    verify_backup

    log "==================================================================="
    log "Backup completed successfully!"
    log "Backup file: $ENCRYPTED_FILE"
    log "Location: $BACKUP_DIR"
    log "==================================================================="

    send_notification "SUCCESS" "Backup completed: $ENCRYPTED_FILE"
}

# Run main function
main

exit 0
