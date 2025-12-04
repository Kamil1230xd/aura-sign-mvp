# Developer Guide

Complete development guide for Aura-Sign MVP contributors.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Development Workflow](#development-workflow)
4. [Database & Migrations](#database--migrations)
5. [Testing](#testing)
6. [Building & Deployment](#building--deployment)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Node.js:** 20.x or later
- **pnpm:** 8.x or later
- **Docker:** 20.x or later (with docker-compose)
- **Git:** 2.x or later
- **PostgreSQL:** 14+ with pgvector extension (via Docker)

### Optional Tools

- **Redis CLI:** For debugging queues
- **psql:** PostgreSQL command-line client
- **mc (MinIO Client):** For object storage management

### Installation

```bash
# Node.js (via nvm - recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# pnpm
npm install -g pnpm@8

# Docker & docker-compose
# Follow instructions at: https://docs.docker.com/get-docker/

# Verify installations
node --version   # Should be v20.x.x
pnpm --version   # Should be 8.x.x
docker --version # Should be 20.x.x or later
```

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/Kamil1230xd/aura-sign-mvp.git
cd aura-sign-mvp
```

### 2. Install Dependencies

```bash
# Install all workspace dependencies
pnpm install

# This will install dependencies for all packages and apps
```

### 3. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your local configuration
nano .env  # or use your preferred editor
```

**Required Environment Variables:**

```bash
# Database
DATABASE_URL=postgresql://admin:adminpass@localhost:5432/aura

# Sessions & Auth
SESSION_SECRET=your-secret-key-min-32-chars
IRON_SESSION_PASSWORD=your-iron-session-password-min-32-chars

# Redis (for workers)
REDIS_URL=redis://localhost:6379

# MinIO / Object Storage
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minio
MINIO_SECRET_KEY=minio123

# Optional: Embedding API
EMBEDDING_API=http://localhost:4001

# Optional: Worker configuration
WORKER_CONCURRENCY=5
QUEUE_NAME=aura-jobs
```

### 4. Start Infrastructure Services

```bash
# Start Postgres, Redis, and MinIO
docker-compose up -d

# Verify services are running
docker-compose ps

# Check logs if needed
docker-compose logs -f postgres
```

### 5. Run Database Migrations

```bash
# Run all pending migrations
pnpm migrate

# Or manually:
./scripts/run_migrations.sh
```

### 6. Verify Setup

```bash
# Check database connection
psql $DATABASE_URL -c "SELECT version();"

# Check Redis connection
redis-cli ping

# Check MinIO (if mc is installed)
mc alias set local http://localhost:9000 minio minio123
mc ls local
```

## Development Workflow

### Starting Development Server

```bash
# Start all apps and packages in dev mode
pnpm dev

# Or start specific app
pnpm --filter demo-site dev

# Or just the demo app (shortcut)
pnpm demo
```

The demo site will be available at http://localhost:3000

### Code Structure

```
aura-sign-mvp/
├── apps/
│   └── demo-site/          # Next.js demo application
│       ├── pages/          # Next.js pages
│       ├── components/     # React components
│       ├── lib/            # Utility functions
│       └── public/         # Static assets
├── packages/
│   ├── next-auth/          # SIWE authentication package
│   ├── client-ts/          # TypeScript client SDK
│   ├── react/              # Shared React components
│   └── database-client/    # Database utilities (optional)
├── scripts/                # Operational scripts
├── docs/                   # Documentation
└── infra/                  # Infrastructure configs
```

### Working with Packages

```bash
# Add dependency to specific package
pnpm --filter @aura/next-auth add <package-name>

# Add dev dependency
pnpm --filter @aura/next-auth add -D <package-name>

# Build specific package
pnpm --filter @aura/next-auth build

# Run tests in specific package
pnpm --filter @aura/next-auth test
```

### Linting and Type Checking

```bash
# Lint all packages
pnpm lint

# Fix linting issues
pnpm lint --fix

# Type check
pnpm type-check

# Run both
pnpm lint && pnpm type-check
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add your feature"

# Push to remote
git push origin feature/your-feature-name

# Create Pull Request on GitHub
```

**Commit Message Convention:**

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

## Database & Migrations

### Creating Migrations

```bash
# Create new migration file
cat > scripts/migrations/$(date +%Y%m%d%H%M%S)_your_migration_name.sql << 'EOF'
-- Migration: Your migration name
-- Created: $(date)

BEGIN;

-- Your SQL here
ALTER TABLE users ADD COLUMN new_field TEXT;

COMMIT;
EOF
```

### Running Migrations

```bash
# Run all pending migrations
pnpm migrate

# Or manually
./scripts/run_migrations.sh

# Verify migration status
psql $DATABASE_URL -c "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;"
```

### Rolling Back Migrations

```bash
# Manual rollback (be careful!)
psql $DATABASE_URL -f scripts/migrations/rollback/20240101000000_rollback_migration_name.sql
```

### Working with pgvector

```bash
# Create vector column (example)
psql $DATABASE_URL << 'EOF'
ALTER TABLE embeddings ADD COLUMN embedding vector(768);
EOF

# Create vector index
./scripts/reindex_ivf.sh

# Test vector query
psql $DATABASE_URL << 'EOF'
SELECT id, embedding <=> '[0.1, 0.2, ...]'::vector AS distance
FROM embeddings
ORDER BY distance
LIMIT 10;
EOF
```

### Database Backup & Restore

```bash
# Create backup
./scripts/db_backup.sh

# List backups
./scripts/db_backup.sh list

# Restore backup
./scripts/db_backup.sh restore backup_YYYY-MM-DD_HH-MM-SS.sql.gz
```

## Testing

### Unit Tests

```bash
# Run all unit tests
pnpm test

# Run tests for specific package
pnpm --filter @aura/next-auth test

# Run tests in watch mode
pnpm --filter @aura/next-auth test --watch

# Run with coverage
pnpm test --coverage
```

### E2E Tests

```bash
# Run e2e tests (if configured)
pnpm --filter demo-site test:e2e

# Run in headed mode (see browser)
pnpm --filter demo-site test:e2e --headed

# Run specific test file
pnpm --filter demo-site test:e2e tests/auth.spec.ts
```

### Integration Tests

```bash
# Start test database
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
pnpm test:integration

# Cleanup
docker-compose -f docker-compose.test.yml down -v
```

## Building & Deployment

### Local Build

```bash
# Build all packages and apps
pnpm build

# Build specific package
pnpm --filter @aura/next-auth build

# Clean build artifacts
pnpm clean
```

### Production Build

```bash
# Set production environment
export NODE_ENV=production

# Build for production
pnpm build

# Start production server
pnpm start
```

### Docker Build

```bash
# Build Docker image
docker build -t aura-sign-mvp:latest .

# Run container
docker run -p 3000:3000 --env-file .env aura-sign-mvp:latest

# Or use docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

## Workers

### Starting Workers

```bash
# Start embedding worker
pnpm dev:worker

# Start in production mode
NODE_ENV=production pnpm workers:start

# Start specific worker
node packages/trust-orchestrator/workers/embedding-worker.js
```

### Monitoring Workers

```bash
# Check Redis queue status
redis-cli LLEN embedding:queue
redis-cli LLEN embedding:processing
redis-cli LLEN embedding:failed

# Monitor worker logs
docker-compose logs -f worker

# Grafana dashboard
# Open http://localhost:3001/d/workers
```

### Managing Queue

```bash
# Clear failed jobs
redis-cli DEL embedding:failed

# Retry failed jobs
pnpm workers:retry-failed

# Pause queue
redis-cli SET embedding:paused 1

# Resume queue
redis-cli DEL embedding:paused
```

## Troubleshooting

### Common Issues

#### Issue: `pnpm install` fails

```bash
# Clear pnpm cache
pnpm store prune

# Remove node_modules
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules

# Reinstall
pnpm install
```

#### Issue: Database connection fails

```bash
# Check if Postgres is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Try manual connection
psql $DATABASE_URL

# Restart Postgres
docker-compose restart postgres
```

#### Issue: Port already in use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3001 pnpm dev
```

#### Issue: pgvector extension not found

```bash
# Connect to database
psql $DATABASE_URL

# Install extension
CREATE EXTENSION IF NOT EXISTS vector;

# Verify
\dx

# If still not working, check Docker image includes pgvector
docker-compose down
docker-compose pull
docker-compose up -d
```

#### Issue: Worker not processing jobs

```bash
# Check Redis connection
redis-cli ping

# Check queue
redis-cli LLEN embedding:queue

# Check worker logs
docker-compose logs worker

# Restart worker
pnpm workers:restart
```

#### Issue: Build fails with type errors

```bash
# Clean TypeScript build cache
find . -name "*.tsbuildinfo" -delete
rm -rf .turbo

# Rebuild
pnpm clean
pnpm build
```

### Getting Help

- **Documentation:** Check `docs/` directory
- **Issues:** https://github.com/Kamil1230xd/aura-sign-mvp/issues
- **Discussions:** https://github.com/Kamil1230xd/aura-sign-mvp/discussions
- **Security:** security@aura-idtoken.org

### Useful Commands

```bash
# Check pnpm workspace structure
pnpm list --depth 0

# View dependency tree
pnpm list --depth 2

# Update dependencies
pnpm update

# Check for outdated dependencies
pnpm outdated

# Clean everything
pnpm clean && rm -rf node_modules && pnpm install

# View logs for all services
docker-compose logs -f

# Stop all services
docker-compose down

# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d postgres
pnpm migrate
```

## Best Practices

### Code Style

- Use TypeScript strict mode
- Follow ESLint rules
- Use Prettier for formatting
- Write self-documenting code
- Add JSDoc comments for public APIs

### Git Workflow

- Keep commits small and focused
- Write descriptive commit messages
- Create feature branches
- Request reviews before merging
- Squash commits when appropriate

### Security

- Never commit secrets or API keys
- Use environment variables
- Validate all inputs
- Sanitize outputs
- Follow OWASP guidelines

### Testing

- Write tests for new features
- Maintain test coverage >80%
- Test edge cases
- Use meaningful test descriptions
- Mock external dependencies

## Additional Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Next.js Documentation](https://nextjs.org/docs)
- [pnpm Documentation](https://pnpm.io/)
- [SIWE Specification](https://eips.ethereum.org/EIPS/eip-4361)
- [pgvector Documentation](https://github.com/pgvector/pgvector)

---

**Last Updated:** 2024-12-04  
**Maintainers:** Aura-Sign Core Team
