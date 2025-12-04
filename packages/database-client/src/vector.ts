/**
 * Vector similarity helper functions for pgvector integration.
 * Provides embedding validation, upsert, and similarity search using pgvector <-> distance operator.
 */

import { PrismaClient } from '@prisma/client';

/**
 * Validates that an embedding is a valid array of numbers
 */
export function validateEmbedding(embedding: unknown): embedding is number[] {
  if (!Array.isArray(embedding)) {
    return false;
  }
  if (embedding.length === 0) {
    return false;
  }
  return embedding.every((val) => typeof val === 'number' && !isNaN(val) && isFinite(val));
}

/**
 * Upserts an identity embedding into the pgvector column.
 * Uses raw SQL for vector casting as Prisma doesn't natively support pgvector.
 * 
 * @param prisma - Prisma client instance
 * @param identityId - Identity ID to associate with the embedding
 * @param embedding - Embedding vector as array of numbers
 * @throws Error if embedding validation fails
 */
export async function upsertIdentityEmbedding(
  prisma: PrismaClient,
  identityId: string,
  embedding: number[]
): Promise<void> {
  if (!validateEmbedding(embedding)) {
    throw new Error('Invalid embedding: must be a non-empty array of finite numbers');
  }

  // Convert embedding array to PostgreSQL vector format
  const vectorStr = `[${embedding.join(',')}]`;

  // Use raw query for vector upsert
  await prisma.$executeRawUnsafe(
    `
    INSERT INTO "Identity" (id, embedding, "updatedAt")
    VALUES ($1, $2::vector, NOW())
    ON CONFLICT (id)
    DO UPDATE SET embedding = $2::vector, "updatedAt" = NOW()
    `,
    identityId,
    vectorStr
  );
}

/**
 * Finds similar identities using pgvector cosine distance (<-> operator).
 * 
 * @param prisma - Prisma client instance
 * @param queryEmbedding - Query embedding vector
 * @param limit - Maximum number of results to return (default: 10)
 * @param threshold - Maximum distance threshold (default: 1.0)
 * @returns Array of similar identities with their distances
 * @throws Error if embedding validation fails
 */
export async function findSimilarIdentities(
  prisma: PrismaClient,
  queryEmbedding: number[],
  limit: number = 10,
  threshold: number = 1.0
): Promise<Array<{ id: string; distance: number }>> {
  if (!validateEmbedding(queryEmbedding)) {
    throw new Error('Invalid query embedding: must be a non-empty array of finite numbers');
  }

  if (limit <= 0 || !Number.isInteger(limit)) {
    throw new Error('Invalid limit: must be a positive integer');
  }

  if (threshold <= 0 || !isFinite(threshold)) {
    throw new Error('Invalid threshold: must be a positive finite number');
  }

  const vectorStr = `[${queryEmbedding.join(',')}]`;

  // Use raw query for vector similarity search with <-> operator
  const results = await prisma.$queryRawUnsafe<Array<{ id: string; distance: number }>>(
    `
    SELECT id, (embedding <-> $1::vector) as distance
    FROM "Identity"
    WHERE embedding IS NOT NULL
      AND (embedding <-> $1::vector) < $2
    ORDER BY embedding <-> $1::vector
    LIMIT $3
    `,
    vectorStr,
    threshold,
    limit
  );

  return results;
}

/**
 * Gets the dimensionality of stored embeddings in the database.
 * Useful for validation and debugging.
 * 
 * @param prisma - Prisma client instance
 * @returns The dimension of embeddings or null if no embeddings exist
 */
export async function getEmbeddingDimension(prisma: PrismaClient): Promise<number | null> {
  const result = await prisma.$queryRawUnsafe<Array<{ dim: number | null }>>(
    `
    SELECT vector_dims(embedding) as dim
    FROM "Identity"
    WHERE embedding IS NOT NULL
    LIMIT 1
    `
  );

  return result.length > 0 ? result[0].dim : null;
}
