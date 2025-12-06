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

- **Unit tests**: Not currently comprehensive - add tests when modifying critical logic
- **Type checking**: Primary verification method via `pnpm type-check`
- **Linting**: Run `pnpm lint` before committing
- **Manual testing**: Start demo app with `pnpm demo` and test wallet flows

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

# Run database migrations (if applicable)
pnpm migrate
```

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

## Troubleshooting

- **pnpm install fails**: Clear store with `pnpm store prune`
- **Port conflicts**: Check `.env` for port overrides
- **Migration failures**: Ensure Postgres running and `DATABASE_URL` correct
- **Build failures**: Run `pnpm clean` then `pnpm build`

## Additional Resources

- Developer guide: `docs/README_DEV.md` (if exists)
- Security docs: `docs/security/README.md` (if exists)
- Deployment runbooks: `docs/runbooks/` (operational procedures)
