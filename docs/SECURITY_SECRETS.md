# Secret Detection and Management

This document provides comprehensive guidance on detecting, preventing, and remediating secrets in the Aura-Sign MVP repository.

---

## Table of Contents

1. [Overview](#overview)
2. [Prevention: Pre-commit Hooks](#prevention-pre-commit-hooks)
3. [Detection: CI/CD Integration](#detection-cicd-integration)
4. [Secret Management Best Practices](#secret-management-best-practices)
5. [Remediation: Cleaning Git History](#remediation-cleaning-git-history)
6. [Gitleaks Configuration](#gitleaks-configuration)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The repository uses multiple layers of secret detection to prevent credentials from being committed:

1. **Pre-commit hooks** - Local detection before commits (optional but recommended)
2. **CI/CD scanning** - Automated scanning on every push and PR (required, blocks merge)
3. **Configuration** - `.gitleaks.toml` defines what patterns to detect and allowlist

**Security Philosophy:**

- Prevention is better than remediation
- Defense in depth: multiple detection layers
- Developer-friendly: clear errors and remediation steps
- No secrets in code, ever

---

## Prevention: Pre-commit Hooks

### Quick Setup

Install pre-commit hooks to detect secrets before they're committed:

```bash
# From repository root
./scripts/setup_pre_commit_hooks.sh
```

This script:

- Creates a pre-commit hook in `.git/hooks/`
- Checks if gitleaks is installed
- Runs automatically before each `git commit`
- Blocks commits if secrets are detected

### Installing Gitleaks

The pre-commit hook requires [gitleaks](https://github.com/gitleaks/gitleaks) to be installed:

**macOS (Homebrew):**

```bash
brew install gitleaks
```

**Linux (Binary Install):**

```bash
# Check for latest version at: https://github.com/gitleaks/gitleaks/releases
# Example with v8.18.1 (replace with latest):
wget https://github.com/gitleaks/gitleaks/releases/download/v8.18.1/gitleaks_8.18.1_linux_x64.tar.gz
tar -xzf gitleaks_8.18.1_linux_x64.tar.gz
sudo mv gitleaks /usr/local/bin/
```

**Windows (Scoop):**

```bash
scoop install gitleaks
```

**Docker (No Installation):**

```bash
# Add alias to ~/.bashrc or ~/.zshrc
alias gitleaks='docker run --rm -v "$(pwd):/repo" zricethezav/gitleaks:latest'
```

### How the Pre-commit Hook Works

When you run `git commit`:

1. Hook runs `gitleaks protect --staged` on files you're committing
2. If secrets detected:
   - ❌ Commit is blocked
   - Error message shows what was found and where
   - You must fix the issue and try again
3. If no secrets detected:
   - ✅ Commit proceeds normally

### Bypassing the Hook (NOT RECOMMENDED)

In rare cases where you need to bypass the hook:

```bash
# Skip all pre-commit hooks
git commit --no-verify -m "message"
```

**⚠️ WARNING:** Bypassing the hook doesn't bypass CI. Your PR will still be blocked if secrets are detected.

---

## Detection: CI/CD Integration

### Automated Scanning

Every push and pull request triggers secret scanning in GitHub Actions:

```yaml
# .github/workflows/ci.yml
- name: Secret scan (gitleaks) - REQUIRED
  uses: gitleaks/gitleaks-action@v2
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Behavior:**

- ✅ Scans full git history (not just changed files)
- ❌ Blocks PR merge if secrets found
- 📊 Reports findings in workflow logs
- 🔒 Cannot be bypassed or disabled

### Viewing Scan Results

If CI detects secrets:

1. Go to the failing workflow run in GitHub Actions
2. Open the "Secret scan (gitleaks)" step
3. Review the findings:
   - **File**: Which file contains the secret
   - **Line**: Exact line number
   - **Rule**: What type of secret was detected
   - **Secret**: Redacted preview of the match

4. Follow remediation steps below

---

## Secret Management Best Practices

### ✅ DO

**Use environment variables:**

```bash
# .env.local (gitignored)
DATABASE_URL=postgresql://user:actual_password@localhost:5432/db
SESSION_SECRET=real_secret_here
```

**Reference in code:**

```typescript
const dbUrl = process.env.DATABASE_URL;
const secret = process.env.SESSION_SECRET;
```

**Use placeholder values in examples:**

```bash
# .env.example (committed)
DATABASE_URL=postgresql://YOUR_DB_USER:YOUR_DB_PASSWORD@localhost:5432/db
SESSION_SECRET=YOUR_SESSION_SECRET_HERE_MIN_32_CHARS
```

**Generate strong secrets:**

```bash
# Generate 32-character base64 secret
openssl rand -base64 32

# Generate multiple secrets
for i in {1..3}; do openssl rand -base64 32; done
```

**Use secret management tools in production:**

- AWS Secrets Manager / Systems Manager Parameter Store
- Azure Key Vault
- Google Cloud Secret Manager
- HashiCorp Vault
- Kubernetes Secrets

### ❌ DON'T

**Don't commit secrets directly:**

```typescript
// ❌ BAD
const apiKey = 'sk_live_51HqJ8K2eZ...';
const password = 'MyP@ssw0rd123';
```

**Don't commit .env files:**

```bash
# ❌ BAD - These should be in .gitignore
.env
.env.local
.env.production
```

**Don't use weak secrets:**

```bash
# ❌ BAD - Too simple/guessable
PASSWORD=password123
SESSION_SECRET=secret
API_KEY=test
```

**Don't store secrets in:**

- Source code files
- Configuration files committed to git
- Documentation or README files
- Comments or commit messages
- Test files (use mocks/stubs instead)

---

## Remediation: Cleaning Git History

If secrets were already committed, they must be removed from git history.

### ⚠️ IMPORTANT

Removing secrets from history **rewrites git history** and requires force-pushing. Coordinate with your team before doing this.

### Option 1: BFG Repo-Cleaner (Recommended)

[BFG](https://rtyley.github.io/bfg-repo-cleaner/) is faster and easier than `git filter-branch`.

**Install BFG:**

```bash
# macOS
brew install bfg

# Or download jar
wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar
```

**Remove secrets from history:**

```bash
# 1. Clone a fresh copy
git clone --mirror https://github.com/Kamil1230xd/aura-sign-mvp.git
cd aura-sign-mvp.git

# 2. Create a file with secrets to remove (one per line)
cat > secrets.txt <<EOF
aura_pass
minio123
old_api_key_here
EOF

# 3. Run BFG to remove the secrets
bfg --replace-text secrets.txt

# 4. Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 5. Push (⚠️ rewrites history)
git push --force

# 6. Team must re-clone
# All team members need to:
cd ../aura-sign-mvp
git fetch origin
git reset --hard origin/main
```

### Option 2: Git Filter-Repo

[git-filter-repo](https://github.com/newren/git-filter-repo) is a modern alternative to `git filter-branch`.

**Install:**

```bash
# macOS
brew install git-filter-repo

# Linux (via pip)
pip3 install git-filter-repo
```

**Remove secrets:**

```bash
# 1. Backup your repo
git clone https://github.com/Kamil1230xd/aura-sign-mvp.git aura-sign-mvp-backup

# 2. Create expressions file
cat > expressions.txt <<EOF
aura_pass==>REDACTED
minio123==>REDACTED
EOF

# 3. Run filter-repo
git filter-repo --replace-text expressions.txt

# 4. Push (⚠️ rewrites history)
git push origin --force --all
git push origin --force --tags
```

### Option 3: Manual Git Filter-Branch

Last resort if other tools aren't available:

```bash
# Remove specific file from all history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch path/to/file/with/secrets" \
  --prune-empty --tag-name-filter cat -- --all

# Replace text in all files
git filter-branch --force --tree-filter \
  "find . -type f -exec sed -i 's/aura_pass/REDACTED/g' {} \;" \
  HEAD

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push
git push origin --force --all
```

### After Removing Secrets

Once secrets are removed from git history:

1. **Rotate the compromised secrets immediately**
   - Change database passwords
   - Regenerate API keys
   - Update all affected systems

2. **Notify your team**
   - Everyone must re-clone the repository
   - Old clones will have diverged history

3. **Verify removal**

   ```bash
   # Scan cleaned history
   gitleaks detect --config=.gitleaks.toml --verbose
   ```

4. **Update documentation**
   - Record what was rotated
   - Update runbooks with new credentials

---

## Gitleaks Configuration

### Configuration File

The repository uses `.gitleaks.toml` to configure secret detection.

**Key sections:**

```toml
# Files to never scan
[allowlist]
paths = [
    '''\.env\.example$''',
    '''README\.md$''',
]

# Patterns that are safe (not real secrets)
regexes = [
    '''placeholder''',
    '''YOUR_.*_HERE''',
]

# Known safe example values
stopwords = [
    'replace_me_with_secure_random',
    'YOUR_SESSION_SECRET_HERE',
]
```

### Custom Rules

The configuration includes custom rules for project-specific secrets:

- `iron-session-password` - Detects Iron Session secrets
- `session-secret` - Detects session management secrets
- `postgres-password` - Detects PostgreSQL credentials
- `minio-password` - Detects MinIO/S3 credentials
- `database-url-with-password` - Detects DB URLs with embedded passwords

### Adding Allowlist Entries

If you have a false positive:

1. Verify it's truly safe (not a real secret)
2. Edit `.gitleaks.toml`
3. Add to appropriate allowlist section:

```toml
# For specific files
[allowlist]
paths = [
    '''path/to/safe/file\.ext$''',
]

# For patterns
[allowlist]
regexes = [
    '''your-safe-pattern-here''',
]

# For specific values
stopwords = [
    'your_safe_example_value',
]
```

4. Test the configuration:

```bash
gitleaks detect --config=.gitleaks.toml --verbose
```

---

## Troubleshooting

### "Gitleaks not found" when committing

**Solution:** Install gitleaks (see [Installing Gitleaks](#installing-gitleaks))

Or bypass temporarily (not recommended):

```bash
git commit --no-verify
```

### False Positives

If gitleaks detects something that's not a real secret:

1. **Verify it's truly safe** - Double-check the finding
2. **Update .gitleaks.toml** - Add to allowlist
3. **Test locally:**
   ```bash
   gitleaks detect --config=.gitleaks.toml --verbose
   ```
4. **Commit the config update**

### Pre-commit Hook Not Running

Check if hook is executable:

```bash
ls -la .git/hooks/pre-commit
# Should show: -rwxr-xr-x

# If not executable:
chmod +x .git/hooks/pre-commit
```

Re-run setup script:

```bash
./scripts/setup_pre_commit_hooks.sh
```

### CI Failing but Local Hook Passes

CI scans the **entire git history**, while the pre-commit hook only scans **staged files**.

Check full history locally:

```bash
gitleaks detect --config=.gitleaks.toml --verbose
```

If secrets found in history, see [Remediation](#remediation-cleaning-git-history).

### "POSTGRES_PASSWORD must be set" when running docker-compose

The updated `docker-compose.yml` requires environment variables:

```bash
# Create .env.local with required variables
cat > .env.local <<EOF
POSTGRES_USER=myuser
POSTGRES_PASSWORD=$(openssl rand -base64 32)
POSTGRES_DB=aura
MINIO_ROOT_USER=minio
MINIO_ROOT_PASSWORD=$(openssl rand -base64 32)
EOF

# Or use the bootstrap script
./scripts/bootstrap_local_dev.sh
```

### Need Help?

- Check CI logs for detailed findings
- Review `.gitleaks.toml` for configuration
- See Gitleaks documentation: https://github.com/gitleaks/gitleaks
- Ask in team chat or open an issue

---

## Quick Reference

### Common Commands

```bash
# Setup pre-commit hooks
./scripts/setup_pre_commit_hooks.sh

# Scan current working directory
gitleaks detect --config=.gitleaks.toml --verbose

# Scan staged files only
gitleaks protect --staged --config=.gitleaks.toml

# Generate a secret
openssl rand -base64 32

# Test gitleaks configuration
gitleaks detect --config=.gitleaks.toml --no-git
```

### File Locations

- `.gitleaks.toml` - Gitleaks configuration
- `.git/hooks/pre-commit` - Pre-commit hook script
- `scripts/setup_pre_commit_hooks.sh` - Hook setup script
- `.github/workflows/ci.yml` - CI configuration
- `.env.example` - Template with placeholders
- `.env.local` - Your local secrets (gitignored)

---

**Remember:** When in doubt, use environment variables and never commit secrets!
