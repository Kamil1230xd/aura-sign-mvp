# Aura-Sign MVP 
# Project Name — EXPERIMENTAL v1

> Status: EXPERIMENTAL  
> Time-boxed research repository  
> Not production-ready

## Purpose (Why this repo exists)
This repository exists to test specific technical and conceptual assumptions.
It is not intended to become a production product.

## Hypotheses
We are explicitly testing the following assumptions:
1. …
2. …
3. …

## Non-goals
This repository intentionally does NOT aim to:
- Solve X
- Be production-ready
- Provide long-term support
- Optimize performance beyond baseline

## Scope
In scope:
- Minimal implementation to validate assumptions
- Clear failure signals
- Documentation of decisions

Out of scope:
- UX polish
- Scalability
- Enterprise-grade security hardening

## Success criteria
This experiment is considered successful if:
- Condition A is met
OR
- Hypothesis B is disproven with evidence

## Failure criteria
This experiment is considered failed if:
- X cannot be achieved within the time-box
- Key assumption proves false

## Time-box
Start date: YYYY-MM-DD  
Planned evaluation: YYYY-MM-DD

## What to look at
- `/docs/decisions.md` — why choices were made
- `/docs/lessons.md` — updated during the experiment

## What this repo is NOT
- Not a product
- Not a final architecture
- Not a best-practice reference

## Next steps after evaluation
- Archive repository
- Fork into new experimental repo
- Rewrite from scratch using lessons learned
**A complete Sign-In with Ethereum (SIWE) authentication solution** built as a modern monorepo.

[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![CI](https://img.shields.io/badge/CI-GitHub%20Actions-blue)](.github/workflows)

---

## Summary

Aura-Sign MVP provides wallet-based authentication (SIWE) and modular building blocks for integrating signature/gesture-based identity flows. Project is TypeScript-first and organized as a pnpm monorepo for predictable dev and CI.

---

## Key features

- 🔐 **SIWE Authentication** — secure wallet-based sign-in flows
- 🏗️ **Monorepo (pnpm)** — apps + packages architecture
- ⚡ **TypeScript-first** — strict typing across packages
- 🎯 **Modular design** — client SDK, auth, React UI components
- 🚀 **Next.js demo** — working example application

---

## Repo structure

```
/apps
  /demo-site            # Next.js demo application
/packages
  /next-auth            # SIWE + session handler with iron-session
  /client-ts            # TypeScript client SDK
  /react                # React components and hooks
/docs
  README_DEV.md         # Developer guide (run, migrate, test)
  runbooks/             # Operational runbooks (DR, backup, infra)
```

---

## Quick start (developer)

> Node / pnpm versions: **Node 20+**, **pnpm 8+** recommended.

### Option 1: Automated Bootstrap (Recommended)

```bash
# Clone and run bootstrap script
git clone https://github.com/Kamil1230xd/aura-sign-mvp.git
cd aura-sign-mvp
./scripts/bootstrap_local_dev.sh

# Optional but recommended: Set up pre-commit secret detection
./scripts/setup_pre_commit_hooks.sh
```

The bootstrap script handles dependencies, environment setup, database initialization, and auto-generates secure credentials. See [Quick Start Security Guide](docs/QUICK_START_SECURITY.md) for more information.

### Option 2: Manual Setup

```bash
# 1) Install dependencies
pnpm install

# 2) Create .env.local from template (never commit this file!)
cp .env.example .env.local
# edit .env.local and replace ALL placeholder values
# Generate secrets with: openssl rand -base64 32

# 3) Start development (monorepo)
pnpm dev

# 4) Or run only demo
pnpm demo
```

---

## Environment variables (.env.example)

A `.env.example` template exists in the repo root. **Never commit real secrets** — copy to `.env.local` (gitignored) and fill in actual values:

```bash
# Copy template and edit with your values
cp .env.example .env.local

# Generate secure random secrets using:
openssl rand -base64 32
```

See `.env.example` for all available configuration options. Key variables include:

- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Server-side session secret (min 32 chars)
- `IRON_SESSION_PASSWORD` - Encrypted cookie password (min 32 chars)
- `POSTGRES_USER`, `POSTGRES_PASSWORD` - Database credentials for Docker Compose
- `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` - Object storage credentials

> **Security note:**
>
> - Never commit `.env` or `.env.local` files (they are gitignored)
> - Use placeholders in `.env.example` only
> - Generate strong random secrets for production use
> - The bootstrap script (`./scripts/bootstrap_local_dev.sh`) auto-generates secure credentials

---

## Development tasks

```bash
# Build everything
pnpm build

# Lint all packages
pnpm lint

# Type check across monorepo
pnpm type-check

# Run all tests (unit + e2e)
pnpm test

# Run only unit tests
pnpm test:unit

# Run only E2E tests
pnpm test:e2e
```

---

## Running infra locally (recommended)

If your project depends on Postgres / MinIO / Redis, use the provided `docker-compose.yml`:

```bash
docker-compose up -d
# then run migrations if applicable:
pnpm migrate
```

(See `docs/README_DEV.md` for full infra and migration steps.)

---

## CI/CD & Quality Gates

### Continuous Integration

CI runs via **GitHub Actions** on every push and pull request:

- ✅ **Type checking** - All TypeScript must compile without errors
- ✅ **Linting** - Code must pass ESLint rules
- ✅ **Unit tests** - All unit tests must pass
- ✅ **Build** - All packages must build successfully
- 🔒 **Secret scanning** - Gitleaks scans for committed secrets (BLOCKS merge)
- 🔒 **Dependency review** - Checks for vulnerable dependencies in PRs

### Required Checks

Pull requests **cannot be merged** until:

1. All CI checks pass (build, lint, test, type-check)
2. Secret scanning passes (no secrets detected)
3. Code review approved by maintainer
4. No merge conflicts with main branch

### Automated Dependency Updates

**Dependabot** is configured to automatically:

- Check for dependency updates weekly (Mondays 9:00 CET)
- Group related updates (TypeScript, testing, linting)
- Create PRs for minor/patch updates
- Major version updates require manual review

### Security Scanning

- **Secret scanning:** Gitleaks checks every commit (blocks merge if secrets found)
- **Pre-commit hooks:** Optional local secret detection (see setup below)
- **Dependency audit:** pnpm audit runs on each CI build
- **Vulnerability alerts:** GitHub security advisories enabled

**Setup pre-commit secret detection (recommended):**

```bash
# Install gitleaks
brew install gitleaks  # macOS (see docs for other platforms)

# Setup hook
./scripts/setup_pre_commit_hooks.sh
```

📚 **Security documentation:**

- [Quick Start Security Guide](docs/QUICK_START_SECURITY.md) - Essential security practices
- [Comprehensive Security Guide](docs/SECURITY_SECRETS.md) - Secret detection and remediation

See `.github/dependabot.yml` and `.github/workflows/ci.yml` for CI configuration.

---

## Security notes (must read)

- **Never store private keys or raw secrets in the repo.** Use Vault/KMS for production secrets.
- **Nonce handling:** verify SIWE nonces server-side to prevent replay attacks.
- **Session management:** use secure, httpOnly cookies, short TTL in production.
- **Embeddings and raw evidence:** treat them as sensitive data — apply retention policy and encryption at rest (S3 server-side encryption).
- **Audit & logging:** keep audit trail for attestation issuance and admin overrides.

---

## Troubleshooting

- If `pnpm install` fails — clear pnpm store: `pnpm store prune`.
- If ports conflict, check `.env` for overridden ports (Next.js default 3000).
- If database migration fails: ensure `DATABASE_URL` points to a running Postgres instance and that `pgvector` extension is installed if vectors are used.

---

## Contributing

We welcome contributions! Please read our contribution guidelines:

1. **Read CONTRIBUTING.md** - Understand our workflow and standards
2. **Fork & Branch** - Create feature branch from `main`
3. **Code Quality** - Ensure all checks pass (`pnpm lint`, `pnpm type-check`, `pnpm test:unit`)
4. **Conventional Commits** - Use semantic commit messages
5. **Pull Request** - Open PR with clear description
6. **Code Review** - Address review feedback
7. **Update CHANGELOG.md** - Add entry for your changes

See `CONTRIBUTING.md` for detailed guidelines.

---

## Further docs

- **Contributing:** `CONTRIBUTING.md` - Guidelines for contributors
- **Changelog:** `CHANGELOG.md` - Project changes and releases
- **Developer guide:** `docs/README_DEV.md`
- **Testing guide:** `docs/TESTING.md`
- **Security & audits:** `docs/security/README.md`
- **Runbooks / DR:** `docs/runbooks/DR_RUNBOOK.md`

---

## License

MIT

## 🛡️ License &amp; IP Protection

This project is protected by **Aura Protection Suite v1.0**.

- **SDKs:** MIT (Open Source)
- **Core Engine:** Business Source License 1.1 (Source Available)
- **AI Models:** PolyForm Shield (Data Protected)

See <a>NOTICE.md</a> for details.
