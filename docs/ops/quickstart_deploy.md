# Operational Quickstart Guide

This guide covers deploying and operating the Aura-Sign MVP with vector similarity, metrics, backups, and E2E testing.

## Prerequisites

- PostgreSQL 14+ with `pgvector` extension
- Node.js 20+ and pnpm 8+
- AWS CLI (for S3 backups) or gcloud SDK (for GCS backups)
- Prometheus (for metrics collection)

## 1. Database Setup

### Install pgvector Extension

Connect to your PostgreSQL database and enable the pgvector extension:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Apply Database Migrations

If using Prisma migrations:

```bash
cd packages/database-client
pnpm prisma migrate dev
```

### Create HNSW Index

Apply the HNSW index for efficient vector similarity search:

```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f db/init/02_pgvector_hnsw.sql
```

The SQL file should contain:

```sql
-- Create HNSW index on embedding column for fast similarity search
CREATE INDEX IF NOT EXISTS identity_embedding_hnsw_idx 
ON "Identity" USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

### Integrate schema_extra.prisma

Maintainers should integrate the contents of `packages/database-client/schema_extra.prisma` into the main `schema.prisma` file:

1. Copy the `Identity` and `TrustEvent` model definitions
2. Note the `embedding` field uses `Unsupported("vector(1536)")` type
3. Run `pnpm prisma generate` after integration
4. Run `pnpm prisma migrate dev` to create migrations

## 2. Using Vector Helper Functions

The `packages/database-client/src/vector.ts` module provides helper functions for vector operations:

```typescript
import { PrismaClient } from '@prisma/client';
import { 
  upsertIdentityEmbedding, 
  findSimilarIdentities,
  validateEmbedding,
  getEmbeddingDimension 
} from '@aura-sign/database-client/vector';

const prisma = new PrismaClient();

// Validate an embedding
const embedding = [/* ... 1536 numbers ... */];
if (!validateEmbedding(embedding)) {
  throw new Error('Invalid embedding');
}

// Store an embedding for an identity
await upsertIdentityEmbedding(prisma, 'identity-id', embedding);

// Find similar identities
const similar = await findSimilarIdentities(
  prisma,
  embedding,
  10,    // limit
  0.8    // threshold
);

console.log('Similar identities:', similar);
// Output: [{ id: 'identity-id', distance: 0.15 }, ...]

// Check embedding dimension
const dimension = await getEmbeddingDimension(prisma);
console.log('Embedding dimension:', dimension); // 1536
```

### Important Notes

- The vector helper functions use `$queryRawUnsafe` and `$executeRawUnsafe` for pgvector compatibility
- For production, consider updating to parameterized queries when Prisma adds native pgvector support
- Ensure the pgvector extension and HNSW index are created before using these functions

## 3. Configure Prometheus Metrics

### Add Metrics to Your Application

```typescript
import { metricsHandler } from '@aura-sign/trustmath/metrics';
import express from 'express';

const app = express();

// Expose /metrics endpoint
app.get('/metrics', metricsHandler);

app.listen(3000);
```

### Track Vector Search Performance

```typescript
import { trackVectorSearch, vectorSearchCounter } from '@aura-sign/trustmath/metrics';

const results = await trackVectorSearch(async () => {
  return await findSimilarIdentities(prisma, embedding, 10, 0.8);
});
```

### Deploy Prometheus

1. Update `infra/prometheus/prometheus.yml` with your service endpoints
2. Deploy Prometheus with the configuration:

```bash
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v $(pwd)/infra/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml \
  -v $(pwd)/infra/prometheus/alert.rules.yml:/etc/prometheus/alert.rules.yml \
  prom/prometheus
```

3. Access Prometheus UI at http://localhost:9090

### Available Metrics

- `vector_similarity_searches_total` - Counter of vector searches by status
- `vector_similarity_search_duration_ms` - Histogram of search latency
- `trustmath_computations_total` - Counter of trust computations by type
- `trustmath_computation_duration_ms` - Histogram of computation duration
- `trust_events_total` - Counter of trust events by context

### Alert Rules

The alert rules in `infra/prometheus/alert.rules.yml` include:

- **HighVectorSearchLatency**: Fires when 95th percentile latency > 1000ms
- **HighVectorSearchErrorRate**: Fires when error rate > 5%
- **LongTrustComputationDuration**: Fires when 95th percentile duration > 5000ms
- **ServiceDown**: Fires when a service is unreachable

## 4. Database Backups

### Configure Backup Script

Set environment variables for the backup script:

```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=aura_sign
export DB_USER=postgres
export DB_PASSWORD=secret
export BACKUP_DIR=/var/backups/aura-sign
export BACKUP_RETENTION_DAYS=7
```

### Backup to S3

```bash
export BACKUP_PROVIDER=s3
export S3_BUCKET=my-aura-sign-backups
export S3_PREFIX=production/backups

./scripts/db_backup.sh
```

### Backup to Google Cloud Storage

```bash
export BACKUP_PROVIDER=gcs
export GCS_BUCKET=my-aura-sign-backups
export GCS_PREFIX=production/backups

./scripts/db_backup.sh
```

### Schedule Automated Backups

Add to crontab for daily backups at 2 AM:

```bash
0 2 * * * /path/to/aura-sign-mvp/scripts/db_backup.sh >> /var/log/aura-sign-backup.log 2>&1
```

Or use systemd timer:

```ini
# /etc/systemd/system/aura-sign-backup.timer
[Unit]
Description=Daily Aura-Sign database backup

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
```

## 5. End-to-End Testing

### Install Playwright

```bash
cd apps/web
pnpm install
pnpm exec playwright install
```

### Run E2E Tests

```bash
cd apps/web
pnpm test:e2e
```

### Test Environment Variables

Set `BASE_URL` to test against a different environment:

```bash
BASE_URL=https://staging.example.com pnpm test:e2e
```

### CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
- name: Install Playwright Browsers
  run: pnpm --filter web exec playwright install --with-deps

- name: Run E2E tests
  run: pnpm --filter web test:e2e
  env:
    BASE_URL: http://localhost:3002
```

## 6. Monitoring and Operations

### View Metrics Dashboard

1. Navigate to Prometheus: http://localhost:9090
2. Query metrics: `vector_similarity_search_duration_ms`
3. View alert status: Status > Alerts

### Check Vector Search Performance

```promql
# 95th percentile vector search latency
histogram_quantile(0.95, 
  rate(vector_similarity_search_duration_ms_bucket[5m])
)

# Vector search throughput
rate(vector_similarity_searches_total[5m])
```

### Monitor Trust Computations

```promql
# Trust computation rate by type
rate(trustmath_computations_total[5m])

# Average trust computation duration
rate(trustmath_computation_duration_ms_sum[5m]) 
/ rate(trustmath_computation_duration_ms_count[5m])
```

### Backup Verification

```bash
# List recent backups
ls -lh /var/backups/aura-sign/

# Verify S3 backups
aws s3 ls s3://my-aura-sign-backups/production/backups/

# Verify GCS backups
gsutil ls gs://my-aura-sign-backups/production/backups/
```

## 7. Troubleshooting

### pgvector Extension Not Found

```bash
# Install pgvector extension (Ubuntu/Debian)
sudo apt-get install postgresql-14-pgvector

# Install pgvector extension (macOS)
brew install pgvector
```

### HNSW Index Creation Fails

Ensure you have sufficient memory and the pgvector extension is properly installed:

```sql
-- Check extension version
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check index status
SELECT * FROM pg_indexes WHERE tablename = 'Identity';
```

### Metrics Endpoint Returns 500

Check that Prometheus client is properly initialized and the registry is accessible:

```typescript
import { register } from '@aura-sign/trustmath/metrics';

// Verify metrics are registered
console.log(await register.metrics());
```

### Backup Script Fails

- Verify database credentials are correct
- Ensure `pg_dump` is in PATH
- Check cloud provider CLI tools (aws/gsutil) are installed and authenticated
- Verify bucket permissions for uploads

## Support

For issues or questions:
- Check existing GitHub issues
- Review alert rules in `infra/prometheus/alert.rules.yml`
- Examine application logs for error details
- Verify pgvector extension and HNSW index are properly configured
