# Operational Quickstart Guide

This guide provides instructions for deploying and operating the Aura Sign MVP with operational tooling, metrics, and vector search capabilities.

## Prerequisites

- PostgreSQL 14+ with pgvector extension
- Node.js 18+ and pnpm
- Docker (optional, for Prometheus)
- AWS CLI or gcloud (optional, for backups)

## 1. Database Initialization

### Install pgvector Extension

Connect to your PostgreSQL database and enable the pgvector extension:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Configure HNSW Index

For optimal vector search performance, you should create HNSW (Hierarchical Navigable Small World) indexes on the `ai_embedding` columns. Add this to your database initialization script (e.g., `db/init/02_pgvector_hnsw.sql`):

```sql
-- Configure HNSW parameters for better performance
ALTER DATABASE your_database SET hnsw.ef_search = 100;

-- Create HNSW index on identity table
CREATE INDEX IF NOT EXISTS identity_ai_embedding_idx
ON identity USING hnsw (ai_embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Create HNSW index on trust_event table
CREATE INDEX IF NOT EXISTS trust_event_ai_embedding_idx
ON trust_event USING hnsw (ai_embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

**Note**: If HNSW is not available in your pgvector version, you can use IVFFlat instead:

```sql
CREATE INDEX IF NOT EXISTS identity_ai_embedding_idx
ON identity USING ivfflat (ai_embedding vector_cosine_ops)
WITH (lists = 100);
```

## 2. Prisma Schema Integration

### Integrate schema_extra.prisma

The `packages/database-client/schema_extra.prisma` file contains Prisma model snippets for identity and trust_event tables with vector support. Integrate these into your canonical `schema.prisma` file:

```prisma
// Add to your main schema.prisma
model identity {
  address       String   @id
  ai_embedding  Unsupported("vector(1536)")?
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  @@index([ai_embedding], type: Ivfflat)
}

model trust_event {
  id            String   @id @default(uuid())
  from_address  String
  to_address    String
  trust_score   Float
  ai_embedding  Unsupported("vector(1536)")?
  event_type    String
  created_at    DateTime @default(now())

  @@index([from_address])
  @@index([to_address])
  @@index([ai_embedding], type: Ivfflat)
}
```

### Generate Prisma Client

After integrating the schema:

```bash
cd packages/database-client
pnpm install
npx prisma generate
npx prisma migrate dev --name add_vector_support
```

## 3. Vector Helper Usage

### Import and Use Vector Functions

```typescript
import {
  findSimilarIdentities,
  upsertIdentityEmbedding,
  validateEmbedding,
} from '@aura-sign/database-client/dist/vector';

// Store an embedding for an identity
await upsertIdentityEmbedding(
  '0x1234...',
  embeddingArray // Array of 1536 numbers
);

// Find similar identities
const similar = await findSimilarIdentities(
  queryEmbedding, // Array of 1536 numbers
  10 // Return top 10 results
);

// Results format:
// [
//   { address: '0x...', distance: 0.123 },
//   { address: '0x...', distance: 0.156 },
//   ...
// ]
```

**Important Notes**:

- The vector helper uses Prisma's `$queryRawUnsafe` to access pgvector's `<->` (cosine distance) operator
- Embedding validation is performed automatically
- Ensure pgvector extension is installed before using these functions
- Lower distance values indicate higher similarity

## 4. Metrics Setup

### Expose /metrics Endpoint

In your API server (e.g., Express):

```typescript
import { metricsHandler } from '@aura-sign/trustmath/dist/metrics';

app.get('/metrics', metricsHandler);
```

For native HTTP server:

```typescript
import { metricsHandler } from '@aura-sign/trustmath/dist/metrics';
import http from 'http';

const server = http.createServer(async (req, res) => {
  if (req.url === '/metrics') {
    return metricsHandler(req, res);
  }
  // ... other routes
});
```

### Use Custom Metrics

```typescript
import {
  trustmathRunsTotal,
  trustmathRunDuration,
  vectorSearchLatency,
} from '@aura-sign/trustmath/dist/metrics';

// Track trustmath runs
trustmathRunsTotal.inc({ status: 'success', type: 'reputation' });

// Track duration with timer
const end = trustmathRunDuration.startTimer({ type: 'reputation' });
// ... perform calculation ...
end();

// Track vector search latency
const start = Date.now();
const results = await findSimilarIdentities(embedding, 10);
const duration = (Date.now() - start) / 1000;
vectorSearchLatency.observe(
  {
    operation: 'similarity',
    status: 'success',
  },
  duration
);
```

## 5. Prometheus Configuration

### Using Docker Compose

Create a `docker-compose.yml` for Prometheus:

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - '9090:9090'
    volumes:
      - ./infra/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./infra/prometheus/alert.rules.yml:/etc/prometheus/alert.rules.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

volumes:
  prometheus-data:
```

Start Prometheus:

```bash
docker-compose up -d prometheus
```

### Configure Target Hosts

Edit `infra/prometheus/prometheus.yml` to match your deployment:

```yaml
scrape_configs:
  - job_name: 'aura_api'
    static_configs:
      - targets: ['your-api-host:3000']

  - job_name: 'trustmath_worker'
    static_configs:
      - targets: ['your-worker-host:3001']
```

### Access Prometheus UI

Open http://localhost:9090 to access the Prometheus UI and verify targets are being scraped.

## 6. Database Backups

### Configure Backup Script

Set environment variables for the backup script:

```bash
export PGHOST=localhost
export PGPORT=5432
export PGUSER=postgres
export PGPASSWORD=your_password
export PGDATABASE=aura_sign
```

### Run Manual Backup

```bash
./scripts/db_backup.sh
```

### Upload to S3

```bash
export BACKUP_S3_BUCKET=my-backups
export BACKUP_S3_PREFIX=database/backups
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
export AWS_DEFAULT_REGION=us-east-1

./scripts/db_backup.sh
```

### Upload to Google Cloud Storage

```bash
export BACKUP_GCS_BUCKET=my-backups
export BACKUP_GCS_PREFIX=database/backups
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

./scripts/db_backup.sh
```

### Automate with Cron

Add to crontab for daily backups at 2 AM:

```bash
0 2 * * * cd /path/to/aura-sign-mvp && ./scripts/db_backup.sh >> /var/log/db_backup.log 2>&1
```

## 7. Running E2E Tests

### Install Playwright

```bash
cd apps/web
pnpm install @playwright/test
npx playwright install
```

### Run Tests

```bash
# Set API base URL if not using default
export API_BASE_URL=http://localhost:3000

# Run the similarity endpoint test
pnpm --filter web test:e2e

# Or run with Playwright directly
cd apps/web
npx playwright test tests/similarity.spec.ts
```

### View Test Results

```bash
npx playwright show-report
```

## 8. Monitoring and Alerts

### View Metrics

Access these URLs to view metrics:

- API metrics: http://your-api-host:3000/metrics
- Worker metrics: http://your-worker-host:3001/metrics
- Prometheus UI: http://localhost:9090

### Check Alert Rules

In Prometheus UI:

1. Go to "Alerts" tab
2. View configured alerts from `alert.rules.yml`:
   - HighVectorSearchLatency
   - TrustmathRunDurationHigh
   - ServiceDown
   - HighMemoryUsage

### Configure Alertmanager (Optional)

To receive notifications when alerts fire:

1. Deploy Alertmanager
2. Configure receivers (email, Slack, PagerDuty, etc.)
3. Update `prometheus.yml` to point to Alertmanager

## 9. Troubleshooting

### pgvector Extension Not Found

```bash
# Install pgvector
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install

# Then in PostgreSQL:
CREATE EXTENSION vector;
```

### Metrics Endpoint Returns 404

Ensure:

1. The metrics handler is properly registered in your server
2. The server is listening on the correct port
3. Prometheus can reach the endpoint (check firewall rules)

### Vector Search is Slow

1. Ensure HNSW or IVFFlat index is created
2. Check index parameters (m, ef_construction for HNSW)
3. Monitor `vector_search_latency_seconds` metric
4. Consider increasing `hnsw.ef_search` setting

### Backup Script Fails

1. Check PostgreSQL connection parameters
2. Verify pg_dump is installed and in PATH
3. Ensure sufficient disk space in BACKUP_DIR
4. For cloud uploads, verify credentials are correct

## 10. Production Deployment Checklist

- [ ] pgvector extension installed and configured
- [ ] HNSW indexes created on ai_embedding columns
- [ ] Prisma schema integrated and migrations applied
- [ ] Metrics endpoints exposed on API and worker
- [ ] Prometheus configured and scraping targets
- [ ] Alert rules configured in Prometheus
- [ ] Backup script tested and scheduled with cron
- [ ] E2E tests passing
- [ ] Monitoring dashboards created (Grafana recommended)
- [ ] Log aggregation configured
- [ ] Security: Metrics endpoints behind authentication (recommended)
- [ ] Security: Backup encryption enabled for sensitive data

## Additional Resources

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Prometheus Documentation](https://prometheus.io/docs)
- [Playwright Documentation](https://playwright.dev)
