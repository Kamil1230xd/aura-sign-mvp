# Staging Deployment & Testing Plan

## Overview

This document provides a comprehensive, step-by-step plan for deploying and testing the operational tooling patch in a staging environment before production rollout.

## Goals

1. Safely deploy the patch (database-client + trustmath + infra + scripts) to isolated staging environment
2. Verify functionality: DB init (pgvector + HNSW), vector API, TrustMath metrics, backup flow, Vault secrets
3. Run automated tests (Playwright E2E + Lighthouse + reporting)
4. Confirm observability (Prometheus scrape, alert rules) and basic load testing
5. Have clear, tested rollback and GO/NO-GO criteria for production

## Staging Environment Assumptions

Before starting, ensure you have:

- **Git branch**: `staging/ops-test` (created from main + patch applied)
- **Staging Postgres**: Separate DB instance (e.g., staging-db.aura) with min 4-8GB RAM
- **Staging app hosts**: staging-api, staging-trustmath, staging-web (Cloud Run/VM/Docker Compose)
- **Staging Vault** or Secret Manager: Separate mount/kv path `secret/data/aura/staging/*`
- **Staging S3/GCS bucket**: For backups (never use production buckets)
- **CI runner**: With permissions to deploy to staging (GitHub environment `staging` + secrets)

---

## STEP 0: Branch Preparation & Patch Application

In repository root:

```bash
# Create and switch to staging test branch
git checkout -b staging/ops-test

# Apply the full ops patch
git apply aura-full-ops.patch

# Stage all changes
git add -A

# Commit with descriptive message
git commit -m "staging: apply full ops patch (HNSW/metrics/backup/vault/e2e)"

# Push to remote
git push origin staging/ops-test
```

**Verification Checkpoint**:

- ✅ All new files present: packages/database-client/, packages/trustmath/, infra/, scripts/, docs/
- ✅ No merge conflicts
- ✅ Branch pushed successfully

---

## STEP 1: Configure Staging Secrets (Vault/GitHub)

### 1.1 Create Vault Paths

In Vault, create the following secret paths:

```bash
# Database credentials
vault kv put secret/data/aura/staging/database \
  PGHOST="staging-db.aura" \
  PGPORT="5432" \
  PGDATABASE="aura_staging" \
  PGUSER="aura_staging_user" \
  PGPASSWORD="<secure-staging-password>"

# Backup configuration
vault kv put secret/data/aura/staging/backup \
  BACKUP_S3_BUCKET="aura-staging-backups" \
  BACKUP_S3_PREFIX="database/backups" \
  AWS_ACCESS_KEY_ID="<staging-aws-key>" \
  AWS_SECRET_ACCESS_KEY="<staging-aws-secret>" \
  AWS_DEFAULT_REGION="us-east-1"

# API configuration
vault kv put secret/data/aura/staging/api \
  API_BASE_URL="https://staging-api.aura" \
  METRICS_PORT="3000"

# Worker configuration
vault kv put secret/data/aura/staging/worker \
  WORKER_BASE_URL="https://staging-worker.aura" \
  METRICS_PORT="3001"
```

### 1.2 Configure GitHub Secrets

In GitHub repository settings → Environments → staging, add:

```
STAGING_VAULT_ADDR=https://vault.aura
STAGING_VAULT_ROLE=aura-staging-deployer
STAGING_VAULT_TOKEN=<token-for-ci>
STAGING_DB_HOST=staging-db.aura
STAGING_DEPLOY_KEY=<ssh-key-for-staging-hosts>
```

**Verification Checkpoint**:

- ✅ Vault paths created and readable
- ✅ GitHub environment secrets configured
- ✅ CI can authenticate to Vault

---

## STEP 2: Database Initialization (pgvector + HNSW)

### 2.1 Connect to Staging Database

```bash
export PGHOST=staging-db.aura
export PGPORT=5432
export PGUSER=aura_staging_user
export PGPASSWORD=<staging-password>
export PGDATABASE=aura_staging

# Test connection
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "SELECT version();"
```

### 2.2 Install pgvector Extension

```sql
-- Connect to staging database
psql -h staging-db.aura -U aura_staging_user -d aura_staging

-- Install extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check version
SELECT vector_version();
```

### 2.3 Create Database Initialization Script

Create `db/init/02_pgvector_hnsw_staging.sql`:

```sql
-- pgvector HNSW configuration for staging
-- Applied to: staging-db.aura/aura_staging

-- Set HNSW search parameters
ALTER DATABASE aura_staging SET hnsw.ef_search = 100;

-- Create identity table (if not exists)
CREATE TABLE IF NOT EXISTS identity (
  address       VARCHAR(42) PRIMARY KEY,
  ai_embedding  vector(1536),
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- Create trust_event table (if not exists)
CREATE TABLE IF NOT EXISTS trust_event (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_address  VARCHAR(42) NOT NULL,
  to_address    VARCHAR(42) NOT NULL,
  trust_score   FLOAT NOT NULL,
  ai_embedding  vector(1536),
  event_type    VARCHAR(50) NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Create HNSW index on identity
DROP INDEX IF EXISTS identity_ai_embedding_idx;
CREATE INDEX identity_ai_embedding_idx
ON identity USING hnsw (ai_embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Create HNSW index on trust_event
DROP INDEX IF EXISTS trust_event_ai_embedding_idx;
CREATE INDEX trust_event_ai_embedding_idx
ON trust_event USING hnsw (ai_embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Create additional indexes
CREATE INDEX IF NOT EXISTS trust_event_from_address_idx ON trust_event(from_address);
CREATE INDEX IF NOT EXISTS trust_event_to_address_idx ON trust_event(to_address);

-- Verify indexes
\d identity
\d trust_event
```

Apply the script:

```bash
psql -h staging-db.aura -U aura_staging_user -d aura_staging -f db/init/02_pgvector_hnsw_staging.sql
```

### 2.4 Run Prisma Migrations

```bash
cd packages/database-client

# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name add_vector_support_staging

# Apply migration
npx prisma migrate deploy
```

**Verification Checkpoint**:

- ✅ pgvector extension installed
- ✅ HNSW indexes created on identity and trust_event tables
- ✅ Prisma migrations applied successfully
- ✅ Can query: `SELECT COUNT(*) FROM identity;`

---

## STEP 3: Deploy Application to Staging

### 3.1 Install Dependencies

```bash
cd /path/to/aura-sign-mvp

# Install all dependencies
pnpm install

# Build packages
pnpm --filter @aura-sign/database-client build
pnpm --filter @aura-sign/trustmath build
```

### 3.2 Deploy API Service

Create deployment script `scripts/deploy_staging_api.sh`:

```bash
#!/bin/bash
set -euo pipefail

# Fetch secrets from Vault
export PGHOST=$(vault kv get -field=PGHOST secret/data/aura/staging/database)
export PGUSER=$(vault kv get -field=PGUSER secret/data/aura/staging/database)
export PGPASSWORD=$(vault kv get -field=PGPASSWORD secret/data/aura/staging/database)
export PGDATABASE=$(vault kv get -field=PGDATABASE secret/data/aura/staging/database)

# Build and deploy API
cd apps/api
pnpm build

# Start API with metrics endpoint
node dist/server.js &
API_PID=$!

echo "API started with PID: $API_PID"
echo $API_PID > /tmp/staging-api.pid

# Wait for API to be ready
sleep 5

# Test metrics endpoint
curl -f http://localhost:3000/metrics || exit 1

echo "API deployed successfully"
```

### 3.3 Deploy TrustMath Worker

Create deployment script `scripts/deploy_staging_worker.sh`:

```bash
#!/bin/bash
set -euo pipefail

# Fetch secrets from Vault
export PGHOST=$(vault kv get -field=PGHOST secret/data/aura/staging/database)
export PGUSER=$(vault kv get -field=PGUSER secret/data/aura/staging/database)
export PGPASSWORD=$(vault kv get -field=PGPASSWORD secret/data/aura/staging/database)
export PGDATABASE=$(vault kv get -field=PGDATABASE secret/data/aura/staging/database)

# Build and deploy worker
cd apps/trustmath-worker
pnpm build

# Start worker with metrics endpoint
node dist/worker.js &
WORKER_PID=$!

echo "Worker started with PID: $WORKER_PID"
echo $WORKER_PID > /tmp/staging-worker.pid

# Wait for worker to be ready
sleep 5

# Test metrics endpoint
curl -f http://localhost:3001/metrics || exit 1

echo "Worker deployed successfully"
```

Execute deployments:

```bash
chmod +x scripts/deploy_staging_api.sh
chmod +x scripts/deploy_staging_worker.sh

./scripts/deploy_staging_api.sh
./scripts/deploy_staging_worker.sh
```

**Verification Checkpoint**:

- ✅ API running and responding on port 3000
- ✅ Worker running and responding on port 3001
- ✅ Both services expose /metrics endpoint
- ✅ Services can connect to staging database

---

## STEP 4: Configure Prometheus Monitoring

### 4.1 Update Prometheus Configuration for Staging

Edit `infra/prometheus/prometheus_staging.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'aura-sign-staging'
    environment: 'staging'

rule_files:
  - 'alert.rules.yml'

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'aura_api_staging'
    scrape_interval: 10s
    metrics_path: '/metrics'
    static_configs:
      - targets: ['staging-api.aura:3000']
        labels:
          service: 'api'
          component: 'backend'
          environment: 'staging'

  - job_name: 'trustmath_worker_staging'
    scrape_interval: 10s
    metrics_path: '/metrics'
    static_configs:
      - targets: ['staging-worker.aura:3001']
        labels:
          service: 'worker'
          component: 'trustmath'
          environment: 'staging'
```

### 4.2 Deploy Prometheus

```bash
# Using Docker Compose
cd infra/prometheus

# Create docker-compose.staging.yml
cat > docker-compose.staging.yml <<EOF
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus_staging.yml:/etc/prometheus/prometheus.yml
      - ./alert.rules.yml:/etc/prometheus/alert.rules.yml
      - prometheus-staging-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'

volumes:
  prometheus-staging-data:
EOF

# Start Prometheus
docker-compose -f docker-compose.staging.yml up -d

# Wait for Prometheus to start
sleep 10

# Verify Prometheus is running
curl http://localhost:9090/-/healthy
```

### 4.3 Verify Scraping

```bash
# Check targets in Prometheus
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health, lastError: .lastError}'

# Query metrics
curl 'http://localhost:9090/api/v1/query?query=up' | jq '.data.result'
```

**Verification Checkpoint**:

- ✅ Prometheus running on port 9090
- ✅ All targets (api, worker) showing as "up"
- ✅ Metrics being scraped successfully
- ✅ Alert rules loaded without errors

---

## STEP 5: Test Vector Search Functionality

### 5.1 Insert Test Data

Create test script `scripts/test_vector_insert_staging.js`:

```javascript
const { upsertIdentityEmbedding } = require('@aura-sign/database-client/dist/vector');

async function insertTestData() {
  console.log('Inserting test embeddings...');

  const testIdentities = [
    {
      address: '0x1111111111111111111111111111111111111111',
      embedding: Array(1536)
        .fill(0)
        .map(() => Math.random()),
    },
    {
      address: '0x2222222222222222222222222222222222222222',
      embedding: Array(1536)
        .fill(0)
        .map(() => Math.random()),
    },
    {
      address: '0x3333333333333333333333333333333333333333',
      embedding: Array(1536)
        .fill(0)
        .map(() => Math.random()),
    },
  ];

  for (const identity of testIdentities) {
    await upsertIdentityEmbedding(identity.address, identity.embedding);
    console.log(`✓ Inserted ${identity.address}`);
  }

  console.log('Test data inserted successfully');
}

insertTestData().catch(console.error);
```

Run the script:

```bash
cd packages/database-client
node ../../scripts/test_vector_insert_staging.js
```

### 5.2 Test Similarity Search

Create test script `scripts/test_vector_search_staging.js`:

```javascript
const { findSimilarIdentities } = require('@aura-sign/database-client/dist/vector');

async function testSimilaritySearch() {
  console.log('Testing similarity search...');

  const queryEmbedding = Array(1536)
    .fill(0)
    .map(() => Math.random());

  const results = await findSimilarIdentities(queryEmbedding, 5);

  console.log('Similarity search results:');
  results.forEach((result, i) => {
    console.log(`  ${i + 1}. ${result.address} - distance: ${result.distance.toFixed(4)}`);
  });

  if (results.length > 0) {
    console.log('✓ Similarity search working correctly');
  } else {
    console.log('⚠ No results returned');
  }
}

testSimilaritySearch().catch(console.error);
```

Run the script:

```bash
node scripts/test_vector_search_staging.js
```

**Verification Checkpoint**:

- ✅ Test embeddings inserted successfully
- ✅ Similarity search returns results
- ✅ Results ordered by distance (ascending)
- ✅ No errors in database logs

---

## STEP 6: Run Automated E2E Tests

### 6.1 Install Playwright

```bash
cd apps/web
pnpm install
npx playwright install
```

### 6.2 Configure Test Environment

Create `.env.test` in apps/web:

```
API_BASE_URL=https://staging-api.aura
```

### 6.3 Run E2E Tests

```bash
cd apps/web

# Run all tests
export API_BASE_URL=https://staging-api.aura
pnpm test:e2e

# Run with specific browser
npx playwright test --project=chromium

# Run with UI mode for debugging
npx playwright test --ui

# Generate HTML report
npx playwright show-report
```

### 6.4 Run Lighthouse Performance Tests

Create script `scripts/lighthouse_staging.sh`:

```bash
#!/bin/bash
set -euo pipefail

STAGING_URL="https://staging-api.aura"
REPORT_DIR="./lighthouse-reports"

mkdir -p $REPORT_DIR

# Run Lighthouse on key endpoints
lighthouse ${STAGING_URL}/metrics \
  --output html \
  --output json \
  --output-path ${REPORT_DIR}/metrics-report \
  --chrome-flags="--headless"

# Check scores
cat ${REPORT_DIR}/metrics-report.json | jq '.categories.performance.score'

echo "Lighthouse reports generated in ${REPORT_DIR}"
```

Run Lighthouse:

```bash
chmod +x scripts/lighthouse_staging.sh
./scripts/lighthouse_staging.sh
```

**Verification Checkpoint**:

- ✅ All Playwright tests passing
- ✅ Lighthouse performance score > 0.8
- ✅ No critical errors in test output
- ✅ API response times < 2s for similarity endpoint

---

## STEP 7: Test Backup & Restore

### 7.1 Configure Backup Environment

```bash
export PGHOST=staging-db.aura
export PGPORT=5432
export PGUSER=aura_staging_user
export PGPASSWORD=<staging-password>
export PGDATABASE=aura_staging
export BACKUP_S3_BUCKET=aura-staging-backups
export BACKUP_S3_PREFIX=database/backups
export AWS_ACCESS_KEY_ID=<staging-key>
export AWS_SECRET_ACCESS_KEY=<staging-secret>
export AWS_DEFAULT_REGION=us-east-1
```

### 7.2 Run Backup

```bash
./scripts/db_backup.sh
```

Verify backup:

```bash
# Check local backup file
ls -lh /tmp/db_backups/

# Check S3 upload
aws s3 ls s3://aura-staging-backups/database/backups/ --region us-east-1
```

### 7.3 Test Restore (on separate test database)

```bash
# Create test restore database
psql -h staging-db.aura -U aura_staging_user -c "CREATE DATABASE aura_staging_restore;"

# Get latest backup
LATEST_BACKUP=$(ls -t /tmp/db_backups/aura_staging_*.sql.gz | head -1)

# Restore
gunzip < $LATEST_BACKUP | psql -h staging-db.aura -U aura_staging_user -d aura_staging_restore

# Verify restore
psql -h staging-db.aura -U aura_staging_user -d aura_staging_restore -c "SELECT COUNT(*) FROM identity;"

# Cleanup
psql -h staging-db.aura -U aura_staging_user -c "DROP DATABASE aura_staging_restore;"
```

**Verification Checkpoint**:

- ✅ Backup completes without errors
- ✅ Backup file created and uploaded to S3
- ✅ Restore successful on test database
- ✅ Data integrity verified after restore

---

## STEP 8: Observability & Metrics Validation

### 8.1 Verify Metrics Collection

```bash
# Check API metrics
curl https://staging-api.aura/metrics | grep -E "trustmath_|vector_search_"

# Check worker metrics
curl https://staging-worker.aura/metrics | grep -E "trustmath_|vector_search_"

# Query Prometheus for custom metrics
curl 'http://localhost:9090/api/v1/query?query=trustmath_runs_total' | jq '.data.result'
curl 'http://localhost:9090/api/v1/query?query=vector_search_latency_seconds_bucket' | jq '.data.result'
```

### 8.2 Trigger and Verify Alerts

```bash
# Check alert rules status
curl http://localhost:9090/api/v1/rules | jq '.data.groups[].rules[] | {alert: .name, state: .state}'

# Simulate high latency (if possible)
# Then check if alert fires
curl 'http://localhost:9090/api/v1/query?query=ALERTS{alertname="HighVectorSearchLatency"}' | jq '.data.result'
```

### 8.3 Review Logs

```bash
# API logs
tail -f /var/log/staging-api.log | grep -E "ERROR|WARN"

# Worker logs
tail -f /var/log/staging-worker.log | grep -E "ERROR|WARN"

# Database logs
tail -f /var/log/postgresql/postgresql-staging.log | grep -E "ERROR|FATAL"
```

**Verification Checkpoint**:

- ✅ All custom metrics being collected
- ✅ Alert rules configured and ready to fire
- ✅ No errors in application logs
- ✅ Prometheus dashboard accessible and functional

---

## STEP 9: Basic Load Testing

### 9.1 Install Load Testing Tool

```bash
npm install -g artillery
```

### 9.2 Create Load Test Configuration

Create `tests/load/similarity_load_test.yml`:

```yaml
config:
  target: 'https://staging-api.aura'
  phases:
    - duration: 60
      arrivalRate: 5
      name: 'Warm up'
    - duration: 120
      arrivalRate: 10
      name: 'Sustained load'
    - duration: 60
      arrivalRate: 20
      name: 'Peak load'
  processor: './load_test_processor.js'

scenarios:
  - name: 'Vector similarity search'
    flow:
      - post:
          url: '/api/similarity'
          json:
            embedding: '{{ embedding }}'
            k: 5
          capture:
            - json: '$.results'
              as: 'results'
```

Create processor `tests/load/load_test_processor.js`:

```javascript
module.exports = {
  generateEmbedding: function (context, events, done) {
    context.vars.embedding = Array(1536)
      .fill(0)
      .map(() => Math.random());
    return done();
  },
};
```

### 9.3 Run Load Test

```bash
cd tests/load
artillery run similarity_load_test.yml --output report.json

# Generate HTML report
artillery report report.json
```

### 9.4 Monitor During Load Test

```bash
# Watch metrics in real-time
watch -n 5 'curl -s https://staging-api.aura/metrics | grep vector_search_latency'

# Monitor Prometheus
# Access http://localhost:9090 and run queries:
# rate(vector_search_latency_seconds_sum[1m]) / rate(vector_search_latency_seconds_count[1m])
```

**Verification Checkpoint**:

- ✅ System handles sustained load without errors
- ✅ P95 latency < 2 seconds under load
- ✅ No memory leaks observed
- ✅ Database connections stable

---

## STEP 10: Rollback Preparation

### 10.1 Document Current State

```bash
# Save current database schema
pg_dump -h staging-db.aura -U aura_staging_user -d aura_staging --schema-only > /tmp/schema_before_patch.sql

# Save current metrics
curl https://staging-api.aura/metrics > /tmp/metrics_before_rollback.txt

# Note current commit
git rev-parse HEAD > /tmp/patch_commit_hash.txt
```

### 10.2 Create Rollback Script

Create `scripts/rollback_staging.sh`:

```bash
#!/bin/bash
set -euo pipefail

echo "Starting rollback procedure..."

# Stop services
echo "Stopping services..."
kill $(cat /tmp/staging-api.pid) 2>/dev/null || true
kill $(cat /tmp/staging-worker.pid) 2>/dev/null || true

# Revert database changes (if needed)
echo "Reverting database changes..."
psql -h staging-db.aura -U aura_staging_user -d aura_staging <<EOF
DROP INDEX IF EXISTS identity_ai_embedding_idx;
DROP INDEX IF EXISTS trust_event_ai_embedding_idx;
-- Add more rollback SQL as needed
EOF

# Checkout previous commit
echo "Reverting code changes..."
PREVIOUS_COMMIT=$(git rev-parse HEAD~1)
git checkout $PREVIOUS_COMMIT

# Rebuild and restart services
echo "Rebuilding services..."
pnpm install
pnpm build

echo "Rollback complete. Please manually restart services."
```

### 10.3 Test Rollback (Dry Run)

```bash
# Create a snapshot first
echo "Testing rollback procedure (dry run)"
chmod +x scripts/rollback_staging.sh

# Review script without executing
cat scripts/rollback_staging.sh
```

**Verification Checkpoint**:

- ✅ Current state documented
- ✅ Rollback script created and reviewed
- ✅ Rollback steps tested on separate environment
- ✅ Recovery time estimated (< 10 minutes)

---

## STEP 11: GO/NO-GO Decision Criteria

### GO Criteria (All must pass)

- ✅ pgvector extension installed and HNSW indexes functional
- ✅ All E2E tests passing (Playwright)
- ✅ Similarity search API returning correct results
- ✅ Metrics being collected and exposed properly
- ✅ Prometheus scraping successfully
- ✅ Alert rules loaded without errors
- ✅ Backup and restore tested successfully
- ✅ Load testing shows acceptable performance (P95 < 2s)
- ✅ No critical errors in logs
- ✅ Rollback procedure documented and tested
- ✅ All verification checkpoints passed

### NO-GO Criteria (Any one fails deployment)

- ❌ E2E test failures > 10%
- ❌ Vector search returning incorrect results
- ❌ Database performance degradation > 20%
- ❌ Critical security vulnerabilities detected
- ❌ Backup/restore failures
- ❌ Memory leaks detected during load testing
- ❌ Alert rules not firing correctly
- ❌ Prometheus scraping failures

---

## STEP 12: Production Deployment Readiness

If all GO criteria are met:

1. **Document all findings** in deployment report
2. **Update runbook** with any staging-discovered issues
3. **Schedule production deployment** window
4. **Prepare production secrets** in Vault
5. **Brief team** on rollback procedures
6. **Set up monitoring** for production metrics
7. **Create production deployment plan** based on this staging plan

### Production Deployment Checklist

```markdown
- [ ] Staging tests all passed
- [ ] Production Vault secrets configured
- [ ] Production Prometheus configured
- [ ] Production backup bucket created
- [ ] Database maintenance window scheduled
- [ ] Team notified of deployment
- [ ] Rollback procedure documented
- [ ] On-call engineer assigned
- [ [ Post-deployment monitoring plan ready
```

---

## Appendix A: Troubleshooting Guide

### Issue: pgvector extension not found

```bash
# Install pgvector from source
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

### Issue: HNSW index creation fails

```bash
# Check pgvector version (HNSW requires v0.5.0+)
SELECT vector_version();

# If too old, upgrade pgvector
# Then recreate index
```

### Issue: Metrics endpoint returns 404

```bash
# Check if metrics handler is registered
grep -r "metricsHandler" apps/api/src/

# Verify route is exposed
curl -v https://staging-api.aura/metrics
```

### Issue: Backup script fails

```bash
# Check pg_dump is installed
which pg_dump

# Verify credentials
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "SELECT 1"

# Check S3 permissions
aws s3 ls s3://$BACKUP_S3_BUCKET/
```

---

## Appendix B: Monitoring Queries

### Prometheus Queries for Monitoring

```promql
# Vector search P95 latency
histogram_quantile(0.95, rate(vector_search_latency_seconds_bucket[5m]))

# TrustMath run success rate
rate(trustmath_runs_total{status="success"}[5m]) / rate(trustmath_runs_total[5m])

# API error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# Database connection pool usage
pg_stat_database_numbackends / pg_settings{name="max_connections"}
```

---

## Summary

This comprehensive staging deployment plan ensures that all operational tooling is thoroughly tested before production rollout. Follow each step sequentially, verify all checkpoints, and document any issues discovered during testing.

**Remember**: The goal of staging is to find problems before they reach production. Take time to thoroughly test each component.
