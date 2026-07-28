# Quick Start: Security Best Practices

This is a quick reference guide for developers working with Aura-Sign MVP. For comprehensive documentation, see [SECURITY_SECRETS.md](./SECURITY_SECRETS.md).

---

## 🚀 New Developer Checklist

When you first clone the repository:

### 1. Set Up Pre-commit Hooks (5 minutes)

```bash
# Install gitleaks (one-time)
brew install gitleaks  # macOS
# or see https://github.com/gitleaks/gitleaks for other platforms

# Set up pre-commit hook
./scripts/setup_pre_commit_hooks.sh
```

### 2. Create Your Local Environment File

```bash
# Copy template
cp .env.example .env.local

# Generate secure secrets
openssl rand -base64 32  # Copy this for each secret below

# Edit .env.local and replace ALL placeholders:
# - YOUR_DB_USER → your_username
# - YOUR_DB_PASSWORD → [paste generated secret]
# - YOUR_SESSION_SECRET_HERE_MIN_32_CHARS → [paste generated secret]
# - YOUR_IRON_SESSION_PASSWORD_HERE_MIN_32_CHARS → [paste generated secret]
# - YOUR_MINIO_USER → minio
# - YOUR_MINIO_PASSWORD → [paste generated secret]
```

### 3. Or Use the Bootstrap Script (Automated)

```bash
# This automatically generates all secrets and sets up everything
./scripts/bootstrap_local_dev.sh
```

---

## ⚡ Quick Commands

### Generate a Secure Secret

```bash
openssl rand -base64 32
```

### Scan Your Code for Secrets

```bash
# Before committing (if you have gitleaks installed)
gitleaks detect --config=.gitleaks.toml --verbose

# Scan only staged files
gitleaks protect --staged --config=.gitleaks.toml
```

### Start Infrastructure with Environment Variables

```bash
# Ensure .env.local exists with all required variables
docker-compose up -d
```

---

## ❌ Never Commit These

- `.env` or `.env.local` files _(gitignored)_
- API keys, tokens, passwords
- Private keys or certificates
- Real credentials in any format

---

## ✅ Always Do This

- Use environment variables for secrets
- Keep placeholders in `.env.example`
- Generate strong random secrets
- Set up pre-commit hooks
- Review your changes before committing

---

## 🆘 I Accidentally Committed a Secret!

**DO NOT** just delete it in a new commit - it stays in git history.

### Immediate Actions:

1. **Stop and assess**
   - Has the commit been pushed?
   - Is it in a PR?
   - Has anyone pulled it?

2. **Rotate the secret immediately**
   - Change the password/key/token
   - Update all systems using it

3. **Remove from git history**
   - See [SECURITY_SECRETS.md](./SECURITY_SECRETS.md#remediation-cleaning-git-history)
   - Use BFG Repo-Cleaner or git-filter-repo
   - Requires rewriting history and force push

4. **Notify your team**
   - Everyone needs to re-clone after history rewrite

---

## 📚 More Information

- **Comprehensive guide**: [docs/SECURITY_SECRETS.md](./SECURITY_SECRETS.md)
- **Contributing guidelines**: [CONTRIBUTING.md](../CONTRIBUTING.md)
- **Developer guide**: [docs/README_DEV.md](./README_DEV.md)

---

## 🔍 CI/CD Protection

Every push and PR is automatically scanned for secrets:

- ✅ **Pre-commit hook** (local, optional): Catches secrets before commit
- ✅ **GitHub Actions** (CI, required): Scans full history, blocks merge

You cannot merge PRs with secrets - the CI will fail.

---

## 💡 Pro Tips

1. **Use strong secrets in production**
   - Minimum 32 characters (base64 encoded)
   - Never reuse secrets across environments

2. **Keep secrets in secret managers**
   - AWS Secrets Manager
   - Azure Key Vault
   - Google Cloud Secret Manager
   - HashiCorp Vault

3. **Review before committing**

   ```bash
   git diff --staged  # Review what you're about to commit
   ```

4. **Update .gitleaks.toml for false positives**
   - Add safe patterns to allowlist
   - Document why they're safe

---

## ⚙️ Environment Variable Reference

| Variable                | Purpose                      | Example                               | Required |
| ----------------------- | ---------------------------- | ------------------------------------- | -------- |
| `DATABASE_URL`          | PostgreSQL connection        | `postgresql://user:pass@host:5432/db` | Yes      |
| `POSTGRES_USER`         | DB username (docker-compose) | `aura_user`                           | Yes      |
| `POSTGRES_PASSWORD`     | DB password (docker-compose) | `[32-char secret]`                    | Yes      |
| `SESSION_SECRET`        | Server session secret        | `[32-char secret]`                    | Yes      |
| `IRON_SESSION_PASSWORD` | Cookie encryption            | `[32-char secret]`                    | Yes      |
| `MINIO_ROOT_USER`       | MinIO username               | `minio`                               | Yes      |
| `MINIO_ROOT_PASSWORD`   | MinIO password               | `[32-char secret]`                    | Yes      |
| `REDIS_URL`             | Redis connection             | `redis://localhost:6379`              | No       |
| `EMBEDDING_API`         | Embeddings endpoint          | `http://localhost:4001`               | No       |

---

**Remember**: When in doubt, ask! Better to ask than to commit a secret.
