/**
 * Prometheus metrics registry and custom metrics for TrustMath operations.
 * Exports HTTP handler to expose /metrics endpoint.
 */

import { Registry, Counter, Histogram, collectDefaultMetrics } from 'prom-client';

/**
 * Global Prometheus registry
 */
export const register = new Registry();

// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics({ register });

/**
 * Counter for total vector similarity searches performed
 */
export const vectorSearchCounter = new Counter({
  name: 'vector_similarity_searches_total',
  help: 'Total number of vector similarity searches performed',
  labelNames: ['status'],
  registers: [register],
});

/**
 * Histogram for vector search latency in milliseconds
 */
export const vectorSearchLatencyHistogram = new Histogram({
  name: 'vector_similarity_search_duration_ms',
  help: 'Duration of vector similarity searches in milliseconds',
  labelNames: ['status'],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
  registers: [register],
});

/**
 * Counter for total trust computations performed
 */
export const trustComputationCounter = new Counter({
  name: 'trustmath_computations_total',
  help: 'Total number of trust computations performed',
  labelNames: ['type'],
  registers: [register],
});

/**
 * Histogram for trust computation duration in milliseconds
 */
export const trustComputationDurationHistogram = new Histogram({
  name: 'trustmath_computation_duration_ms',
  help: 'Duration of trust computations in milliseconds',
  labelNames: ['type'],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000, 10000],
  registers: [register],
});

/**
 * Counter for trust events created
 */
export const trustEventCounter = new Counter({
  name: 'trust_events_total',
  help: 'Total number of trust events created',
  labelNames: ['context'],
  registers: [register],
});

/**
 * HTTP handler for Prometheus metrics endpoint.
 * Use this in your HTTP server to expose /metrics.
 * 
 * Example usage with Node.js http:
 * ```typescript
 * import http from 'http';
 * import { metricsHandler } from '@aura-sign/trustmath/metrics';
 * 
 * const server = http.createServer((req, res) => {
 *   if (req.url === '/metrics') {
 *     metricsHandler(req, res);
 *   } else {
 *     res.writeHead(404);
 *     res.end();
 *   }
 * });
 * ```
 * 
 * Example usage with Express:
 * ```typescript
 * import express from 'express';
 * import { metricsHandler } from '@aura-sign/trustmath/metrics';
 * 
 * const app = express();
 * app.get('/metrics', metricsHandler);
 * ```
 */
export async function metricsHandler(req: any, res: any): Promise<void> {
  try {
    res.setHeader('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (err) {
    res.statusCode = 500;
    res.end(err instanceof Error ? err.message : 'Unknown error');
  }
}

/**
 * Helper to track vector search metrics automatically
 */
export async function trackVectorSearch<T>(
  searchFn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  let status = 'success';
  
  try {
    const result = await searchFn();
    return result;
  } catch (error) {
    status = 'error';
    throw error;
  } finally {
    const duration = Date.now() - start;
    vectorSearchCounter.inc({ status });
    vectorSearchLatencyHistogram.observe({ status }, duration);
  }
}

/**
 * Helper to track trust computation metrics automatically
 */
export async function trackTrustComputation<T>(
  type: string,
  computeFn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  
  try {
    const result = await computeFn();
    trustComputationCounter.inc({ type });
    return result;
  } finally {
    const duration = Date.now() - start;
    trustComputationDurationHistogram.observe({ type }, duration);
  }
}
