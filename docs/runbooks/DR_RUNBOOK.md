# Disaster Recovery Runbook

This runbook provides procedures for disaster recovery, backup, and restore operations for the Aura-Sign MVP system.

---

## Table of Contents

1. [Overview](#overview)
2. [Disaster Recovery Objectives](#disaster-recovery-objectives)
3. [Backup Procedures](#backup-procedures)
4. [Restore Procedures](#restore-procedures)
5. [Disaster Scenarios](#disaster-scenarios)
6. [Recovery Procedures](#recovery-procedures)
7. [Testing and Validation](#testing-and-validation)
8. [Emergency Contacts](#emergency-contacts)

---

## Overview

### Purpose

This runbook ensures business continuity by providing clear procedures for:
- Regular backup operations
- Data restoration
- System recovery from various disaster scenarios
- Communication during incidents

### Scope

This runbook covers:
- **Database**: PostgreSQL with pgvector
- **Application**: Next.js apps and packages
- **Storage**: MinIO/S3 object storage
- **Cache**: Redis
- **Configuration**: Environment variables and secrets

### Recovery Team Roles

| Role | Responsibilities | Contact |
|------|-----------------|---------|
| **Incident Commander** | Coordinates overall recovery effort | [Primary Contact] |
| **Database Admin** | Database backup/restore operations | [DBA Contact] |
| **DevOps Lead** | Infrastructure and deployment | [DevOps Contact] |
| **Security Lead** | Security assessment and compliance | [Security Contact] |
| **Communications** | Stakeholder notifications | [Comms Contact] |

---

## Disaster Recovery Objectives

### Recovery Time Objective (RTO)

Target time to restore service after an incident:

| Component | RTO | Priority |
|-----------|-----|----------|
| **Authentication Service** | 1 hour | Critical |
| **API Services** | 2 hours | High |
| **Database** | 2 hours | High |
| **Web Interface** | 4 hours | Medium |
| **Analytics/Reporting** | 24 hours | Low |

### Recovery Point Objective (RPO)

Maximum acceptable data loss:

| Component | RPO | Backup Frequency |
|-----------|-----|------------------|
| **Database** | 1 hour | Hourly |
| **User Sessions** | 15 minutes | Continuous (Redis persistence) |
| **Application Logs** | 5 minutes | Continuous streaming |
| **Object Storage** | 24 hours | Daily |

---

## Backup Procedures

### Database Backup

#### Automated Backup Script

The project includes an automated backup script at `scripts/db_backup.sh`.

**Configuration**:

```bash
# Set environment variables
export PGHOST=your-db-host
export PGPORT=5432
export PGUSER=your-db-user
export PGPASSWORD=your-db-password
export PGDATABASE=aura_sign

# Optional: Cloud storage
export BACKUP_S3_BUCKET=aura-backups
export BACKUP_S3_PREFIX=database/backups
export AWS_ACCESS_KEY_ID=your-aws-key
export AWS_SECRET_ACCESS_KEY=your-aws-secret
export AWS_DEFAULT_REGION=us-east-1

# Or for Google Cloud Storage
export BACKUP_GCS_BUCKET=aura-backups
export BACKUP_GCS_PREFIX=database/backups
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

**Run Backup**:

```bash
./scripts/db_backup.sh
```

**Backup Output**:
- Local: `/tmp/db_backups/aura_sign_YYYYMMDD_HHMMSS.sql.gz`
- S3: `s3://aura-backups/database/backups/aura_sign_YYYYMMDD_HHMMSS.sql.gz`
- GCS: `gs://aura-backups/database/backups/aura_sign_YYYYMMDD_HHMMSS.sql.gz`

#### Schedule Automated Backups

**Using Cron** (Linux/Unix):

```bash
# Edit crontab
crontab -e

# Add hourly backup (at minute 0)
0 * * * * cd /path/to/aura-sign-mvp && ./scripts/db_backup.sh >> /var/log/db_backup.log 2>&1

# Add daily backup with retention
0 2 * * * cd /path/to/aura-sign-mvp && ./scripts/db_backup.sh && find /tmp/db_backups/ -name "*.sql.gz" -mtime +30 -delete
```

**Using Kubernetes CronJob**:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: database-backup
spec:
  schedule: "0 * * * *"  # Hourly
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:16
            command:
            - /bin/bash
            - -c
            - |
              pg_dump -h $PGHOST -U $PGUSER -d $PGDATABASE | gzip > /backups/backup_$(date +%Y%m%d_%H%M%S).sql.gz
            env:
            - name: PGHOST
              value: "postgres-service"
            - name: PGUSER
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: username
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: password
            - name: PGDATABASE
              value: "aura_sign"
            volumeMounts:
            - name: backup-storage
              mountPath: /backups
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
          restartPolicy: OnFailure
```

#### Manual Backup

For immediate backup before maintenance:

```bash
# Full database backup
pg_dump -h $PGHOST -U $PGUSER -d $PGDATABASE -F c -f backup_manual_$(date +%Y%m%d_%H%M%S).dump

# Schema only (for testing)
pg_dump -h $PGHOST -U $PGUSER -d $PGDATABASE --schema-only -f schema_$(date +%Y%m%d).sql

# Specific tables
pg_dump -h $PGHOST -U $PGUSER -d $PGDATABASE -t identity -t trust_event -F c -f critical_tables_$(date +%Y%m%d).dump
```

### Application Code Backup

**Git is the source of truth**. Ensure:

1. **Regular commits**: Commit and push changes daily
2. **Protected branches**: Main branch requires PR approval
3. **Release tags**: Tag stable releases
4. **GitHub backup**: Optional backup to secondary Git remote

```bash
# Tag a release
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# Add backup remote
git remote add backup https://gitlab.com/your-org/aura-sign-mvp.git
git push backup main --all
```

### Configuration Backup

**Secrets and Configuration** should be backed up securely:

#### Using HashiCorp Vault

```bash
# Backup Vault secrets
vault kv get -format=json secret/aura/production > vault_backup_$(date +%Y%m%d).json

# Encrypt backup
openssl enc -aes-256-cbc -salt -in vault_backup_$(date +%Y%m%d).json -out vault_backup_$(date +%Y%m%d).json.enc

# Upload to secure storage
aws s3 cp vault_backup_$(date +%Y%m%d).json.enc s3://aura-secure-backups/vault/

# Remove local copy
rm vault_backup_$(date +%Y%m%d).json vault_backup_$(date +%Y%m%d).json.enc
```

#### Environment Variables

```bash
# Backup environment configuration (without values)
env | grep -E '^(DATABASE_|REDIS_|MINIO_)' | cut -d= -f1 > env_keys_$(date +%Y%m%d).txt

# Store in version control
git add env_keys.txt
git commit -m "Update environment variable keys"
```

### Object Storage Backup

**For MinIO/S3**:

```bash
# Sync to backup bucket
aws s3 sync s3://aura-primary-bucket s3://aura-backup-bucket --storage-class GLACIER

# Or using MinIO client
mc mirror aura-primary/embeddings aura-backup/embeddings
```

### Redis Backup

Redis persistence should be enabled:

```bash
# redis.conf
appendonly yes
appendfilename "appendonly.aof"
save 900 1      # Save after 900 seconds if at least 1 key changed
save 300 10     # Save after 300 seconds if at least 10 keys changed
save 60 10000   # Save after 60 seconds if at least 10000 keys changed
```

**Manual backup**:

```bash
# Trigger save
redis-cli BGSAVE

# Copy RDB file
cp /var/lib/redis/dump.rdb /backups/redis_dump_$(date +%Y%m%d).rdb
```

---

## Restore Procedures

### Database Restore

#### Full Database Restore

```bash
# 1. Stop application services
systemctl stop aura-api
systemctl stop aura-worker

# 2. Create new database (if necessary)
psql -h $PGHOST -U postgres -c "DROP DATABASE IF EXISTS aura_sign_new;"
psql -h $PGHOST -U postgres -c "CREATE DATABASE aura_sign_new;"

# 3. Restore from backup
gunzip -c backup_file.sql.gz | psql -h $PGHOST -U $PGUSER -d aura_sign_new

# 4. Verify restore
psql -h $PGHOST -U $PGUSER -d aura_sign_new -c "SELECT COUNT(*) FROM identity;"
psql -h $PGHOST -U $PGUSER -d aura_sign_new -c "SELECT COUNT(*) FROM trust_event;"

# 5. Rename databases
psql -h $PGHOST -U postgres -c "ALTER DATABASE aura_sign RENAME TO aura_sign_old;"
psql -h $PGHOST -U postgres -c "ALTER DATABASE aura_sign_new RENAME TO aura_sign;"

# 6. Restart services
systemctl start aura-api
systemctl start aura-worker

# 7. Monitor logs
journalctl -u aura-api -f
```

#### Custom Format Restore

```bash
# Restore from .dump file
pg_restore -h $PGHOST -U $PGUSER -d aura_sign -c backup_file.dump

# Restore with verbose output
pg_restore -h $PGHOST -U $PGUSER -d aura_sign -v backup_file.dump

# Restore specific tables
pg_restore -h $PGHOST -U $PGUSER -d aura_sign -t identity backup_file.dump
```

#### Point-in-Time Recovery (PITR)

If WAL archiving is enabled:

```bash
# Note: PostgreSQL service name and paths vary by distribution
# This example uses PostgreSQL 16 (matching pgvector/pgvector:pg16 Docker image)
# Ubuntu/Debian: service name often just 'postgresql' (manages all versions)
#                /var/lib/postgresql/16/main
# RHEL/CentOS: version-specific service name 'postgresql-16'
#              /var/lib/pgsql/16/data
# Adjust paths and version numbers according to your installation

# 1. Stop PostgreSQL
# Ubuntu/Debian (service manages all versions):
systemctl stop postgresql
# RHEL/CentOS (version-specific service):
# systemctl stop postgresql-16

# 2. Replace data directory with base backup
rm -rf /var/lib/postgresql/16/main/*
tar -xzf base_backup.tar.gz -C /var/lib/postgresql/16/main/

# 3. Create recovery.signal and configure restore (PostgreSQL 12+)
touch /var/lib/postgresql/16/main/recovery.signal
cat >> /var/lib/postgresql/16/main/postgresql.conf <<EOF
restore_command = 'cp /var/lib/postgresql/wal_archive/%f %p'
recovery_target_time = '2025-12-06 12:00:00'
EOF

# 4. Start PostgreSQL
systemctl start postgresql

# 5. Monitor recovery
tail -f /var/log/postgresql/postgresql-16-main.log
# RHEL: tail -f /var/lib/pgsql/16/data/log/postgresql-*.log
```

### Application Restore

#### Restore from Git

```bash
# 1. Clone repository
git clone https://github.com/Kamil1230xd/aura-sign-mvp.git
cd aura-sign-mvp

# 2. Checkout specific version
git checkout v1.0.0  # or specific commit SHA

# 3. Install dependencies
pnpm install

# 4. Build applications
pnpm build

# 5. Deploy
# (deployment method depends on infrastructure)
```

#### Restore Configuration

```bash
# 1. Retrieve secrets from Vault
vault kv get -format=json secret/aura/production > current_secrets.json

# 2. Set environment variables
export DATABASE_URL=$(vault kv get -field=DATABASE_URL secret/aura/production)
export SESSION_SECRET=$(vault kv get -field=SESSION_SECRET secret/aura/production)
# ... other variables

# 3. Create .env file (for local/VM deployment)
vault kv get -format=json secret/aura/production | jq -r 'to_entries | .[] | "\(.key)=\(.value)"' > .env
```

### Redis Restore

```bash
# 1. Stop Redis
systemctl stop redis

# 2. Replace dump file
cp /backups/redis_dump_20251206.rdb /var/lib/redis/dump.rdb
chown redis:redis /var/lib/redis/dump.rdb

# 3. Start Redis
systemctl start redis

# 4. Verify data
redis-cli DBSIZE
```

---

## Disaster Scenarios

### Scenario 1: Database Corruption

**Symptoms**:
- Database queries failing
- Data inconsistency errors
- PostgreSQL crashes

**Recovery Procedure**:

```bash
# 1. Assess damage
psql -h $PGHOST -U $PGUSER -d aura_sign -c "SELECT * FROM pg_stat_database;"

# 2. Try REINDEX
psql -h $PGHOST -U $PGUSER -d aura_sign -c "REINDEX DATABASE aura_sign;"

# 3. If corruption persists, restore from backup
# Follow "Database Restore" procedure above

# 4. Verify data integrity
psql -h $PGHOST -U $PGUSER -d aura_sign <<EOF
SELECT 'identity count:', COUNT(*) FROM identity;
SELECT 'trust_event count:', COUNT(*) FROM trust_event;
-- Add other verification queries
EOF
```

**Estimated Recovery Time**: 2-4 hours

### Scenario 2: Complete Data Center Outage

**Symptoms**:
- All services unreachable
- No database connectivity
- Network isolation

**Recovery Procedure**:

```bash
# 1. Activate DR site
# Provision infrastructure in secondary region

# 2. Restore database from cloud backup (get most recent)
# Using aws s3api for reliable sorting by last modified date
LATEST_BACKUP=$(aws s3api list-objects-v2 \
  --bucket aura-backups \
  --prefix database/backups/ \
  --query 'sort_by(Contents, &LastModified)[-1].Key' \
  --output text)
aws s3 cp "s3://aura-backups/$LATEST_BACKUP" /tmp/
BACKUP_FILE=$(basename "$LATEST_BACKUP")
gunzip -c "/tmp/$BACKUP_FILE" | psql -h $DR_PGHOST -U $PGUSER -d aura_sign

# 3. Deploy application
git clone https://github.com/Kamil1230xd/aura-sign-mvp.git
cd aura-sign-mvp
pnpm install
pnpm build

# 4. Update DNS to point to DR site
# (Manual process or automated with Route53/CloudFlare)

# 5. Verify functionality
curl https://aura-sign.com/health
```

**Estimated Recovery Time**: 4-8 hours

### Scenario 3: Ransomware Attack

**Symptoms**:
- Files encrypted
- Database inaccessible
- Ransom note present

**Recovery Procedure**:

```bash
# 1. ISOLATE - Immediately disconnect affected systems
iptables -A INPUT -j DROP
iptables -A OUTPUT -j DROP

# 2. ASSESS - Determine scope
# - Which systems are affected?
# - When did encryption start?
# - Are backups compromised?

# 3. NOTIFY - Contact security team and law enforcement

# 4. RESTORE from clean backup
# Ensure backup predates the attack
aws s3 cp s3://aura-backups/database/backups/backup_before_attack.sql.gz /tmp/
# Follow restore procedures

# 5. REBUILD infrastructure from scratch
# Do not restore any potentially compromised systems

# 6. HARDEN security
# - Rotate all secrets
# - Update all passwords
# - Review access logs
# - Implement additional monitoring
```

**Estimated Recovery Time**: 24-48 hours

**DO NOT**:
- Pay the ransom
- Attempt to decrypt files without professional help
- Reconnect compromised systems to network

### Scenario 4: Accidental Data Deletion

**Symptoms**:
- Tables or records missing
- User reports data loss
- Recent DELETE or DROP commands in audit log

**Recovery Procedure**:

```bash
# 1. STOP - Immediately prevent further operations
# Stop application to prevent more writes

# 2. IDENTIFY deletion time
psql -h $PGHOST -U $PGUSER -d aura_sign -c "SELECT * FROM audit_log WHERE action = 'DELETE' ORDER BY created_at DESC LIMIT 10;"

# 3. RESTORE to point before deletion
# Use PITR if available, or restore from most recent backup before deletion

# 4. EXTRACT deleted data
# Create temporary database with restored data
psql -h $PGHOST -U postgres -c "CREATE DATABASE aura_sign_recovery;"
gunzip -c backup_before_deletion.sql.gz | psql -h $PGHOST -U $PGUSER -d aura_sign_recovery

# 5. COPY deleted records back
psql -h $PGHOST -U $PGUSER <<EOF
INSERT INTO aura_sign.identity
SELECT * FROM aura_sign_recovery.identity
WHERE address NOT IN (SELECT address FROM aura_sign.identity);
EOF

# 6. VERIFY recovery
psql -h $PGHOST -U $PGUSER -d aura_sign -c "SELECT COUNT(*) FROM identity;"
```

**Estimated Recovery Time**: 1-2 hours

### Scenario 5: Secrets Compromise

**Symptoms**:
- Unauthorized access detected
- Secrets leaked in logs or public repository
- Security alert from monitoring

**Recovery Procedure**:

```bash
# 1. ROTATE immediately
# Generate new secrets
NEW_SESSION_SECRET=$(openssl rand -base64 32)
NEW_DB_PASSWORD=$(openssl rand -base64 32)
NEW_IRON_SESSION_PASSWORD=$(openssl rand -base64 48)

# 2. UPDATE Vault
vault kv put secret/aura/production \
  SESSION_SECRET="$NEW_SESSION_SECRET" \
  IRON_SESSION_PASSWORD="$NEW_IRON_SESSION_PASSWORD"

# 3. UPDATE database password
psql -h $PGHOST -U postgres <<EOF
ALTER USER $PGUSER WITH PASSWORD '$NEW_DB_PASSWORD';
EOF

# 4. DEPLOY updated secrets
# Update environment variables in deployment
kubectl set env deployment/aura-api \
  SESSION_SECRET="$NEW_SESSION_SECRET" \
  IRON_SESSION_PASSWORD="$NEW_IRON_SESSION_PASSWORD"

# 5. RESTART services
kubectl rollout restart deployment/aura-api

# 6. INVALIDATE all sessions
redis-cli FLUSHDB

# 7. AUDIT access logs
# Review logs for unauthorized access
grep "unauthorized" /var/log/aura-api.log

# 8. NOTIFY users if necessary
# Send notification about session invalidation
```

**Estimated Recovery Time**: 30 minutes - 2 hours

---

## Recovery Procedures

### Health Checks

After any recovery:

```bash
# Database connectivity
psql -h $PGHOST -U $PGUSER -d aura_sign -c "SELECT 1"

# API health
curl https://api.aura-sign.com/health

# Authentication flow
curl -X POST https://api.aura-sign.com/api/auth/nonce

# Metrics endpoint
curl https://api.aura-sign.com/metrics | grep up

# Database counts
psql -h $PGHOST -U $PGUSER -d aura_sign <<EOF
SELECT 'identities:', COUNT(*) FROM identity;
SELECT 'trust_events:', COUNT(*) FROM trust_event;
EOF
```

### Post-Recovery Checklist

- [ ] Database accessible and responsive
- [ ] All required tables present
- [ ] Data counts match expected values
- [ ] Application services running
- [ ] Authentication working
- [ ] API endpoints responding
- [ ] Metrics being collected
- [ ] Logs being generated
- [ ] Backups resuming
- [ ] Monitoring alerts configured
- [ ] Users notified (if necessary)
- [ ] Incident documented
- [ ] Root cause identified
- [ ] Preventive measures implemented

### Communication Templates

#### Incident Notification

```
Subject: [INCIDENT] Aura-Sign Service Disruption

Team,

We are experiencing a service disruption affecting [affected components].

Status: [Investigating/Identified/Mitigating/Resolved]
Impact: [Description of user impact]
Started: [Timestamp]
ETA: [Estimated resolution time]

Actions:
- [Action 1]
- [Action 2]

Next update: [Time]

Incident Commander: [Name]
```

#### Resolution Notification

```
Subject: [RESOLVED] Aura-Sign Service Restored

Team,

The service disruption has been resolved.

Incident Summary:
- Start: [Timestamp]
- End: [Timestamp]
- Duration: [Duration]
- Root Cause: [Brief description]

Impact:
- [Systems affected]
- [Data loss, if any]
- [Users affected]

Resolution:
- [What was done]

Preventive Measures:
- [Action items to prevent recurrence]

Post-Incident Review: [Date/Time]

Thank you for your patience.
```

---

## Testing and Validation

### Backup Testing Schedule

| Test Type | Frequency | Owner |
|-----------|-----------|-------|
| Backup Verification | Daily | Automated |
| Restore Test (Dev) | Weekly | DBA |
| DR Drill (Staging) | Monthly | DevOps Team |
| Full DR Exercise | Quarterly | All Teams |

### Backup Validation

```bash
#!/bin/bash
# Test backup integrity

BACKUP_FILE="latest_backup.sql.gz"
TEST_DB="aura_sign_test"

# 1. Create test database
psql -h $PGHOST -U postgres -c "DROP DATABASE IF EXISTS $TEST_DB;"
psql -h $PGHOST -U postgres -c "CREATE DATABASE $TEST_DB;"

# 2. Restore backup
gunzip -c $BACKUP_FILE | psql -h $PGHOST -U $PGUSER -d $TEST_DB

# 3. Validate
IDENTITY_COUNT=$(psql -h $PGHOST -U $PGUSER -d $TEST_DB -tAc "SELECT COUNT(*) FROM identity;")
TRUST_EVENT_COUNT=$(psql -h $PGHOST -U $PGUSER -d $TEST_DB -tAc "SELECT COUNT(*) FROM trust_event;")

echo "Backup validation:"
echo "  Identities: $IDENTITY_COUNT"
echo "  Trust Events: $TRUST_EVENT_COUNT"

# 4. Cleanup
psql -h $PGHOST -U postgres -c "DROP DATABASE $TEST_DB;"

if [ $IDENTITY_COUNT -gt 0 ]; then
  echo "✓ Backup is valid"
  exit 0
else
  echo "✗ Backup validation failed"
  exit 1
fi
```

### DR Drill Checklist

- [ ] Schedule drill in advance
- [ ] Notify all team members
- [ ] Document start time
- [ ] Simulate disaster scenario
- [ ] Execute recovery procedures
- [ ] Time each step
- [ ] Verify functionality
- [ ] Document issues encountered
- [ ] Update runbook with learnings
- [ ] Debrief with team
- [ ] Create action items

---

## Emergency Contacts

### Internal Team

| Role | Name | Phone | Email | Backup |
|------|------|-------|-------|--------|
| Incident Commander | [Name] | [Phone] | [Email] | [Backup Name] |
| Database Admin | [Name] | [Phone] | [Email] | [Backup Name] |
| DevOps Lead | [Name] | [Phone] | [Email] | [Backup Name] |
| Security Lead | [Name] | [Phone] | [Email] | [Backup Name] |

### External Vendors

| Vendor | Service | Support Phone | Support Email |
|--------|---------|---------------|---------------|
| AWS | Cloud Infrastructure | [Support Number] | [Support Email] |
| PostgreSQL | Database Support | [Support Number] | [Support Email] |
| Security Firm | Incident Response | [Support Number] | [Support Email] |

### Escalation Path

1. **First Response**: On-call engineer
2. **Escalation 1**: Team lead (if not resolved in 30 minutes)
3. **Escalation 2**: Engineering manager (if not resolved in 1 hour)
4. **Escalation 3**: CTO/Executive team (if critical impact > 2 hours)

---

## Appendix

### Monitoring Dashboards

- **System Health**: [Dashboard URL]
- **Database Metrics**: [Dashboard URL]
- **Application Metrics**: [Dashboard URL]
- **Backup Status**: [Dashboard URL]

### Documentation

- **Architecture Diagram**: [Link]
- **Network Diagram**: [Link]
- **Dependency Map**: [Link]
- **Runbook Index**: [Link]

### Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-12-06 | 1.0 | Initial version | Copilot |

---

**This is a living document. Update after each incident and DR drill.**

**Last Reviewed**: 2025-12-06  
**Next Review**: 2026-03-06 (Quarterly)
