#!/bin/bash
#
# Database backup script using pg_dump
# Supports uploading to S3 or Google Cloud Storage (GCS)
#
# Required environment variables:
#   PGHOST        - PostgreSQL host
#   PGPORT        - PostgreSQL port (default: 5432)
#   PGUSER        - PostgreSQL user
#   PGPASSWORD    - PostgreSQL password
#   PGDATABASE    - Database name to backup
#
# Optional environment variables for S3:
#   BACKUP_S3_BUCKET      - S3 bucket name (e.g., my-backups)
#   BACKUP_S3_PREFIX      - S3 key prefix (e.g., database/backups)
#   AWS_ACCESS_KEY_ID     - AWS access key
#   AWS_SECRET_ACCESS_KEY - AWS secret key
#   AWS_DEFAULT_REGION    - AWS region (default: us-east-1)
#
# Optional environment variables for GCS:
#   BACKUP_GCS_BUCKET     - GCS bucket name (e.g., my-backups)
#   BACKUP_GCS_PREFIX     - GCS object prefix (e.g., database/backups)
#   GOOGLE_APPLICATION_CREDENTIALS - Path to GCS service account key JSON
#
# Usage:
#   ./db_backup.sh
#   BACKUP_S3_BUCKET=my-bucket ./db_backup.sh
#   BACKUP_GCS_BUCKET=my-bucket ./db_backup.sh

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/tmp/db_backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PGPORT="${PGPORT:-5432}"
AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"

# Validate required variables
if [ -z "${PGHOST:-}" ]; then
  echo "Error: PGHOST environment variable is required"
  exit 1
fi

if [ -z "${PGUSER:-}" ]; then
  echo "Error: PGUSER environment variable is required"
  exit 1
fi

if [ -z "${PGPASSWORD:-}" ]; then
  echo "Error: PGPASSWORD environment variable is required"
  exit 1
fi

if [ -z "${PGDATABASE:-}" ]; then
  echo "Error: PGDATABASE environment variable is required"
  exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate backup filename
BACKUP_FILE="${BACKUP_DIR}/${PGDATABASE}_${TIMESTAMP}.sql.gz"

echo "Starting database backup..."
echo "Database: $PGDATABASE"
echo "Host: $PGHOST:$PGPORT"
echo "User: $PGUSER"
echo "Backup file: $BACKUP_FILE"

# Perform backup using pg_dump
# Options:
#   -h: host
#   -p: port
#   -U: user
#   -d: database
#   --no-owner: don't output commands to set object ownership
#   --no-acl: don't output commands to set access privileges
#   --clean: include DROP commands before CREATE
#   --if-exists: use IF EXISTS with DROP commands
export PGPASSWORD

if pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
    --no-owner --no-acl --clean --if-exists \
    | gzip > "$BACKUP_FILE"; then
  echo "✓ Backup created successfully: $BACKUP_FILE"
  
  # Get backup file size
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "Backup size: $BACKUP_SIZE"
else
  echo "✗ Backup failed"
  exit 1
fi

# Upload to S3 if configured
if [ -n "${BACKUP_S3_BUCKET:-}" ]; then
  echo ""
  echo "Uploading to S3..."
  
  # Check if AWS CLI is available
  if ! command -v aws &> /dev/null; then
    echo "Warning: aws CLI not found, skipping S3 upload"
  else
    S3_KEY="${BACKUP_S3_PREFIX:-backups}/$(basename "$BACKUP_FILE")"
    S3_URI="s3://${BACKUP_S3_BUCKET}/${S3_KEY}"
    
    if aws s3 cp "$BACKUP_FILE" "$S3_URI" --region "$AWS_DEFAULT_REGION"; then
      echo "✓ Uploaded to $S3_URI"
    else
      echo "✗ S3 upload failed"
      exit 1
    fi
  fi
fi

# Upload to GCS if configured
if [ -n "${BACKUP_GCS_BUCKET:-}" ]; then
  echo ""
  echo "Uploading to Google Cloud Storage..."
  
  # Check if gsutil is available
  if ! command -v gsutil &> /dev/null; then
    echo "Warning: gsutil not found, skipping GCS upload"
  else
    GCS_OBJECT="${BACKUP_GCS_PREFIX:-backups}/$(basename "$BACKUP_FILE")"
    GCS_URI="gs://${BACKUP_GCS_BUCKET}/${GCS_OBJECT}"
    
    if gsutil cp "$BACKUP_FILE" "$GCS_URI"; then
      echo "✓ Uploaded to $GCS_URI"
    else
      echo "✗ GCS upload failed"
      exit 1
    fi
  fi
fi

# Clean up old backups (keep last 7 days)
echo ""
echo "Cleaning up old backups..."
find "$BACKUP_DIR" -name "${PGDATABASE}_*.sql.gz" -type f -mtime +7 -delete
echo "✓ Cleanup complete"

echo ""
echo "Backup completed successfully!"
