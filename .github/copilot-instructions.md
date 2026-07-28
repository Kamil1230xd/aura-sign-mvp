# Copilot Instructions for Aura-Sign MVP

This repository is a **TypeScript-first monorepo** implementing Sign-In with Ethereum (SIWE) authentication with a modular architecture. Follow these guidelines when working with this codebase.

## Repository Structure

```
/apps
  /demo-site            # Next.js demo application (port 3001)
  /web                  # Additional web application
/packages
  /client-ts            # TypeScript client SDK (MIT License)
  /react                # React components and hooks (MIT License)
  /next-auth            # SIWE + iron-session handler (BSL 1.1)
  /database-client      # Prisma client with pgvector
  /trustmath            # Trust math calculations (BSL 1.1)
```

### Package Details

- **client-ts**: Core SDK for interacting with Aura-Sign API. Exports typed client and utilities.
- **react**: React components (`AuraSignButton`, etc.) and hooks (`useAuraUser`) for UI integration.
- **next-auth**: Next.js API route handlers for SIWE authentication with iron-session.
- **database-client**: Prisma schema and generated client for PostgreSQL with pgvector support.
- **trustmath**: Algorithms and calculations for trust scores and attestations.
- **demo-site**: Full working example of SIWE flow with wallet connection.
- **web**: Main web application (includes E2E tests).

### Monorepo Architecture

- **Package Manager**: pnpm 8+ (workspace protocol)
- **Build System**: Turbo for orchestration
- **TypeScript**: Strict mode enabled across all packages
- **Workspaces**: `apps/*` and `packages/*`

## Technology Stack

- **Frontend**: Next.js 14, React 18, TailwindCSS
- **Auth**: SIWE (Sign-In with Ethereum), iron-session
- **Blockchain**: ethers.js v6
- **Database**: Prisma with PostgreSQL and pgvector
- **Monitoring**: Prometheus metrics (via prom-client)
- **Type Safety**: TypeScript 5.3+ with strict mode

## Development Commands

```bash
# Install dependencies (always use pnpm)
pnpm install

# Development (all packages in parallel)
pnpm dev

# Development (demo site only, port 3001)
pnpm demo

# Build all packages (respects dependency order via Turbo)
pnpm build

# Lint all packages
pnpm lint

# Type check across monorepo
pnpm type-check

# Clean build artifacts
pnpm clean
```

### Package-Specific Commands

```bash
# Work on specific package
pnpm --filter demo-site dev
pnpm --filter @aura-sign/client build
pnpm --filter @aura-sign/react type-check
```

## Code Style & Conventions

### TypeScript Standards

- **Always use TypeScript** - no plain JavaScript files
- **Strict mode enabled** - handle all null/undefined cases
- **Explicit return types** for exported functions
- **Interface over type** for object shapes
- **Export named exports** - avoid default exports except for React components and Next.js pages

### React Conventions

- **Function components** - no class components
- **Hooks for state management** - use custom hooks for shared logic
- **TypeScript props interfaces** - always type component props
- **TailwindCSS for styling** - utility-first approach
- **Accessible components** - include ARIA attributes where appropriate

### File Naming

- **React components**: PascalCase (e.g., `AuraSignButton.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAuraUser.ts`)
- **Types/Interfaces**: PascalCase in `types.ts` files
- **Utilities**: camelCase (e.g., `client.ts`)

### Code Organization

- Each package has `src/` for source, `dist/` for compiled output
- Export public API through `src/index.ts` barrel files
- Keep types in separate `types.ts` files
- Use workspace protocol for internal dependencies: `"workspace:*"`

## Security Guidelines

### Critical Security Rules

1. **Never commit secrets** - use `.env` files (gitignored)
2. **SIWE nonce validation** - always verify nonces server-side to prevent replay attacks
3. **Session management** - use secure, httpOnly cookies with short TTL
4. **Input sanitization** - validate all user inputs, especially wallet addresses
5. **Private keys** - never store or log private keys anywhere
6. **Environment variables** - use `.env.example` as template, never commit `.env`

### Sensitive Data Handling

- **Embeddings and evidence**: Treat as sensitive, apply retention policies
- **Audit logs**: Keep trail for attestation issuance and admin actions
- **Storage encryption**: Use encryption at rest for stored data (S3 server-side encryption for object storage, PostgreSQL encryption for database)
- **API endpoints**: Always validate authentication and authorization

### License Awareness

The repository uses **Hybrid Licensing** (see `NOTICE.md`):

- **MIT**: `/packages/client-ts`, `/packages/react` (freely modifiable)
- **BSL 1.1**: `/packages/trustmath`, `/packages/next-auth` (source available, restricted use)
- **PolyForm Shield**: AI models and data (protected)

Always include appropriate license headers:

- MIT packages: `// License: MIT. See .github/LICENSES/LICENSE_SDK.md`
- BSL 1.1 packages: `// License: BSL 1.1. See .github/LICENSES/LICENSE_CORE.md`
- Protected packages: `// License: PolyForm Shield. See .github/LICENSES/LICENSE_DATA.md`

## Testing Approach

The project uses a hybrid testing strategy:

### Test Types

- **Unit tests**: Vitest for TypeScript packages (`.test.ts` files alongside source)
- **E2E tests**: Playwright for web applications
- **Type checking**: Primary verification method via `pnpm type-check`
- **Linting**: Run `pnpm lint` before committing

### Test Commands

```bash
# Run all tests (unit + e2e)
pnpm test

# Run only unit tests for packages
pnpm test:unit

# Run only E2E tests for web apps
pnpm test:e2e

# Run tests for specific package
pnpm --filter @aura-sign/client test
pnpm --filter @aura-sign/react test

# Run tests in watch mode
pnpm --filter @aura-sign/client test:watch

# E2E with UI
pnpm --filter web test:e2e:ui
```

### Manual Testing

- Start demo app with `pnpm demo` and test wallet flows
- Demo runs on port 3001 by default

## Environment Setup

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/aura

# SIWE / Authentication
NEXT_PUBLIC_APP_NAME=Aura-Sign-Demo
SESSION_SECRET=<secure_random_string>
IRON_SESSION_PASSWORD=<min_32_char_password>

# Storage (MinIO)
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=<key>
MINIO_SECRET_KEY=<secret>

# Queue (Redis)
REDIS_URL=redis://localhost:6379
```

### Local Infrastructure

```bash
# Start Postgres, MinIO, Redis via Docker
docker-compose up -d

# Stop infrastructure
docker-compose down

# Reset with clean volumes
docker-compose down -v
docker-compose up -d
```

## Database Management

### Schema Management

The project uses Prisma for database schema management. The database-client package includes:

- `schema_extra.prisma` - Example schema extensions with pgvector support

To work with Prisma and migrations:

```bash
# Navigate to database-client package
cd packages/database-client

# Generate Prisma client after schema changes
npx prisma generate

# Create a new migration (if you have a schema.prisma file)
npx prisma migrate dev --name migration_name

# Apply migrations to production
npx prisma migrate deploy

# Reset database (development only - WARNING: data loss)
npx prisma migrate reset

# Open Prisma Studio to view/edit data
npx prisma studio
```

### Database Setup Requirements

- PostgreSQL 14+ with `pgvector` extension enabled
- Connection string format: `postgresql://user:pass@localhost:5432/dbname`
- Enable pgvector extension: `CREATE EXTENSION IF NOT EXISTS vector;`
- Ensure database exists before running migrations

### Working with Database Schema

When updating database schema:

1. Edit your `schema.prisma` file (or integrate models from `schema_extra.prisma`)
2. Create migration: `cd packages/database-client && npx prisma migrate dev`
3. Generate client: `npx prisma generate`
4. Rebuild package: `pnpm --filter @aura-sign/database-client build`
5. Update dependent packages if schema changes affect types

## Common Patterns

### Creating New Packages

1. Add to `packages/` directory
2. Include `package.json` with workspace dependencies
3. Use `tsconfig.json` with `compilerOptions.composite: true`
4. Add build script: `"build": "tsc"`
5. Export public API via `src/index.ts`
6. Add package to workspace with `pnpm install`

### Authentication Flow

1. User connects wallet (via Web3 provider)
2. Backend generates SIWE message with nonce
3. User signs message with wallet
4. Backend verifies signature and establishes session
5. Use `useAuraUser` hook in React for state management

### Error Handling

- Return typed error objects with `success: boolean` and `error?: string`
- Log errors server-side, never expose internal details to client
- Use try-catch blocks for async operations
- Provide user-friendly error messages in UI

## CI/CD Pipeline

The project uses GitHub Actions for continuous integration:

### CI Workflow (`.github/workflows/ci.yml`)

The CI pipeline runs on push to `main` and on pull requests:

1. **Setup Job**:
   - Install dependencies with pnpm
   - Run linting (`pnpm lint`)
   - Run type checking (`pnpm type-check`)
   - Run unit tests (`pnpm test:unit`)
   - Upload test artifacts and coverage

2. **E2E Job** (conditional):
   - Runs on push or PR from same repo (fork protection)
   - Starts infrastructure with docker-compose if available
   - Runs E2E tests (`pnpm test:e2e`)
   - Uploads E2E test results

3. **Security Audit Job**:
   - Runs `pnpm audit` and saves JSON report
   - Scans for secrets using gitleaks

### Local CI Simulation

You can simulate CI checks locally:

```bash
# Full CI pipeline
pnpm install --frozen-lockfile
pnpm lint
pnpm type-check
pnpm test:unit

# If you have docker-compose:
docker-compose up -d
pnpm test:e2e
```

## Build & Deployment

- **Build order**: Turbo handles dependency resolution automatically
- **Production builds**: Run `pnpm build` before deployment
- **Type checking**: Always passes before merge
- **Port configuration**: Demo site on 3001 (not default 3000)

## Git Workflow

- **Branching**: Feature branches from main
- **Commits**: Clear, descriptive messages
- **PRs**: Must pass linting and type checks
- **Merge strategy**: Squash or rebase preferred

## Performance Considerations

### Build Performance

- **Turbo caching**: Turbo caches build outputs. Use `pnpm clean` to clear cache if needed.
- **Parallel builds**: `pnpm build` builds packages in optimal order using Turbo's dependency graph.
- **TypeScript project references**: Packages use `composite: true` for incremental compilation.

### Runtime Performance

- **Database queries**: Use Prisma's query optimization and indexing
- **Vector operations**: pgvector extension provides efficient similarity search
- **Session management**: iron-session uses encrypted cookies for fast auth checks
- **API caching**: Implement appropriate cache headers for static content
- **Bundle size**: Monitor Next.js bundle size with `pnpm --filter demo-site build --analyze`

### Development Performance

- **Hot reload**: All packages support HMR for fast iteration
- **Watch mode**: Use `pnpm --filter <package> test:watch` for TDD
- **Selective builds**: Build only changed packages with Turbo's intelligent caching

## Debugging & Development Workflow

### Development Mode

```bash
# Start all packages in development mode (parallel)
pnpm dev

# Start only demo site (runs on port 3001)
pnpm demo

# Work on specific package
pnpm --filter @aura-sign/client dev
pnpm --filter demo-site dev
```

### Debugging Tips

- **Next.js debugging**: Add breakpoints in VS Code, use built-in debugger
- **Type errors**: Run `pnpm type-check` to see all type issues across monorepo
- **Build issues**: Check `turbo.json` for pipeline dependencies
- **Package linking**: Workspace protocol (`"workspace:*"`) ensures local packages are linked
- **Hot reload**: All packages support hot module replacement (HMR)

### Logging

- **Server-side logs**: Check terminal output from `pnpm dev` or `pnpm demo`
- **Client-side logs**: Open browser DevTools console
- **API errors**: Check Network tab for request/response details

## Troubleshooting

- **pnpm install fails**: Clear store with `pnpm store prune`
- **Port conflicts**: Check `.env` for port overrides (demo uses 3001)
- **Migration failures**: Ensure Postgres running and `DATABASE_URL` correct
- **Build failures**: Run `pnpm clean` then `pnpm build`
- **Dependency issues**: Delete `node_modules` folders and `pnpm-lock.yaml`, then `pnpm install`
- **Type errors after update**: Run `pnpm build` to regenerate `.d.ts` files
- **Docker issues**: Run `docker-compose down -v` to reset containers and volumes

## Common Use Cases & Examples

### Adding a New Package

```bash
# 1. Create package directory
mkdir -p packages/my-package/src

# 2. Create package.json
cat > packages/my-package/package.json << 'EOF'
{
  "name": "@aura-sign/my-package",
  "version": "0.1.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "lint": "eslint src",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
EOF

# 3. Create tsconfig.json with composite: true
# 4. Create src/index.ts with exports
# 5. Run pnpm install from root
```

### Using SIWE Authentication

```typescript
// In a Next.js API route (pages/api/auth/signin.ts)
import { siweHandler } from '@aura-sign/next-auth';

export default siweHandler({
  // configuration
});

// In a React component
import { useAuraUser } from '@aura-sign/react';

function MyComponent() {
  const { user, signIn, signOut } = useAuraUser();
  // Use user state
}
```

### Running Specific Workflows

```bash
# Work on client SDK
pnpm --filter @aura-sign/client dev

# Test changes to React components
pnpm --filter @aura-sign/react test:watch

# Preview demo with your changes
pnpm demo

# Build only affected packages
pnpm --filter @aura-sign/client build
```

## Additional Resources

- **Developer guide**: `docs/README_DEV.md` - Comprehensive setup and development instructions
- **Testing guide**: `docs/TESTING.md` - Testing infrastructure and practices
- **Security docs**: `docs/security/README.md` - Security guidelines and audit procedures
- **Deployment runbooks**: `docs/runbooks/` - Operational procedures and disaster recovery
- **CI workflows**: `.github/workflows/ci.yml` - CI/CD pipeline configuration
