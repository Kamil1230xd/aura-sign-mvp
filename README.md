# Aura-Sign MVP

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
```

The bootstrap script handles dependencies, environment setup, database initialization, and more.

### Option 2: Manual Setup

```bash
# 1) Install dependencies
pnpm install

# 2) Create .env from template
cp .env.example .env
# edit .env to add values (see .env.example for required keys)

# 3) Start development (monorepo)
pnpm dev

# 4) Or run only demo
pnpm demo
```

---

## Environment variables (.env.example)

A `.env.example` template should exist in repo root with at least:

```bash
# Postgres / DB (if used)
DATABASE_URL=postgresql://user:pass@localhost:5432/aura

# SIWE / auth
NEXT_PUBLIC_APP_NAME=Aura-Sign-Demo
SESSION_SECRET=replace_me_with_secure_random
IRON_SESSION_PASSWORD=long_random_password_here

# Storage
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minio
MINIO_SECRET_KEY=minio123

# Worker / queue
REDIS_URL=redis://localhost:6379

# Optional (embeddings)
EMBEDDING_API=http://localhost:4001
```

> **Security note:** Do not commit your `.env` — use `.env.example` only.

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

## CI / Security

CI runs via **GitHub Actions** — build, test, (optionally) migrate & e2e.

**Security:** enable Dependabot + scheduled `security-audit.yml`.

Add secret scanning in CI (gitleaks/trufflehog). See `docs/security/` for automation details.

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

1. Fork → feature branch → push → PR
2. All PRs must pass: linting, unit tests, CI e2e (where applicable).
3. Include CHANGELOG entry for breaking changes.

---

## Further docs

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
