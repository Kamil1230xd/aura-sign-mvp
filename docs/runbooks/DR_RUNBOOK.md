# Disaster Recovery Runbook

This runbook provides step-by-step procedures for disaster recovery scenarios in the Aura-Sign MVP system.

## Table of Contents

1. [Overview](#overview)
2. [Emergency Contacts](#emergency-contacts)
3. [Recovery Time Objectives](#recovery-time-objectives)
4. [Scenarios](#scenarios)
5. [Database Recovery](#database-recovery)
6. [Vector Index Rebuild](#vector-index-rebuild)
7. [Full System Recovery](#full-system-recovery)
8. [Smoke Tests](#smoke-tests)
9. [Post-Recovery Checklist](#post-recovery-checklist)

## Overview

**Purpose:** Restore Aura-Sign MVP services to operational state after catastrophic failure.

**Scope:** Covers database, vector indices, worker services, and application recovery.

**Assumptions:**
- Regular backups are available
- Infrastructure (servers, networking) is operational
- Team has access to backup storage and secrets management

## Emergency Contacts

| Role | Contact | Availability |
|------|---------|--------------|
| On-Call Engineer | (TBD) | 24/7 |
| Database Admin | (TBD) | Business hours + on-call |
| Security Lead | security@aura-idtoken.org | 24/7 |
| Infrastructure Lead | (TBD) | Business hours + on-call |

## Recovery Time Objectives

| Component | RTO | RPO | Priority |
|-----------|-----|-----|----------|
| Database (PostgreSQL) | 1 hour | 15 minutes | P0 |
| Redis Cache | 30 minutes | 0 (ephemeral) | P1 |
| Vector Indices | 2 hours | 1 hour | P1 |
| Workers | 30 minutes | 0 | P2 |
| MinIO/S3 | 1 hour | 1 hour | P1 |
| Application Servers | 30 minutes | 0 | P0 |

**RTO:** Recovery Time Objective (max downtime)  
**RPO:** Recovery Point Objective (max data loss)

## Scenarios

### Scenario 1: Database Corruption/Failure

**Symptoms:**
- Database connection errors
- Query failures
- Data inconsistency reports

**Recovery Procedure:** See [Database Recovery](#database-recovery)

### Scenario 2: Vector Index Corruption

**Symptoms:**
- Slow vector similarity queries
- Index scan errors
- Incorrect query results

**Recovery Procedure:** See [Vector Index Rebuild](#vector-index-rebuild)

### Scenario 3: Complete System Failure

**Symptoms:**
- All services down
- Infrastructure unavailable

**Recovery Procedure:** See [Full System Recovery](#full-system-recovery)

### Scenario 4: Worker Queue Failure

**Symptoms:**
- Jobs stuck in queue
- Worker processes crashed
- Redis connection lost

**Recovery Procedure:**
1. Check Redis service status: `docker ps | grep redis`
2. Restart Redis if needed: `docker-compose restart redis`
3. Clear dead jobs: `pnpm run workers:clean-queue`
4. Restart workers: `pnpm run dev:worker`
5. Monitor queue depth: Check Grafana dashboard

## Database Recovery

### Prerequisites
- Access to backup storage (S3/MinIO)
- Database credentials from Vault/KMS
- Sufficient disk space for restore

### Step 1: Assess Damage

```bash
# Check database status
docker-compose ps postgres

# Try to connect
psql $DATABASE_URL -c "SELECT version();"

# Check logs
docker-compose logs postgres --tail=100
```

### Step 2: Stop Application

```bash
# Stop all services that use the database
docker-compose stop demo-site
pnpm run workers:stop

# Verify no connections to DB
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
```

### Step 3: Restore from Backup

```bash
# List available backups
./scripts/db_backup.sh list

# Download latest backup
./scripts/db_backup.sh download backup_YYYY-MM-DD_HH-MM-SS.sql.gz

# Create new database (if needed)
createdb -h localhost -U admin aura_restore

# Restore backup
gunzip -c backup_YYYY-MM-DD_HH-MM-SS.sql.gz | \
  psql -h localhost -U admin -d aura_restore

# Verify restore
psql -d aura_restore -c "SELECT count(*) FROM users;"
psql -d aura_restore -c "SELECT count(*) FROM embeddings;"
```

### Step 4: Switch to Restored Database

```bash
# Update DATABASE_URL to point to restored DB
export DATABASE_URL=postgresql://admin:pass@localhost:5432/aura_restore

# Run migrations to catch up (if needed)
pnpm migrate

# Verify schema version
psql $DATABASE_URL -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;"
```

### Step 5: Restart Services

```bash
# Start application
docker-compose up -d demo-site

# Start workers
pnpm run dev:worker

# Monitor logs
docker-compose logs -f
```

### Step 6: Verify Recovery

See [Smoke Tests](#smoke-tests) section.

## Vector Index Rebuild

pgvector indices (ivfflat or hnsw) may need rebuilding after corruption or major updates.

### Step 1: Assess Index Status

```sql
-- Check index size and usage
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE indexname LIKE '%vector%';

-- Check for index bloat
SELECT * FROM pgstattuple('embeddings_embedding_idx');
```

### Step 2: Backup Current State

```bash
# Backup database before reindex
./scripts/db_backup.sh create

# Note: This is critical - reindex is resource-intensive
```

### Step 3: Run Reindex Script

```bash
# Stop workers to prevent new writes
pnpm run workers:stop

# Run reindex script
./scripts/reindex_ivf.sh

# Script will:
# 1. Drop existing vector indices
# 2. Recreate with optimal parameters
# 3. Rebuild index data
# 4. Analyze tables
```

### Step 4: Tune Index Parameters

```sql
-- For ivfflat index
CREATE INDEX CONCURRENTLY embeddings_embedding_idx 
ON embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);  -- Adjust based on data size

-- For hnsw index (if using)
CREATE INDEX CONCURRENTLY embeddings_embedding_idx 
ON embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

**Parameter Guidelines:**
- `lists` (ivfflat): ~sqrt(row_count), typically 100-1000
- `m` (hnsw): 16 for most cases (higher = more accurate but slower)
- `ef_construction` (hnsw): 64-128 for balanced performance

### Step 5: Verify Performance

```sql
-- Test query performance
EXPLAIN ANALYZE
SELECT id, embedding <=> '[0.1, 0.2, ...]'::vector AS distance
FROM embeddings
ORDER BY distance
LIMIT 10;

-- Should use index scan, not seq scan
-- Check execution time is acceptable (<100ms for typical queries)
```

### Step 6: Restart Workers

```bash
pnpm run dev:worker
```

## Full System Recovery

For complete infrastructure failure or disaster.

### Step 1: Provision Infrastructure

```bash
# If using cloud infrastructure, recreate VMs/containers
# Ensure network, storage, and compute resources are available

# Clone repository
git clone https://github.com/Kamil1230xd/aura-sign-mvp.git
cd aura-sign-mvp

# Install dependencies
pnpm install
```

### Step 2: Restore Configuration

```bash
# Retrieve secrets from Vault/KMS
# Do NOT use production secrets in staging recovery tests

# Set environment variables
cp .env.example .env
# Edit .env with production values

# Verify configuration
pnpm type-check
```

### Step 3: Start Infrastructure Services

```bash
# Start Docker services
docker-compose up -d postgres redis minio

# Wait for services to be ready
./scripts/wait_for_services.sh

# Verify connectivity
nc -zv localhost 5432  # Postgres
nc -zv localhost 6379  # Redis
nc -zv localhost 9000  # MinIO
```

### Step 4: Restore Database

Follow [Database Recovery](#database-recovery) steps 3-5.

### Step 5: Restore Object Storage

```bash
# Sync from backup S3 bucket
aws s3 sync s3://aura-backup-bucket/data s3://aura-production-bucket/data

# Or use MinIO client
mc mirror backup-minio/aura prod-minio/aura
```

### Step 6: Rebuild Vector Indices

Follow [Vector Index Rebuild](#vector-index-rebuild) steps.

### Step 7: Start Application

```bash
# Build application
pnpm build

# Start in production mode
NODE_ENV=production pnpm start

# Start workers
NODE_ENV=production pnpm run workers:start
```

### Step 8: Verify System Health

See [Smoke Tests](#smoke-tests) section.

## Smoke Tests

Run these tests after any recovery to verify system health.

### Database Connectivity

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT version();"

# Test data integrity
psql $DATABASE_URL <<EOF
SELECT 'Users' as table_name, count(*) FROM users
UNION ALL
SELECT 'Embeddings', count(*) FROM embeddings
UNION ALL
SELECT 'Attestations', count(*) FROM attestations;
EOF
```

### Vector Queries

```bash
# Test vector similarity search
psql $DATABASE_URL <<EOF
EXPLAIN ANALYZE
SELECT id, embedding <=> '[0.1, 0.2, ...]'::vector AS distance
FROM embeddings
ORDER BY distance
LIMIT 10;
EOF

# Verify index is used (should show "Index Scan" not "Seq Scan")
```

### API Health Check

```bash
# Test API endpoint
curl -f http://localhost:3000/api/health || echo "API health check failed"

# Test SIWE flow (basic)
curl -X POST http://localhost:3000/api/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}'
```

### Worker Health

```bash
# Check Redis connection
redis-cli ping

# Check queue status
redis-cli LLEN embedding:queue
redis-cli LLEN embedding:failed

# Submit test job
curl -X POST http://localhost:3000/api/workers/test
```

### Object Storage

```bash
# Test MinIO/S3 access
aws s3 ls s3://aura-production-bucket/ || echo "S3 access failed"

# Test upload/download
echo "test" > /tmp/test.txt
aws s3 cp /tmp/test.txt s3://aura-production-bucket/test/
aws s3 cp s3://aura-production-bucket/test/test.txt /tmp/test-download.txt
diff /tmp/test.txt /tmp/test-download.txt
```

### Monitoring

```bash
# Verify Prometheus is scraping metrics
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[].health'

# Check Grafana dashboards
curl http://localhost:3001/api/health
```

## Post-Recovery Checklist

After successful recovery, complete these tasks:

- [ ] **Verify all smoke tests pass**
- [ ] **Check application logs for errors**
  ```bash
  docker-compose logs --tail=200 demo-site | grep -i error
  ```
- [ ] **Verify monitoring/alerting is functional**
  - Check Prometheus targets are up
  - Verify Grafana dashboards display data
  - Test alert routing
- [ ] **Notify stakeholders of recovery completion**
  - Status page update
  - Email notification
  - Slack/Discord announcement
- [ ] **Document recovery timeline**
  - Time of failure
  - Time recovery started
  - Time recovery completed
  - RTO/RPO achieved vs. target
- [ ] **Schedule post-mortem meeting**
  - Within 48 hours of recovery
  - Invite all involved team members
  - Document lessons learned
- [ ] **Update runbook with new findings**
  - What worked well
  - What could be improved
  - New procedures needed
- [ ] **Verify backup schedule is running**
  ```bash
  ./scripts/db_backup.sh verify-schedule
  ```
- [ ] **Test restored backups**
  - Don't assume backup is good until tested
  - Schedule regular backup restoration tests

## Backup Verification

**Critical:** Backups are useless if they can't be restored. Test regularly.

### Quarterly Backup Restoration Test

```bash
# 1. Create test database
createdb aura_test_restore

# 2. Restore latest backup
gunzip -c $(./scripts/db_backup.sh latest) | psql -d aura_test_restore

# 3. Run smoke tests against test DB
export DATABASE_URL=postgresql://admin:pass@localhost:5432/aura_test_restore
./scripts/smoke_tests.sh

# 4. Document results
echo "Backup restore test: $(date)" >> docs/runbooks/backup_test_log.txt

# 5. Cleanup
dropdb aura_test_restore
```

## Monitoring & Alerts

Ensure these alerts are configured:

- Database connection failures
- High query latency (>1s)
- Replication lag (if using replicas)
- Disk space <10% free
- Worker queue depth >1000
- Failed job count increasing
- Redis memory >80% used

## Additional Resources

- [PostgreSQL Backup Documentation](https://www.postgresql.org/docs/current/backup.html)
- [pgvector Index Tuning](https://github.com/pgvector/pgvector#indexing)
- [Redis Persistence](https://redis.io/docs/management/persistence/)

---

**Last Updated:** 2024-12-04  
**Version:** 1.0  
**Next Review:** 2025-01-04
