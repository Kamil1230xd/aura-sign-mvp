# Developer Guide

This guide provides comprehensive instructions for developers working on the Aura-Sign MVP project.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Development Workflow](#development-workflow)
4. [Package Structure](#package-structure)
5. [Running the Application](#running-the-application)
6. [Database Setup](#database-setup)
7. [Testing](#testing)
8. [Building](#building)
9. [Common Tasks](#common-tasks)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 20.x or higher

  ```bash
  node --version  # Should be v20.x.x or higher
  ```

- **pnpm**: Version 8.15.0 (project uses exact version)

  ```bash
  npm install -g pnpm@8.15.0
  pnpm --version  # Should be 8.15.0
  ```

- **Git**: For version control

  ```bash
  git --version
  ```

- **Docker** (optional): For running infrastructure services
  ```bash
  docker --version
  docker-compose --version
  ```

---

## Initial Setup

### Option A: Automated Bootstrap (Recommended)

Use the bootstrap script for a guided setup experience:

```bash
git clone https://github.com/Kamil1230xd/aura-sign-mvp.git
cd aura-sign-mvp
./scripts/bootstrap_local_dev.sh
```

This script will:

- Check for pnpm installation
- Backup existing `.env.local` if present
- Auto-generate secure secrets and create `.env.local` with sane defaults
- Start Docker services (PostgreSQL, Redis, MinIO) and wait for Postgres readiness
- Install dependencies
- Generate Prisma client
- Run database migrations
- Seed the database

### Option B: Manual Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Kamil1230xd/aura-sign-mvp.git
cd aura-sign-mvp
```

### 2. Install Dependencies

The project uses pnpm workspaces. Install all dependencies from the root:

```bash
pnpm install
```

This will install dependencies for all packages and apps in the monorepo.

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and configure the required variables:

**DO NOT use example values from `.env.example` in production.** All placeholder values must be replaced with secure, randomly generated credentials.

See `.env.example` for the complete list of configuration options with detailed comments.

**Security Note**: Never commit your `.env` or `.env.local` files. The `.gitignore` is configured to exclude them.

### 4. Generate Secure Secrets

All secrets should be generated using cryptographically secure random generators:

```bash
# Generate strong random secrets (recommended method)
openssl rand -base64 32

# Example: Generate all required secrets at once
echo "SESSION_SECRET=$(openssl rand -base64 32)"
echo "IRON_SESSION_PASSWORD=$(openssl rand -base64 32)"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)"
echo "MINIO_ROOT_PASSWORD=$(openssl rand -base64 32)"
```

**Minimum secret requirements:**

- `SESSION_SECRET`: 32+ characters (base64 encoded)
- `IRON_SESSION_PASSWORD`: 32+ characters (base64 encoded)
- Database passwords: 32+ characters for production
- MinIO passwords: 8+ characters (32+ recommended for production)

---

## Development Workflow

### Starting Development Mode

Start all packages and apps in development mode:

```bash
pnpm dev
```

This runs all workspaces in parallel with hot-reload enabled.

### Start Specific Package/App

To run only a specific package or app:

```bash
# Run only the demo site
pnpm --filter demo-site dev

# Run a specific package
pnpm --filter @aura-sign/client dev
```

### Type Checking

Run TypeScript type checking across all packages:

```bash
pnpm type-check
```

Or for a specific package:

```bash
pnpm --filter @aura-sign/client type-check
```

### Linting

Run linters across all packages:

```bash
pnpm lint
```

Fix linting issues automatically where possible:

```bash
# Fix lint issues across all packages
pnpm -r lint -- --fix

# Or fix for a specific package
pnpm --filter demo-site lint -- --fix
```

---

## Package Structure

The monorepo is organized into packages and apps:

### Packages (`/packages`)

#### @aura-sign/client (`packages/client-ts`)

- TypeScript client SDK for Aura-Sign operations
- Core functionality for signature operations
- Utilities for working with Ethereum wallets

**Key Files**:

- `src/index.ts` - Main entry point
- `src/types.ts` - TypeScript type definitions

**Development**:

```bash
cd packages/client-ts
pnpm dev          # Watch mode
pnpm build        # Production build
pnpm type-check   # Type checking
```

#### @aura-sign/next-auth (`packages/next-auth`)

- SIWE (Sign-In with Ethereum) authentication handler
- Iron-session integration for secure sessions
- Session management utilities

**Key Files**:

- `src/index.ts` - Authentication handlers
- `src/session.ts` - Session configuration

**Development**:

```bash
cd packages/next-auth
pnpm dev
pnpm build
```

#### @aura-sign/react (`packages/react`)

- React components and hooks for Aura-Sign
- UI components for wallet connection
- Custom hooks for authentication state

**Key Files**:

- `src/components/` - React components
- `src/hooks/` - Custom React hooks

**Development**:

```bash
cd packages/react
pnpm dev
pnpm build
```

#### @aura-sign/database-client (`packages/database-client`)

- Database client for vector operations
- Prisma schema and migrations
- Vector similarity search utilities

**Key Files**:

- `schema_extra.prisma` - Vector support schema
- `src/vector.ts` - Vector operations

**Development**:

```bash
cd packages/database-client
pnpm build
npx prisma generate
```

#### @aura-sign/trustmath (`packages/trustmath`)

- Trust score calculations
- Metrics and monitoring utilities
- Prometheus metrics exposition

**Key Files**:

- `src/metrics.ts` - Metrics definitions

**Development**:

```bash
cd packages/trustmath
pnpm dev
pnpm build
```

### Apps (`/apps`)

#### demo-site (`apps/demo-site`)

- Next.js demonstration application
- Shows SIWE authentication flow
- Example usage of all packages

**Key Files**:

- `pages/` - Next.js pages
- `styles/` - Global styles with Tailwind CSS

**Development**:

```bash
cd apps/demo-site
pnpm dev          # Starts on http://localhost:3001
pnpm build        # Production build
pnpm start        # Production server
```

#### web (`apps/web`)

- Web application with operational tooling
- E2E testing with Playwright
- Vector similarity endpoint testing

**Development**:

```bash
cd apps/web
pnpm dev
pnpm test:e2e     # Run E2E tests
```

---

## Running the Application

### Option 1: Run Everything

Start all services in development mode:

```bash
pnpm dev
```

This starts:

- All package builds in watch mode
- Demo site on http://localhost:3001

### Option 2: Run Demo Site Only

```bash
pnpm demo
```

This is an alias for:

```bash
pnpm --filter demo-site dev
```

### Option 3: Production Build

Build all packages and run in production mode:

```bash
# Build everything
pnpm build

# Start demo site in production
pnpm --filter demo-site start
```

---

## Database Setup

### Using Docker Compose (Recommended for Development)

If your application uses PostgreSQL, MinIO, or Redis, you can run them via Docker Compose.

A `docker-compose.yml` exists in the root. It uses environment variables for credentials:

```yaml
version: '3.8'

# For local development, set these environment variables in .env or .env.local
# Required variables:
#   POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
#   MINIO_ROOT_USER, MINIO_ROOT_PASSWORD

services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set}
      POSTGRES_DB: ${POSTGRES_DB:-aura}
    ports:
      - '5432:5432'
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis-data:/data

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:?MINIO_ROOT_PASSWORD must be set}
    ports:
      - '9000:9000'
      - '9001:9001'
    volumes:
      - minio-data:/data

volumes:
  postgres-data:
  redis-data:
  minio-data:
```

Start services:

```bash
docker-compose up -d
```

### Database Migrations

If using Prisma:

```bash
cd packages/database-client

# Generate Prisma client
npx prisma generate

# Run migrations (development)
npx prisma migrate dev

# Apply migrations (production)
npx prisma migrate deploy
```

### Vector Extension (pgvector)

If using vector operations, ensure pgvector extension is enabled:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

See `docs/ops/quickstart_deploy.md` for detailed pgvector setup.

---

## Testing

### Unit Tests

Run unit tests across all packages:

```bash
pnpm test
```

### E2E Tests

Run end-to-end tests with Playwright:

```bash
# Install Playwright browsers (first time only)
cd apps/web
npx playwright install

# Run E2E tests
pnpm --filter web test:e2e

# Run with UI mode (for debugging)
cd apps/web
npx playwright test --ui

# View test report
npx playwright show-report
```

### Type Checking

Verify TypeScript types across all packages:

```bash
pnpm type-check
```

---

## Building

### Build All Packages

Build all packages in dependency order:

```bash
pnpm build
```

This runs `tsc` or `next build` for each package/app.

### Build Specific Package

```bash
pnpm --filter @aura-sign/client build
```

### Clean Build Artifacts

Remove all build outputs:

```bash
pnpm clean
```

---

## Common Tasks

### Adding a New Dependency

#### To a Specific Package

```bash
# Add to client-ts package
pnpm --filter @aura-sign/client add ethers

# Add dev dependency
pnpm --filter @aura-sign/client add -D @types/node
```

#### To Root (Dev Dependencies)

```bash
pnpm add -D -w typescript
```

### Creating a New Package

1. Create directory in `packages/`:

```bash
mkdir packages/new-package
cd packages/new-package
```

2. Initialize package.json:

```json
{
  "name": "@aura-sign/new-package",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf dist"
  }
}
```

3. Add tsconfig.json:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

4. Create src directory and start coding!

### Updating License Headers

Apply MIT license headers to all source files:

```bash
python3 scripts/apply_license_headers.py
```

### Database Backup

Run the backup script:

```bash
# Set environment variables (use your actual credentials from .env.local)
export PGHOST=localhost
export PGPORT=5432
export PGUSER=${POSTGRES_USER}        # From your .env.local
export PGPASSWORD=${POSTGRES_PASSWORD} # From your .env.local
export PGDATABASE=aura

# Run backup
./scripts/db_backup.sh
```

**Security Note:** Never hardcode credentials in scripts. Always source them from environment variables or secure secret management systems.

For cloud backup (S3/GCS), see `docs/ops/quickstart_deploy.md`.

---

## Troubleshooting

### pnpm install fails

**Solution**: Clear pnpm store and reinstall:

```bash
pnpm store prune
pnpm install
```

### Port already in use

**Solution**: Find and kill the process using the port:

```bash
# Find process on port 3001
lsof -ti:3001

# Kill the process
kill -9 $(lsof -ti:3001)

# Or change port in package.json
pnpm --filter demo-site dev -- -p 3002
```

### Build fails with type errors

**Solution**: Ensure all dependencies are installed and type checking passes:

```bash
pnpm install
pnpm type-check
```

Check for circular dependencies between packages.

### Database connection fails

**Solution**: Verify DATABASE_URL in .env and ensure PostgreSQL is running:

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### pgvector extension not found

**Solution**: Install pgvector extension:

```bash
# Using Docker with pgvector/pgvector image
docker-compose up -d postgres

# Or install manually
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install

# Then in PostgreSQL:
CREATE EXTENSION vector;
```

### Hot reload not working

**Solution**:

1. Check if dev script is running with `--watch` flag
2. Restart dev server
3. Clear dist/ directory: `pnpm clean && pnpm dev`

### Workspace dependency not found

**Solution**: Rebuild the dependency:

```bash
# Build all packages
pnpm build

# Or build specific package
pnpm --filter @aura-sign/client build
```

---

## Additional Resources

- **Main README**: `../README.md` - Project overview and quick start
- **Operational Guide**: `ops/quickstart_deploy.md` - Deployment and operations
- **Staging Deployment**: `ops/staging_deployment_plan.md` - Staging procedures
- **Security Guide**: `security/README.md` - Security best practices
- **Disaster Recovery**: `runbooks/DR_RUNBOOK.md` - DR procedures

---

## Getting Help

If you encounter issues not covered in this guide:

1. Check existing documentation in `docs/`
2. Search closed issues on GitHub
3. Open a new issue with:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Environment details (OS, Node version, pnpm version)

---

## Contributing

When contributing:

1. Create a feature branch from `main`
2. Make your changes
3. Run linting and type checking: `pnpm lint && pnpm type-check`
4. Run tests: `pnpm test`
5. Create a pull request

All PRs must pass CI checks before merging.

---

## Best Practices

- **Always use pnpm**, never npm or yarn
- **Run type-check before committing**
- **Write tests for new features**
- **Follow TypeScript strict mode**
- **Use existing components and hooks where possible**
- **Document new environment variables in .env.example**
- **Update this guide when adding new features or packages**
