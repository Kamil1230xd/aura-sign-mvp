-- pgvector HNSW index initialization
-- 
-- This file creates the HNSW (Hierarchical Navigable Small World) index
-- on the Identity.embedding column for efficient vector similarity search.
--
-- Prerequisites:
-- - PostgreSQL 14+ with pgvector extension installed
-- - Identity table must exist with embedding column of type vector
--
-- HNSW Parameters:
-- - m: Maximum number of connections per layer (default: 16)
--   Higher values = better recall but more memory usage
-- - ef_construction: Size of dynamic candidate list during index build (default: 64)
--   Higher values = better index quality but slower build time
--
-- Performance Notes:
-- - HNSW is optimized for approximate nearest neighbor search
-- - Provides sub-linear search time complexity
-- - Index build time is O(n * log(n)) where n is number of vectors
-- - Recommended for datasets with 1000+ embeddings

-- Ensure pgvector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create HNSW index on embedding column using cosine distance operator
-- The vector_cosine_ops operator class uses <-> for cosine distance
CREATE INDEX IF NOT EXISTS identity_embedding_hnsw_idx 
ON "Identity" USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Optional: Create additional index for L2 (Euclidean) distance if needed
-- Uncomment the following lines to enable L2 distance search
-- CREATE INDEX IF NOT EXISTS identity_embedding_hnsw_l2_idx 
-- ON "Identity" USING hnsw (embedding vector_l2_ops)
-- WITH (m = 16, ef_construction = 64);

-- Optional: Create index for inner product distance if needed
-- Uncomment the following lines to enable inner product search
-- CREATE INDEX IF NOT EXISTS identity_embedding_hnsw_ip_idx 
-- ON "Identity" USING hnsw (embedding vector_ip_ops)
-- WITH (m = 16, ef_construction = 64);

-- Verify index creation
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'Identity' AND indexname LIKE '%embedding%';
