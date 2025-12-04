# CI/CD Quality Control Workflow

## Overview

The `ci-quality-control.yml` workflow provides comprehensive quality control, compatibility checks, and security scanning for the Aura-Sign MVP project.

## Workflow Triggers

The workflow runs on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Manual trigger via `workflow_dispatch`

## Jobs

### 1. Quality Control (`quality-control`)

Ensures code quality across multiple Node.js versions for compatibility.

**Matrix Strategy:**
- Node.js versions: 18.x, 20.x
- Fail-fast: disabled (all versions tested independently)

**Steps:**
1. **Checkout repository** - Gets the latest code
2. **Setup Node.js** - Configures specified Node version with npm cache
3. **Install pnpm** - Installs pnpm package manager (v8.15.0)
4. **Setup pnpm cache** - Caches pnpm store for faster builds
5. **Install dependencies** - Installs all project dependencies
6. **Type check** - Runs TypeScript type checking across all packages
7. **Lint check** - Runs ESLint on all packages
8. **Build all packages** - Compiles all TypeScript packages
9. **Security audit** - Checks for known vulnerabilities in dependencies
10. **Check outdated dependencies** - Identifies packages that need updates

**Features:**
- Automatic ESLint configuration for Next.js projects
- Continues on non-critical errors (type/lint) to show all issues
- Fails on build errors (must pass)

### 2. Compatibility Check (`compatibility-check`)

Analyzes project compatibility and scaling considerations.

**Steps:**
1. **Analyze bundle size** - Reports on build output sizes
2. **Check TypeScript version compatibility** - Ensures consistent TS versions
3. **Check Node.js engine compatibility** - Validates engine requirements
4. **Dependency tree analysis** - Shows dependency structure

**Purpose:**
- Identify potential scaling issues
- Ensure version consistency
- Monitor bundle sizes for performance

### 3. Security Scan (`security-scan`)

Performs comprehensive security scanning.

**Steps:**
1. **Run Trivy vulnerability scanner** - Scans filesystem for vulnerabilities
2. **Upload results to GitHub Security** - Integrates with GitHub Security tab
3. **Check for secrets** - Scans code for potential secrets/API keys

**Security Tools:**
- Trivy (Aqua Security)
- Pattern-based secret detection
- SARIF format for GitHub integration

### 4. Documentation Check (`documentation-check`)

Validates documentation quality.

**Steps:**
1. **Check README files** - Ensures documentation exists
2. **Check required files** - Validates presence of README.md, LICENSE, .env.example

### 5. Quality Report (`report-status`)

Generates summary report of all checks.

**Features:**
- Runs after all other jobs complete
- Always runs (even if previous jobs fail)
- Provides consolidated status summary
- Fails workflow if core quality checks fail

## Required Secrets

No additional secrets required. Uses default `GITHUB_TOKEN` for security scanning.

## Permissions

The workflow requires:
- `contents: read` - Read repository contents
- `pull-requests: write` - Comment on PRs
- `checks: write` - Create check runs

## CI Workflow Status

The workflow enforces quality gates:
- ✅ Build must pass
- ✅ Core quality checks must pass
- ⚠️ Type check warnings are noted but don't fail the build
- ⚠️ Lint warnings are noted but don't fail the build
- ⚠️ Security vulnerabilities are reported but don't block

## Local Development

To run the same checks locally:

```bash
# Install dependencies
pnpm install

# Type check
pnpm type-check

# Lint
pnpm lint

# Build
pnpm build

# Security audit
pnpm audit --audit-level=moderate

# Check outdated packages
pnpm outdated
```

## Troubleshooting

### Build Failures

If builds fail in CI but work locally:
1. Check Node.js version matches CI matrix
2. Clear pnpm cache: `pnpm store prune`
3. Delete `node_modules` and `pnpm-lock.yaml`, then `pnpm install`

### Type Check Errors

If type checking fails:
1. Ensure all `tsconfig.json` files have `"noEmit": false` for packages
2. Check that dependencies are correctly linked in monorepo
3. Run `pnpm type-check` locally to see detailed errors

### Security Alerts

If security scan finds vulnerabilities:
1. Review the vulnerability in the Security tab
2. Update affected packages: `pnpm update`
3. Check for security advisories: `pnpm audit`

## Extending the Workflow

To add new quality checks:

1. Add a new step to an existing job, or
2. Create a new job and add it to `report-status` needs array

Example adding a test job:

```yaml
test:
  name: Run Tests
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 20.x
    - name: Install pnpm
      uses: pnpm/action-setup@v2
      with:
        version: 8.15.0
    - name: Install dependencies
      run: pnpm install --frozen-lockfile
    - name: Run tests
      run: pnpm test
```

Then update `report-status`:

```yaml
report-status:
  needs: [quality-control, compatibility-check, security-scan, documentation-check, test]
  # ...
```

## Best Practices

1. **Keep builds fast** - Use caching effectively
2. **Fail fast on critical errors** - Build failures should stop the workflow
3. **Report all issues** - Non-critical checks should continue-on-error
4. **Regular updates** - Keep GitHub Actions and tools up to date
5. **Monitor bundle size** - Track growth over time

## Related Documentation

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [pnpm Monorepo Guide](https://pnpm.io/workspaces)
- [TypeScript Configuration](https://www.typescriptlang.org/tsconfig)
- [Trivy Scanner](https://github.com/aquasecurity/trivy)
