# Aura-IDToken / Aura-Sign MVP

Aura-IDToken (a.k.a. Aura-Sign MVP) — modularna platforma tożsamości oparta o **Sign-In With Ethereum (SIWE)**, rozszerzona o infrastrukturę weryfikacji, embeddingów i orkiestrację z zachowaniem silnych standardów bezpieczeństwa i operacyjności.

> Vision: zbudować bezpieczny, audytowalny i skalowalny protokół attestation + trust orchestration dla Web3 tożsamości.

---

## Najważniejsze funkcje

- 🔐 **SIWE Authentication** — bezpieczne logowanie portfelem, serwerowa weryfikacja podpisu i nonce protection.  
- 🏗️ **Monorepo (pnpm + turbo)** — separacja aplikacji i pakietów; spójne skrypty i CI.  
- ⚡ **TypeScript First** — ścisły typing i generowane klienty SDK.  
- 🎯 **Modular Design** — pakiety: `next-auth`, `client-ts`, `react`, `database-client` (pgvector).  
- 🧠 **Embedding & Trust Orchestrator** — async workers do generacji embeddingów, scoringu i budowy attestation.  
- ⚙️ **Operational Tooling** — raw SQL migrations, `docker-compose.yml`, `run_migrations.sh`, `reindex_ivf.sh`.  
- 🔎 **Security Automation** — `security_audit.sh`, GitHub Actions (CodeQL, scheduled audits), secret scan compatibility.  
- 📊 **Monitoring & DR** — Prometheus alerts, Grafana dashboards, runbooks (DR_RUNBOOK.md).

---

## Struktura repo (skrót)

```
/apps
  /demo-site                # Next.js demo (SIWE flows)
/packages
  /next-auth                # SIWE + iron-session
  /client-ts                # Typed client SDK
  /react                    # React components & hooks
  /database-client          # pgvector / DB helpers (opcjonalne)
  /trust-orchestrator       # worker skeletons (embedding, trust)
/scripts
  run_migrations.sh
  reindex_ivf.sh
  security_audit.sh
/docs
  /security
  /runbooks
  README_DEV.md
/prometheus
  alerts.yml
.github/workflows
  ci.yml
  security-audit.yml
docker-compose.yml
```

---

## Wymagania (lokalny dev / staging)

- Node 20+ (rekomendowane)  
- pnpm 8+  
- Docker + docker-compose (do uruchomienia Postgres+pgvector, MinIO, Redis)  
- Opcjonalnie: Vault/KMS dla sekretów produkcyjnych

---

## Szybki start (developer)

```bash
# 1. Install
pnpm install

# 2. Copy env template and edit
cp .env.example .env
# set: DATABASE_URL, SESSION_SECRET, IRON_SESSION_PASSWORD, REDIS_URL, MINIO_*

# 3. Start infra (optional)
docker-compose up -d

# 4. Run DB migrations
pnpm migrate         # maps to ./scripts/run_migrations.sh

# 5. Start dev
pnpm dev

# 6. Run worker (embedding)
pnpm dev:worker

# 7. Run security audit locally (optional)
./scripts/security_audit.sh
```

---

## Komendy developerskie (przydatne)

```bash
pnpm build
pnpm lint
pnpm type-check
pnpm test
pnpm migrate         # run_migrations.sh
pnpm reindex         # reindex_ivf.sh
pnpm dev:worker      # ts-node packages/trust-orchestrator/worker.ts
```

---

## .env.example (minimal)

```bash
DATABASE_URL=postgresql://admin:adminpass@localhost:5432/aura
SESSION_SECRET=replace_with_secure_random
IRON_SESSION_PASSWORD=very_long_random_string
REDIS_URL=redis://localhost:6379
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minio
MINIO_SECRET_KEY=minio123
EMBEDDING_API=http://localhost:4001
```

> Nie commituj .env. W produkcji użyj Vault lub KMS.

---

## Bezpieczeństwo (skrótowe wytyczne)

- Nie przechowuj prywatnych kluczy serwerowo. Wszystkie podpisy powinny być generowane po stronie klienta.
- Weryfikuj SIWE i nonce po stronie serwera, implementuj replay protection.
- Traktuj embeddings i surowe dowody (evidence) jako wrażliwe dane — szyfruj w spoczynku i ogranicz retencję.
- Ciągłe skanowanie: `pnpm audit` + scheduled CodeQL + secret-scan (gitleaks).
- Wymuszaj PRs z testami i lintem; nie merguj bez zielonego CI.

---

## Architektura (skrót)

![Architecture Diagram](docs/architecture/architecture-diagram.svg)

1. **Frontend (Next.js demo)** — SIWE flow, przedstawia klientowi nonce i odbiera podpis.
2. **next-auth** — serwerowa weryfikacja SIWE, sesje (iron-session).
3. **client-ts** — typed SDK do wywołań API i obsługi identity.
4. **Workers** — embedding generation, ai-verification, trust orchestration (BullMQ + Redis).
5. **Postgres + pgvector** — przechowywanie embeddingów, ivfflat/hnsw index.
6. **Trust Orchestrator** — reguły polityki, scoring, attestation JWS.
7. **Observability** — Prometheus, Grafana, alerty (queue depth, inference latency, vector query latency).
8. **CI/CD** — GitHub Actions (migrations + e2e + security-audit).

[View full architecture diagram](docs/architecture/architecture-diagram.svg)

---

## Runbooks i DR

Zajrzyj do `docs/runbooks/DR_RUNBOOK.md` — minimalne kroki przywracania DB, odbudowy vector indexów i sanity checks (smoke tests).

---

## Roadmap (skrót wykonawczy)

- **Faza 0** — lokalny prototyp (docker-compose, migrations, basic workers) — DONE/IN PROGRESS
- **Faza 1** — staging: index tuning, reindex scripts, backups — TODO/HIGH
- **Faza 2** — production: KMS signing, JWKS, monitoring + DR rehearsals — TODO/CRITICAL
- **Faza 3** — ecosystem: DID federation, policy engine (OPA), SDK stabilization — FUTURE

---

## Najważniejsze ryzyka i rekomendacje (actionable)

### P0 — krytyczne (natychmiast)

- Upewnij się, że production DB NIE jest publicznie dostępny — network ACL.
- Dodaj Dependabot + natychmiastowe skróty reagowania na high/critical CVE.
- Test restore backup: uruchom restore w osobnym DB i wykonaj smoke tests.

### P1 — wysokie

- Upewnij się, że migracje tworzą vector column via raw SQL (pgvector) — Prisma może nie obsługiwać vector typu natywnie.
- Dodaj DLQ i idempotent upsert w workerach.
- Włącz secret scanning w CI (gitleaks/trufflehog).

### P2 — średnie

- Tuning ivfflat/hnsw (lists, m, ef_construction).
- Zaplanuj politykę retencji embeddings i szyfrowania.

---

## Checklista PR przed merge (must-have)

- [ ] Unit tests green
- [ ] e2e tests green (staging)
- [ ] pnpm audit low-risk or fixed for high/critical
- [ ] No secrets in diff
- [ ] Migration SQL included for DB changes
- [ ] Metrics added for new endpoints / worker flows
- [ ] Documentation updated (docs/README_DEV.md)

---

## Co dodać / załączyć do repo (PR-ready)

1. `.github/dependabot.yml` — weekly security updates.
2. `.github/workflows/secret-scan.yml` — run gitleaks on PR.
3. `docs/security/SECURITY_AUDIT.md` (if missing) — standardized process.
4. `scripts/db_backup.sh` + scheduled CI job for backups.
5. `docs/architecture/architecture-diagram.svg` (layered stack).

---

## Kontakt & maintainers

- **Security contact (placeholder):** security@aura-idtoken.org
- **Maintainers:** core-devs / infra team (update in repo)

---

## License

MIT

## 🛡️ License &amp; IP Protection
This project is protected by **Aura Protection Suite v1.0**.
- **SDKs:** MIT (Open Source)
- **Core Engine:** Business Source License 1.1 (Source Available)
- **AI Models:** PolyForm Shield (Data Protected)

See <a>NOTICE.md</a> for details.
