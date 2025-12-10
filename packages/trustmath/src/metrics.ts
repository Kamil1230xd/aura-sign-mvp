// License: BSL 1.1. Commercial use prohibited. See .github/LICENSES/LICENSE_CORE.md
/**
 * Prometheus metrics for Trustmath operations
 * Provides custom metrics and HTTP handler for metrics endpoint
 */

import { Registry, Counter, Histogram, collectDefaultMetrics } from 'prom-client';

/**
 * Create a new Prometheus registry
 * This allows isolation of metrics if needed
 */
export const register = new Registry();

/**
 * Enable default metrics collection (CPU, memory, event loop, etc.)
 * Metrics are collected every 10 seconds by default
 */
collectDefaultMetrics({ register });

/**
 * Counter for total trustmath runs
 * Tracks the number of times trust calculations are performed
 */
export const trustmathRunsTotal = new Counter({
  name: 'trustmath_runs_total',
  help: 'Total number of trustmath calculation runs',
  labelNames: ['status', 'type'],
  registers: [register],
});

/**
 * Histogram for trustmath run duration
 * Tracks how long trust calculations take to complete
 * Buckets are in seconds: 0.1s, 0.5s, 1s, 2s, 5s, 10s, 30s, 60s
 */
export const trustmathRunDuration = new Histogram({
  name: 'trustmath_run_duration_seconds',
  help: 'Duration of trustmath calculation runs in seconds',
  labelNames: ['type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [register],
});

/**
 * Histogram for vector search latency
 * Tracks how long vector similarity searches take
 * Buckets are in seconds: 0.01s, 0.05s, 0.1s, 0.25s, 0.5s, 1s, 2.5s, 5s
 */
export const vectorSearchLatency = new Histogram({
  name: 'vector_search_latency_seconds',
  help: 'Latency of vector similarity search operations in seconds',
  labelNames: ['operation', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

/**
 * HTTP handler for metrics endpoint
 * Returns Prometheus-formatted metrics
 *
 * Usage with Express:
 *   app.get('/metrics', metricsHandler);
 *
 * Usage with native HTTP:
 *   if (req.url === '/metrics') {
 *     return metricsHandler(req, res);
 *   }
 *
 * @param req - HTTP request object
 * @param res - HTTP response object
 */
export async function metricsHandler(req: any, res: any): Promise<void> {
  try {
    res.setHeader('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.statusCode = 500;
    res.end('Error collecting metrics');
  }
}

/**
 * Example usage of metrics:
 *
 * // Increment counter
 * trustmathRunsTotal.inc({ status: 'success', type: 'reputation' });
 *
 * // Track duration with timer
 * const end = trustmathRunDuration.startTimer({ type: 'reputation' });
 * // ... perform calculation ...
 * end();
 *
 * // Track duration manually
 * const start = Date.now();
 * // ... perform vector search ...
 * const duration = (Date.now() - start) / 1000;
 * vectorSearchLatency.observe({ operation: 'similarity', status: 'success' }, duration);
 */
