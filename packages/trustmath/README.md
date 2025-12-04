# @aura-sign/trustmath

Trust mathematics and Prometheus metrics package for Aura-Sign.

## Features

- Prometheus metrics registry with default metrics
- Custom metrics for vector search and trust computations
- HTTP handler for `/metrics` endpoint
- Helper functions to track operations automatically

## Installation

```bash
pnpm add @aura-sign/trustmath
```

## Usage

### Expose Metrics Endpoint

With Express:

```typescript
import express from 'express';
import { metricsHandler } from '@aura-sign/trustmath';

const app = express();
app.get('/metrics', metricsHandler);
app.listen(3000);
```

With Node.js http:

```typescript
import http from 'http';
import { metricsHandler } from '@aura-sign/trustmath';

const server = http.createServer((req, res) => {
  if (req.url === '/metrics') {
    metricsHandler(req, res);
  }
});
server.listen(3000);
```

### Track Vector Search

```typescript
import { trackVectorSearch } from '@aura-sign/trustmath';

const results = await trackVectorSearch(async () => {
  return await findSimilarIdentities(prisma, embedding);
});
```

### Track Trust Computation

```typescript
import { trackTrustComputation } from '@aura-sign/trustmath';

const score = await trackTrustComputation('pagerank', async () => {
  return await computeTrustScore(identityId);
});
```

### Manual Metric Updates

```typescript
import { 
  vectorSearchCounter, 
  trustEventCounter 
} from '@aura-sign/trustmath';

// Increment counters
vectorSearchCounter.inc({ status: 'success' });
trustEventCounter.inc({ context: 'follow' });
```

## Available Metrics

### Counters

- `vector_similarity_searches_total{status}` - Total vector searches
- `trustmath_computations_total{type}` - Total trust computations
- `trust_events_total{context}` - Total trust events created

### Histograms

- `vector_similarity_search_duration_ms{status}` - Vector search latency
- `trustmath_computation_duration_ms{type}` - Trust computation duration

### Default Metrics

- Process CPU usage
- Process memory usage
- Node.js event loop lag
- And more from `prom-client`

## Prometheus Configuration

See `infra/prometheus/prometheus.yml` for scrape configuration and `infra/prometheus/alert.rules.yml` for alert rules.

## Alert Rules

The package includes predefined alert rules for:

- High vector search latency (>1000ms p95)
- High error rates (>5%)
- Long trust computation duration (>5000ms p95)
- Service health monitoring
