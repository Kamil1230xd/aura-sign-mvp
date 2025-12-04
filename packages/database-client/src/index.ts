/**
 * @aura-sign/database-client
 * 
 * Database client package with vector similarity support
 */

// Re-export vector helper functions
export {
  validateEmbedding,
  upsertIdentityEmbedding,
  findSimilarIdentities,
  getEmbeddingDimension,
} from './vector';
