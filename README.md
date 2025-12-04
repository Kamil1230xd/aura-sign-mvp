# Aura-Sign MVP

A complete Sign-In with Ethereum (SIWE) authentication solution built with a modern monorepo structure.

## Features

- 🔐 **SIWE Authentication** - Secure wallet-based authentication
- 🏗️ **Monorepo Structure** - Well-organized workspace with pnpm
- ⚡ **TypeScript First** - Full type safety across all packages
- 🎯 **Modular Design** - Reusable packages for client, auth, and UI
- 🚀 **Next.js Demo** - Complete working example

## Structure

- `packages/next-auth` - SIWE authentication handler with iron-session
- `packages/client-ts` - TypeScript client for Aura-Sign operations
- `packages/react` - React components and hooks
- `apps/demo-site` - Next.js demonstration application

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev

# Or run just the demo site
pnpm demo
```

## Development

```bash
# Build all packages
pnpm build

# Lint all packages
pnpm lint

# Type check all packages
pnpm type-check
```

## Security

Security is a top priority for Aura-Sign. We follow industry best practices for Web3 authentication and regularly audit our dependencies and code.

- **Report vulnerabilities:** See [SECURITY.md](SECURITY.md)
- **Security documentation:** [docs/security/](docs/security/)
- **Audit process:** [docs/security/SECURITY_AUDIT.md](docs/security/SECURITY_AUDIT.md)

```bash
# Run security audit
./scripts/security_audit.sh
```

## License

MIT
