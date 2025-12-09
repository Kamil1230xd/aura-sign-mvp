# Secret Detection and Remediation Guide

This guide explains how to detect secrets in the repository, prevent new secrets from being committed, and remediate secrets that were accidentally committed to git history.

## Table of Contents

1. [Prevention: Pre-commit Hooks](#prevention-pre-commit-hooks)
2. [Detection: Scanning for Secrets](#detection-scanning-for-secrets)
3. [Remediation: Removing Secrets from History](#remediation-removing-secrets-from-history)
4. [CI/CD Integration](#cicd-integration)
5. [Best Practices](#best-practices)

---

## Prevention: Pre-commit Hooks

### Option 1: Using pre-commit framework (Recommended)

Install the pre-commit framework:

```bash
# Install pre-commit
pip install pre-commit

# Install the git hooks
pre-commit install

# Test it works
pre-commit run --all-files
```

The `.pre-commit-config.yaml` file configures gitleaks to scan for secrets before each commit.

### Option 2: Using Husky (npm/pnpm-based)

If you prefer npm-based tooling:

```bash
# Install dependencies (includes husky)
pnpm install

# Husky hooks are automatically installed via "prepare" script
```

The `.husky/pre-commit` hook will run gitleaks on staged files.

### Manual Secret Check

You can manually check for secrets without committing:

```bash
# Using installed gitleaks
gitleaks protect --verbose --redact --staged

# Using Docker (no installation required)
pnpm run check-secrets
```

---

## Detection: Scanning for Secrets

### Scan Current Repository State

Check the current working directory for secrets:

```bash
# Using gitleaks CLI
gitleaks detect --source . -v

# Using Docker
docker run --rm -v $(pwd):/path zricethezav/gitleaks:latest detect --source=/path -v
```

### Scan Git History

Check the entire git history for secrets:

```bash
# Scan all commits
gitleaks detect --source . -v --log-opts="--all"

# Scan specific branch
gitleaks detect --source . -v --log-opts="origin/main"

# Generate a report
gitleaks detect --source . -v --report-path=gitleaks-report.json
```

### Using the Detection Script

We provide a helper script for comprehensive scanning:

```bash
# Scan entire git history
./scripts/detect_secrets_in_history.sh

# Scan specific branch
./scripts/detect_secrets_in_history.sh origin/feature-branch

# Scan with custom report path
./scripts/detect_secrets_in_history.sh --report custom-report.json
```

---

## Remediation: Removing Secrets from History

If a secret was accidentally committed, follow these steps:

### Step 1: Rotate the Compromised Secret

**⚠️ CRITICAL: Always rotate the secret first!**

Once a secret is in git history, even if removed, it should be considered compromised.

1. Generate a new secret:
   ```bash
   openssl rand -base64 32
   ```

2. Update the secret in your systems:
   - Local `.env.local` file
   - CI/CD environment variables
   - Production secret management systems (Vault, AWS Secrets Manager, etc.)

3. Revoke/invalidate the old secret if possible

### Step 2: Remove Secret from Git History

#### Option A: Using BFG Repo-Cleaner (Recommended for large repos)

```bash
# Install BFG (one-time setup)
# macOS: brew install bfg
# Linux: download from https://rtyley.github.io/bfg-repo-cleaner/

# Create a file with the secret pattern
echo "old_secret_value" > secrets.txt

# Remove secret from history
bfg --replace-text secrets.txt

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (⚠️ coordinate with team!)
git push --force --all
git push --force --tags
```

#### Option B: Using git filter-repo

```bash
# Install git-filter-repo
pip install git-filter-repo

# Remove specific file from history
git filter-repo --path .env.local --invert-paths

# Or remove specific text pattern
git filter-repo --replace-text <(echo "old_secret_value==>REDACTED")

# Force push (⚠️ coordinate with team!)
git push --force --all
git push --force --tags
```

#### Option C: Using git filter-branch (Manual, more control)

```bash
# Remove a specific file
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.local" \
  --prune-empty --tag-name-filter cat -- --all

# Remove specific text pattern
git filter-branch --force --tree-filter \
  "find . -type f -exec sed -i 's/old_secret_value/REDACTED/g' {} \;" \
  --prune-empty --tag-name-filter cat -- --all

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (⚠️ coordinate with team!)
git push --force --all
git push --force --tags
```

### Step 3: Notify Team Members

After rewriting history:

1. **Notify all team members** that history was rewritten
2. Team members must:
   ```bash
   # Backup local changes
   git fetch origin
   git reset --hard origin/main
   
   # Or rebase local branches
   git fetch origin
   git rebase origin/main
   ```

3. Update any open pull requests

### Step 4: Verify Removal

```bash
# Scan history again to confirm
gitleaks detect --source . -v --log-opts="--all"

# Check specific file history
git log --all --full-history --source -- .env.local
```

---

## CI/CD Integration

### GitHub Actions

The repository includes automated secret scanning in CI:

- **Gitleaks scan**: Runs on every push and PR (`.github/workflows/ci.yml`)
- **Blocks merge**: If secrets are detected, the build fails
- **Full history scan**: Uses `fetch-depth: 0` to scan all commits

Configuration location: `.github/workflows/ci.yml` (security-audit job)

### Local CI Simulation

Test the CI checks locally:

```bash
# Run the same checks as CI
pnpm lint
pnpm type-check
pnpm test:unit

# Secret scanning (same as CI)
gitleaks detect --source . -v --log-opts="--all"
```

---

## Best Practices

### For Developers

1. **Never commit secrets**
   - Use `.env.local` (gitignored) for local secrets
   - Use `.env.example` for placeholder values only
   - Double-check before committing: `git diff --staged`

2. **Use strong random secrets**
   ```bash
   # Generate secure secrets
   openssl rand -base64 32
   ```

3. **Enable pre-commit hooks**
   ```bash
   pre-commit install
   ```

4. **Rotate secrets regularly**
   - Monthly for development
   - Quarterly for staging
   - Per compliance schedule for production

5. **Review your commits**
   ```bash
   # Check what you're about to commit
   git diff --staged
   
   # Use interactive staging
   git add -p
   ```

### For Repository Maintainers

1. **Enforce secret scanning in CI**
   - Keep gitleaks enabled (no `continue-on-error`)
   - Block merges on secret detection

2. **Require pre-commit hooks**
   - Document in CONTRIBUTING.md
   - Include setup in onboarding

3. **Regular audits**
   ```bash
   # Monthly full history scan
   ./scripts/detect_secrets_in_history.sh
   ```

4. **Update .gitleaks.toml allowlist**
   - Review and minimize allowlisted patterns
   - Document why each allowlist entry exists

5. **Secret management policy**
   - Document where secrets should be stored (Vault, AWS Secrets Manager)
   - Define rotation schedules
   - Create incident response plan

### For Operations/Security Teams

1. **Production secrets**
   - Never use the same secrets as development
   - Use secret management systems (HashiCorp Vault, AWS Secrets Manager)
   - Enable audit logging for secret access

2. **Access control**
   - Limit who can access production secrets
   - Use service accounts for CI/CD
   - Rotate credentials on team member departure

3. **Monitoring**
   - Set up alerts for secret usage anomalies
   - Monitor secret access logs
   - Track secret rotation compliance

4. **Incident response**
   - Have a plan for compromised secrets
   - Define escalation paths
   - Document post-incident steps

---

## Configuration Files

- `.gitleaks.toml` - Gitleaks configuration and allowlists
- `.pre-commit-config.yaml` - Pre-commit hooks configuration
- `.husky/pre-commit` - Husky pre-commit hook
- `.github/workflows/ci.yml` - CI secret scanning configuration

---

## Troubleshooting

### False Positives

If gitleaks reports a false positive:

1. Verify it's actually not a secret
2. Add to `.gitleaks.toml` allowlist:
   ```toml
   [allowlist]
   regexes = [
     '''your-false-positive-pattern'''
   ]
   ```
3. Or add to specific file allowlist:
   ```toml
   [allowlist]
   paths = [
     '''path/to/file\.ext$'''
   ]
   ```

### Gitleaks Not Running

```bash
# Check gitleaks installation
which gitleaks
gitleaks version

# Install if missing
# macOS: brew install gitleaks
# Linux: https://github.com/gitleaks/gitleaks#installing

# Check pre-commit
pre-commit run --all-files

# Reinstall hooks
pre-commit uninstall
pre-commit install
```

### History Rewrite Issues

If you encounter problems after rewriting history:

```bash
# If you have uncommitted changes, stash them
git stash

# Get clean state from remote
git fetch origin
git reset --hard origin/main

# Reapply your changes
git stash pop

# Force update your fork
git push --force origin main
```

---

## Additional Resources

- [Gitleaks Documentation](https://github.com/gitleaks/gitleaks)
- [Pre-commit Documentation](https://pre-commit.com)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [Git Filter-Repo](https://github.com/newren/git-filter-repo)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

---

## Support

For questions or issues:

1. Check this documentation
2. Review `.gitleaks.toml` configuration
3. Open an issue in the repository
4. Contact the security team
