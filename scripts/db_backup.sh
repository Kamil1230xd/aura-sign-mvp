#!/bin/bash
#
# Database backup script with S3 and GCS upload support
# 
# Environment variables:
#   DB_HOST        - Database host (default: localhost)
#   DB_PORT        - Database port (default: 5432)
#   DB_NAME        - Database name (required)
#   DB_USER        - Database user (required)
#   DB_PASSWORD    - Database password (required)
#   BACKUP_DIR     - Local backup directory (default: /tmp/backups)
#   BACKUP_RETENTION_DAYS - Number of days to retain backups (default: 7)
#   BACKUP_PROVIDER - Upload provider: s3, gcs, or none (default: none)
#   S3_BUCKET      - S3 bucket name (required if BACKUP_PROVIDER=s3)
#   S3_PREFIX      - S3 key prefix (default: aura-sign/backups)
#   GCS_BUCKET     - GCS bucket name (required if BACKUP_PROVIDER=gcs)
#   GCS_PREFIX     - GCS object prefix (default: aura-sign/backups)

set -euo pipefail

# Configuration with defaults
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:?DB_NAME is required}"
DB_USER="${DB_USER:?DB_USER is required}"
DB_PASSWORD="${DB_PASSWORD:?DB_PASSWORD is required}"
BACKUP_DIR="${BACKUP_DIR:-/tmp/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
BACKUP_PROVIDER="${BACKUP_PROVIDER:-none}"
S3_BUCKET="${S3_BUCKET:-}"
S3_PREFIX="${S3_PREFIX:-aura-sign/backups}"
GCS_BUCKET="${GCS_BUCKET:-}"
GCS_PREFIX="${GCS_PREFIX:-aura-sign/backups}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "[$(date)] Starting database backup: $DB_NAME"

# Perform PostgreSQL dump with compression
export PGPASSWORD="$DB_PASSWORD"
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --format=plain --no-owner --no-acl --clean --if-exists \
  | gzip > "$BACKUP_FILE"

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup completed: $BACKUP_FILE ($BACKUP_SIZE)"

# Upload to cloud storage if configured
case "$BACKUP_PROVIDER" in
  s3)
    if [ -z "$S3_BUCKET" ]; then
      echo "[$(date)] ERROR: S3_BUCKET is required when BACKUP_PROVIDER=s3"
      exit 1
    fi
    
    S3_KEY="${S3_PREFIX}/${DB_NAME}_${TIMESTAMP}.sql.gz"
    echo "[$(date)] Uploading to S3: s3://$S3_BUCKET/$S3_KEY"
    
    if command -v aws &> /dev/null; then
      aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/$S3_KEY" \
        --storage-class STANDARD_IA \
        --metadata "timestamp=$TIMESTAMP,database=$DB_NAME"
      echo "[$(date)] Upload to S3 completed"
    else
      echo "[$(date)] ERROR: aws CLI not found. Install it to upload to S3."
      exit 1
    fi
    ;;
    
  gcs)
    if [ -z "$GCS_BUCKET" ]; then
      echo "[$(date)] ERROR: GCS_BUCKET is required when BACKUP_PROVIDER=gcs"
      exit 1
    fi
    
    GCS_OBJECT="${GCS_PREFIX}/${DB_NAME}_${TIMESTAMP}.sql.gz"
    echo "[$(date)] Uploading to GCS: gs://$GCS_BUCKET/$GCS_OBJECT"
    
    if command -v gsutil &> /dev/null; then
      gsutil -h "x-goog-meta-timestamp:$TIMESTAMP" \
        -h "x-goog-meta-database:$DB_NAME" \
        cp "$BACKUP_FILE" "gs://$GCS_BUCKET/$GCS_OBJECT"
      echo "[$(date)] Upload to GCS completed"
    else
      echo "[$(date)] ERROR: gsutil not found. Install it to upload to GCS."
      exit 1
    fi
    ;;
    
  none)
    echo "[$(date)] No cloud storage configured. Backup saved locally only."
    ;;
    
  *)
    echo "[$(date)] ERROR: Unknown BACKUP_PROVIDER: $BACKUP_PROVIDER (must be s3, gcs, or none)"
    exit 1
    ;;
esac

# Clean up old local backups
echo "[$(date)] Cleaning up backups older than $BACKUP_RETENTION_DAYS days"
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -type f -mtime +$BACKUP_RETENTION_DAYS -delete
REMAINING_BACKUPS=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -type f | wc -l)
echo "[$(date)] Retained $REMAINING_BACKUPS local backup(s)"

echo "[$(date)] Backup process completed successfully"
