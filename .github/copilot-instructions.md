# GitHub Copilot Instructions for Aura-Sign MVP

This repository contains instructions for GitHub Copilot to help maintain consistency and quality when contributing to the Aura-Sign MVP project.

## Project Overview

Aura-Sign MVP is a complete Sign-In with Ethereum (SIWE) authentication solution built as a modern TypeScript monorepo using pnpm. It provides wallet-based authentication and modular building blocks for integrating signature/gesture-based identity flows.

## Repository Structure

```
/apps
  /demo-site            # Next.js demo application
  /web                  # Web application
/packages
  /next-auth            # SIWE + session handler with iron-session
  /client-ts            # TypeScript client SDK (MIT)
  /react                # React components and hooks (MIT)
  /trustmath            # Core verification logic (BSL 1.1)
  /database-client      # Database client utilities
/docs                   # Documentation and runbooks
/infra                  # Infrastructure configurations
/scripts                # Utility scripts
```

## Technology Stack

- **Language:** TypeScript (strict mode enabled)
- **Package Manager:** pnpm 8.15.0
- **Node Version:** 20+
- **Build Tool:** Turbo
- **Frontend Framework:** Next.js, React
- **Styling:** TailwindCSS utility classes
- **Authentication:** SIWE (Sign-In with Ethereum)
- **Session Management:** iron-session

## Coding Standards

### TypeScript

- Always use TypeScript strict mode (configured in tsconfig.json)
- Prefer `interface` over `type` for object shapes
- Use explicit return types for exported functions
- Enable all strict compiler options: `strict: true`, `forceConsistentCasingInFileNames: true`

### React Components

- Use function components with TypeScript props interfaces
- Define props interfaces above the component
- Use custom hooks for shared logic (e.g., `useAuraUser`)
- Style components with TailwindCSS utility classes
- Avoid inline styles and CSS-in-JS unless necessary

Example pattern:
```typescript
// License: MIT. See .github/LICENSES/LICENSE_SDK.md
import React from 'react';

interface MyComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export function MyComponent({ className = '', children }: MyComponentProps) {
  return (
    <div className={`base-classes ${className}`}>
      {children}
    </div>
  );
}
```

### License Headers

All source files in SDK packages (MIT licensed) must include a license header:
```typescript
// License: MIT. See .github/LICENSES/LICENSE_SDK.md
```

Packages with MIT license: `/packages/client-ts`, `/packages/react`
Packages with BSL 1.1 license: `/packages/trustmath`, `/packages/next-auth`

### File Organization

- Place React components in `src/components/`
- Place custom hooks in `src/hooks/`
- Place type definitions in `src/types.ts` or `src/types/`
- Use barrel exports (index.ts) for clean imports
- Keep related files close together

## Build and Development Commands

```bash
# Install dependencies (must use pnpm)
pnpm install

# Build all packages
pnpm build

# Run development mode (all packages in parallel)
pnpm dev

# Run only demo site
pnpm demo

# Lint all packages
pnpm lint

# Type check across monorepo
pnpm type-check

# Clean build artifacts
pnpm clean

# Run e2e tests (web app)
pnpm --filter web test:e2e

# Run e2e tests with UI
pnpm --filter web test:e2e:ui
```

## Security Guidelines

### Critical Security Rules

1. **Never store private keys or secrets in the repository**
   - Use Vault/KMS for production secrets
   - Keep `.env` files out of version control (use `.env.example` only)

2. **SIWE Nonce Handling**
   - Always verify SIWE nonces server-side to prevent replay attacks
   - Never trust client-side nonce validation

3. **Session Management**
   - Use secure, httpOnly cookies
   - Use short TTL in production
   - Never expose session secrets

4. **Data Protection**
   - Treat embeddings and raw evidence as sensitive data
   - Apply retention policies and encryption at rest (S3 server-side encryption)
   - Keep audit trails for attestation issuance and admin overrides

5. **Secret Scanning**
   - Enable Dependabot and scheduled security audits
   - Use secret scanning tools (gitleaks/trufflehog) in CI

### Input Sanitization

- Always sanitize user inputs to prevent XSS attacks
- Use appropriate sanitizers (e.g., `html_escape`) when rendering user content
- Validate and sanitize all data from external sources

## Environment Variables

Required environment variables (see `.env.example`):

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/aura

# SIWE / Authentication
NEXT_PUBLIC_APP_NAME=Aura-Sign-Demo
SESSION_SECRET=replace_me_with_secure_random
IRON_SESSION_PASSWORD=long_random_password_here

# Storage
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minio
MINIO_SECRET_KEY=minio123

# Worker / Queue
REDIS_URL=redis://localhost:6379

# Optional
EMBEDDING_API=http://localhost:4001
```

## Monorepo and Package Management

- Always use `pnpm` for package management (never npm or yarn)
- Use workspace filtering for targeted operations: `pnpm --filter <package-name> <command>`
- Run commands at root to execute across all packages: `pnpm -r <command>`
- Use `pnpm -r --parallel` for parallel execution when appropriate

## Testing Guidelines

- Write tests alongside the code they test
- Use consistent test file naming: `*.test.ts` or `*.spec.ts`
- Follow existing test patterns in the repository
- Run e2e tests before committing: `pnpm --filter web test:e2e`
- The web app uses Playwright for end-to-end testing

## Contributing Guidelines

1. All PRs must pass linting, unit tests, and CI checks
2. Include CHANGELOG entries for breaking changes
3. Maintain backward compatibility when possible
4. Update documentation when changing public APIs
5. Follow the existing code style and patterns

## Infrastructure

The project includes infrastructure configurations in the `/infra` directory:

- Prometheus configuration: `infra/prometheus/prometheus.yml`
- Alert rules: `infra/prometheus/alert.rules.yml`

For local development, ensure required services (Postgres, Redis, MinIO) are available according to environment variables in `.env`.

## Documentation

- Developer guide: `docs/README_DEV.md`
- Security documentation: `docs/security/README.md`
- Runbooks: `docs/runbooks/DR_RUNBOOK.md`

## Common Pitfalls to Avoid

- Don't use `npm` or `yarn` - always use `pnpm`
- Don't commit `.env` files - use `.env.example` as template
- Don't skip license headers in SDK packages
- Don't disable TypeScript strict mode
- Don't create new build/test tools unless absolutely necessary
- Don't modify core security logic without thorough review
- Don't remove or modify working code unless fixing a bug or security issue
- Don't add dependencies without checking for vulnerabilities

## Hybrid Licensing Model

This repository uses a hybrid licensing model:

- **SDKs & UI** (`/packages/client-ts`, `/packages/react`): **MIT** (Open Source)
- **Core Engine** (`/packages/trustmath`, `/packages/next-auth`, `/packages/database-client`): **BSL 1.1** (Source Available)
- **Documentation** (`/docs`): **CC-BY 4.0**

Always respect the licensing boundaries and include appropriate headers.

## AI-Assisted Development Notes

When using GitHub Copilot or similar AI tools:
- Always review generated code for security vulnerabilities
- Ensure generated code follows the project's TypeScript strict mode
- Verify that license headers are included where required
- Check that generated code uses pnpm, not npm/yarn
- Validate that authentication flows follow SIWE best practices
- Ensure generated tests follow existing patterns
