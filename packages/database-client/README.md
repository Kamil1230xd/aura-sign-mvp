# @aura-sign/database-client

Database client package with vector similarity support using pgvector.

## Features

- Vector embedding validation
- Identity embedding upsert with pgvector
- Similarity search using cosine distance
- Input validation and error handling

## Installation

```bash
pnpm add @aura-sign/database-client
```

## Prerequisites

- PostgreSQL 14+ with pgvector extension
- HNSW index created (see `db/init/02_pgvector_hnsw.sql`)
- Prisma schema integrated (see `schema_extra.prisma`)

## Usage

```typescript
import { PrismaClient } from '@prisma/client';
import { 
  upsertIdentityEmbedding, 
  findSimilarIdentities 
} from '@aura-sign/database-client';

const prisma = new PrismaClient();

// Store an embedding
const embedding = Array.from({ length: 1536 }, () => Math.random());
await upsertIdentityEmbedding(prisma, 'identity-123', embedding);

// Find similar identities
const results = await findSimilarIdentities(prisma, embedding, 10, 0.8);
console.log(results); // [{ id: '...', distance: 0.15 }, ...]
```

## API Reference

### validateEmbedding(embedding: unknown): boolean

Validates that an embedding is a valid array of finite numbers.

### upsertIdentityEmbedding(prisma, identityId, embedding): Promise<void>

Upserts an identity embedding into the pgvector column.

### findSimilarIdentities(prisma, queryEmbedding, limit?, threshold?): Promise<Array>

Finds similar identities using pgvector cosine distance.

### getEmbeddingDimension(prisma): Promise<number | null>

Gets the dimensionality of stored embeddings.

## Schema Integration

Maintainers should integrate `schema_extra.prisma` into the main Prisma schema:

```prisma
model Identity {
  id        String   @id @default(uuid())
  embedding Unsupported("vector(1536)")?
  // ... other fields
}
```

Then run:
```bash
pnpm prisma generate
pnpm prisma migrate dev
```

## Notes

- Uses `$queryRawUnsafe` / `$executeRawUnsafe` for pgvector compatibility
- Consider parameterized queries when Prisma adds native pgvector support
- Ensure HNSW index is created for optimal performance
