# Prisma Database Setup

This directory contains Prisma schema and seed scripts for the Aura-Sign MVP database.

## Schema

The `schema.prisma` file defines two main models:

- **identity**: Ethereum addresses with AI embeddings for similarity search
- **trust_event**: Trust relationships between addresses with trust scores

## Prerequisites

1. PostgreSQL 16 with pgvector extension
2. Environment variable `DATABASE_URL` configured

## Setup

### 1. Start Infrastructure

Start PostgreSQL using Docker Compose from the repository root:

```bash
docker-compose up -d postgres
```

### 2. Generate Prisma Client

```bash
cd packages/database-client
npx prisma generate
```

### 3. Run Migrations

Create the database tables:

```bash
npx prisma migrate dev --name init
```

### 4. Seed Database

Populate the database with initial test data:

```bash
pnpm prisma:seed
```

## Commands

- `npx prisma generate` - Generate Prisma Client
- `npx prisma migrate dev` - Create and apply migrations (development)
- `npx prisma migrate deploy` - Apply migrations (production)
- `npx prisma studio` - Open Prisma Studio to view/edit data
- `pnpm prisma:seed` - Run seed script

## Database URL

Set the `DATABASE_URL` environment variable in `.env`:

```
DATABASE_URL=postgresql://aura_user:aura_pass@localhost:5432/aura
```

The credentials above match the docker-compose.yml configuration.
