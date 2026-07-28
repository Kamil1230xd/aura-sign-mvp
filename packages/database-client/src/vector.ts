/**
 * Vector search helpers for pgvector integration
 * Requires pgvector extension to be installed and configured in PostgreSQL
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Validates that an embedding is a valid array of numbers
 * @param embedding - The embedding vector to validate
 * @returns true if valid, throws error otherwise
 */
export function validateEmbedding(embedding: number[]): boolean {
  if (!Array.isArray(embedding)) {
    throw new Error('Embedding must be an array');
  }

  if (embedding.length === 0) {
    throw new Error('Embedding cannot be empty');
  }

  if (!embedding.every((val) => typeof val === 'number' && !isNaN(val))) {
    throw new Error('Embedding must contain only valid numbers');
  }

  return true;
}

/**
 * Converts a number array to PostgreSQL vector format
 * @param embedding - The embedding vector
 * @returns PostgreSQL vector string representation
 */
function embeddingToVector(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

/**
 * Find similar identities using pgvector cosine distance operator (<->)
 * Uses Prisma raw query to access pgvector functionality
 *
 * @param embedding - The query embedding vector
 * @param k - Number of similar results to return (default: 10)
 * @returns Array of similar identities with their distances
 */
export async function findSimilarIdentities(
  embedding: number[],
  k: number = 10
): Promise<Array<{ address: string; distance: number }>> {
  validateEmbedding(embedding);

  const vectorStr = embeddingToVector(embedding);

  // Using $queryRawUnsafe to access pgvector <-> operator
  // This calculates cosine distance between vectors
  const results = (await prisma.$queryRawUnsafe(
    `SELECT address, ai_embedding <-> $1::vector as distance
     FROM identity
     WHERE ai_embedding IS NOT NULL
     ORDER BY ai_embedding <-> $1::vector
     LIMIT $2`,
    vectorStr,
    k
  )) as Array<{ address: string; distance: number }>;

  return results;
}

/**
 * Upsert (insert or update) an identity embedding
 *
 * @param address - The identity address (primary key)
 * @param embedding - The embedding vector to store
 * @returns The upserted identity record
 */
export async function upsertIdentityEmbedding(
  address: string,
  embedding: number[]
): Promise<{ address: string }> {
  validateEmbedding(embedding);

  const vectorStr = embeddingToVector(embedding);

  // Using $queryRawUnsafe to handle vector type
  await prisma.$queryRawUnsafe(
    `INSERT INTO identity (address, ai_embedding)
     VALUES ($1, $2::vector)
     ON CONFLICT (address)
     DO UPDATE SET ai_embedding = $2::vector`,
    address,
    vectorStr
  );

  return { address };
}

/**
 * Export the prisma client for use in other modules
 */
export { prisma };
