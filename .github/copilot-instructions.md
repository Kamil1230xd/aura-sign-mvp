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

### Package Dependency Graph

```
apps/demo-site
  └─> @aura-sign/client (MIT)
  └─> @aura-sign/react (MIT)
  └─> @aura-sign/next-auth (BSL 1.1)

apps/web
  └─> (similar dependencies)

@aura-sign/react (MIT)
  └─> @aura-sign/client (MIT)
  └─> ethers v6

@aura-sign/next-auth (BSL 1.1)
  └─> siwe
  └─> iron-session

@aura-sign/client (MIT)
  └─> ethers v6

@aura-sign/database-client
  └─> @prisma/client
  └─> pgvector support

@aura-sign/trustmath (BSL 1.1)
  └─> (trust calculation logic)
```

**Build order**: Packages build before apps that depend on them (managed by Turbo)

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

# Install dependency to specific package
pnpm --filter @aura-sign/client add ethers
pnpm --filter demo-site add -D @types/node

# Run command in all packages
pnpm -r build
pnpm -r --parallel dev
```

### Package Dependencies

Internal package dependencies use the workspace protocol:

```json
{
  "dependencies": {
    "@aura-sign/client": "workspace:*",
    "@aura-sign/react": "workspace:*"
  }
}
```

**Important**: Always use `workspace:*` for internal dependencies, never hardcoded versions.

**Core dependencies:**
- **ethers v6.x**: Blockchain interactions, wallet connections
- **Next.js 14**: Frontend framework with App Router
- **React 18**: UI library with hooks
- **iron-session**: Secure session management for SIWE
- **Prisma**: Database ORM with pgvector support
- **TypeScript 5.3+**: Type safety across the monorepo

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
  - Note: Some packages may have type errors; fix only errors related to your changes
- **Linting**: Run `pnpm lint` before committing
  - ESLint is configured for Next.js apps (demo-site, web) but not for all packages
  - Packages use TypeScript compiler for validation instead
- **Manual testing**: Start demo app with `pnpm demo` and test wallet flows
  - Demo site runs on port 3001 by default
  - Test with MetaMask or another Web3 wallet extension
  - Verify SIWE message signing and session creation

### Testing Web3/SIWE Flows

When testing authentication:
1. Ensure MetaMask or compatible wallet is installed
2. Connect wallet to localhost (may need to add network manually)
3. Sign the SIWE message when prompted
4. Verify session is created and persisted
5. Test logout flow and session cleanup

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

**Example:**
```typescript
// Good: Typed error response
async function verifySignature(signature: string): Promise<{ success: boolean; error?: string }> {
  try {
    // verification logic
    return { success: true };
  } catch (error) {
    console.error('Verification failed:', error); // Log server-side
    return { success: false, error: 'Invalid signature' }; // User-friendly message
  }
}
```

### Web3 Provider Access

Always use `globalThis.ethereum` instead of `window.ethereum` for SSR/Deno compatibility:

```typescript
// Good: SSR-compatible
if (typeof globalThis !== 'undefined' && globalThis.ethereum) {
  const provider = globalThis.ethereum;
}

// Bad: SSR will fail
if (window.ethereum) {
  const provider = window.ethereum;
}
```

## Build & Deployment

- **Build order**: Turbo handles dependency resolution automatically
- **Production builds**: Run `pnpm build` before deployment
- **Type checking**: Should pass before merge (some known issues in next-auth)
- **Port configuration**: Demo site on 3001 (not default 3000)

### CI/CD Workflows

The repository includes GitHub Actions workflows:

- **Deno workflow** (`.github/workflows/deno.yml`): Runs Deno linting and tests
  - Triggers on push/PR to main branch
  - Uses Deno v1.x for compatibility
- **SLSA provenance** (`.github/workflows/generator-generic-ossf-slsa3-publish.yml`): Generates supply chain attestations
- **Aura protection** (`.github/workflows/apply-aura-protection.yml`): Applies watermarking and behavioral fingerprints

When making changes:
- CI must pass before merging
- Fix any linting errors in Deno-compatible code
- Ensure type checking passes for modified packages

## Git Workflow

- **Branching**: Feature branches from main
- **Commits**: Clear, descriptive messages
- **PRs**: Must pass linting and type checks
- **Merge strategy**: Squash or rebase preferred

## Troubleshooting

### Common Issues

- **pnpm install fails**: Clear store with `pnpm store prune`
- **Port conflicts**: Check `.env` for port overrides (demo site uses 3001, not 3000)
- **Migration failures**: Ensure Postgres running and `DATABASE_URL` correct
- **Build failures**: Run `pnpm clean` then `pnpm build`
- **Type errors in next-auth**: Known issue with iron-session types; fix only if modifying that package
- **ESLint not configured**: Run `next lint` in Next.js apps to set up ESLint when needed

### Debugging Tips

**TypeScript compilation issues:**
```bash
# Check specific package
pnpm --filter @aura-sign/client type-check

# Watch mode for iterative development
pnpm --filter @aura-sign/client dev
```

**Wallet connection issues:**
- Check browser console for Web3 provider errors
- Verify MetaMask is unlocked and on correct network
- Check `globalThis.ethereum` is available (SSR compatibility)
- Review SIWE message format and nonce generation

**Session issues:**
- Verify `IRON_SESSION_PASSWORD` is set (minimum 32 characters)
- Check browser cookies are enabled
- Inspect session data in browser DevTools > Application > Cookies
- Verify session secret is consistent across restarts

**Database connectivity:**
- Ensure PostgreSQL is running: `docker-compose ps`
- Test connection: `psql $DATABASE_URL`
- Check pgvector extension is installed if using embeddings

## Known Issues

- **Type errors in `@aura-sign/next-auth`**: iron-session type definitions have some gaps. Only fix if modifying that package.
- **ESLint setup**: Next.js apps require interactive ESLint configuration on first `pnpm lint` run.
- **Licensing discrepancy**: `NOTICE.md` references `/packages/ai-verification` which doesn't exist. The actual package is `/packages/database-client` which is not listed.

## Additional Resources

- **Developer guide**: `docs/README_DEV.md` - comprehensive setup and workflow documentation
- **Security guidelines**: `docs/security/README.md` - authentication, encryption, audit logging
- **Disaster recovery**: `docs/runbooks/DR_RUNBOOK.md` - backup, restore, and operational procedures
- **Operations**: `docs/ops/` - deployment plans and infrastructure quickstart

## Working with the Codebase

### Before Making Changes

1. **Understand the scope**: Read related code and tests first
2. **Check dependencies**: Understand package relationships (`workspace:*` protocol)
3. **Review license**: Ensure changes respect BSL 1.1 vs MIT boundaries
4. **Check security**: Follow SIWE nonce validation and session management patterns

### Making Changes

1. **Start development server**: `pnpm --filter <package> dev` for watch mode
2. **Make minimal changes**: Surgical edits, avoid refactoring unless necessary
3. **Test iteratively**: `pnpm type-check` after each change
4. **Verify manually**: For UI changes, run `pnpm demo` and test in browser

### Example: Adding a New React Hook

```typescript
// packages/react/src/hooks/useMyHook.ts
// License: MIT. See .github/LICENSES/LICENSE_SDK.md

import { useState, useEffect } from 'react';

export interface MyHookOptions {
  enabled?: boolean;
}

export function useMyHook(options: MyHookOptions = {}) {
  const [data, setData] = useState<string | null>(null);
  
  useEffect(() => {
    if (!options.enabled) return;
    // Hook logic here
  }, [options.enabled]);
  
  return { data };
}
```

Then export from `packages/react/src/index.ts`:
```typescript
export { useMyHook } from './hooks/useMyHook';
export type { MyHookOptions } from './hooks/useMyHook';
```
