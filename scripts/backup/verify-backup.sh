#!/bin/bash
#
# MAIDAR Backup Verification Script
#
# Tests backup integrity by restoring to a temporary database.
#
# Usage: ./verify-backup.sh <backup_file>
#

set -e

BACKUP_FILE=$1
TEST_DB="maidar_backup_test_$(date +%s)"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting backup verification..."
log "Backup file: $BACKUP_FILE"
log "Test database: $TEST_DB"

# Create test database
createdb "$TEST_DB"

# Restore to test database
pg_restore -d "$TEST_DB" "$BACKUP_FILE" --no-owner --no-acl

# Verify tables exist
TABLE_COUNT=$(psql -d "$TEST_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")

log "Tables found: $TABLE_COUNT"

# Drop test database
dropdb "$TEST_DB"

if [ "$TABLE_COUNT" -gt 5 ]; then
    log "✅ Backup verification PASSED"
    exit 0
else
    log "❌ Backup verification FAILED"
    exit 1
fi
