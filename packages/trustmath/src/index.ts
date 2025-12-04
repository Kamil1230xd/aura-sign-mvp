/**
 * @aura-sign/trustmath
 * 
 * Trust mathematics and metrics package
 */

// Re-export metrics and registry
export {
  register,
  vectorSearchCounter,
  vectorSearchLatencyHistogram,
  trustComputationCounter,
  trustComputationDurationHistogram,
  trustEventCounter,
  metricsHandler,
  trackVectorSearch,
  trackTrustComputation,
} from './metrics';
