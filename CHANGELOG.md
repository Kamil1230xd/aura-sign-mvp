
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- ESLint configuration for monorepo with TypeScript support
- Prettier configuration for consistent code formatting
- Dependabot configuration for automated dependency updates
- Enhanced CI/CD workflow with secret scanning and dependency review
- CONTRIBUTING.md with development guidelines
- CHANGELOG.md for tracking changes

### Fixed

- TypeScript compilation errors in next-auth package
- iron-session v8 API compatibility (added IronSession types)
- Support for both Pages API and App Router in next-auth
- Database-client test script syntax error (unterminated quote)
- ESLint configuration for demo-site (non-interactive setup)

### Changed

- Override noEmit in all package tsconfigs to enable builds
- Updated pnpm-lock.yaml with new dependencies
- Enhanced CI workflow with better caching and security checks

### Security

- Added required secret scanning with gitleaks
- Added dependency review for pull requests
- Configured security scanning to fail on detection

## [0.2.0] - 2026-07-12 - Dependency Updates

### Added

- HAR recording on Tracing API (Playwright 1.60.0+)
- Drop API for external drag-and-drop testing (Playwright)
- Aria snapshots support in testing (Vitest, Playwright)
- mask-position-x and mask-position-y CSS prefixing (Autoprefixer 10.5.0)

### Updated Dependencies

#### Production
- **ethers**: 6.16.0 → 6.17.0
  - Added provider requestRate throttle support
  - ENSv2 integrations improvements
  - Added transactionsRoot to Block
  - Fixed HTTP redirect handling (301/302 → 307/308)

#### Development
- **Testing & CI**
  - `vitest`: 4.0.15 → 4.1.6 (performance improvements, bug fixes)
  - `@vitest/ui`: 4.0.15 → 4.1.6
  - `@playwright/test`: 1.57.0 → 1.60.0 (HAR, Drop API, ARIA snapshots)
  - `happy-dom`: 20.0.11 → 20.9.0
  - `@testing-library/react`: 16.3.0 → 16.3.2

- **Code Quality**
  - `prettier`: 3.7.4 → 3.8.3 (SCSS if() function fix, Angular v21.2 support)
  - `postcss`: 8.5.6 → 8.5.14 (custom syntax regression fix, XSS mitigation)
  - `autoprefixer`: 10.4.22 → 10.5.0 (mask-position support)

- **Build Tools**
  - `tsx`: 4.21.0 → 4.22.1 (tsconfig path alias fixes)
  - `eslint-config-next`: 14.2.33 → 14.2.35
  - `tailwindcss`: 3.4.18 → 3.4.19 (sibling-*() in calc() fix)

- **Types**
  - `@types/node`: 20.19.26 → 20.19.41

#### GitHub Actions (Node.js 24 Runtime)
- `actions/checkout`: 4 → 6 ✓ Node 24 compatible
- `actions/setup-node`: 4 → 6 ✓ Automatic caching improvements
- `pnpm/action-setup`: 2 → 6 ✓ pnpm 11 support
- `actions/cache`: 4 → 5 ✓ Node 24 runtime
- `actions/upload-artifact`: 4 → 7 ✓ Direct file uploads, ESM
- `gitleaks/gitleaks-action`: 2 → 3 ✓ Security scanning
- `actions/dependency-review-action`: 4 → 5 ✓ Patched version display
- `denoland/setup-deno`: 1.1.2 → 2.0.4
- `slsa-framework/slsa-github-generator`: 1.4.0 → 2.1.0

### Fixed

- SCSS formatting issues in Prettier
- Nested brackets parsing performance regression
- XSS vulnerability in PostCSS
- HTTP redirect method preservation
- Browser project reference in Playwright screenshots
- ReDoS vulnerability in minimatch (via actions/cache)

### Security

- Node.js 24 runtime migration for GitHub Actions (improves security posture)
- Updated minimum runner version requirement to v2.327.1
- Security patches in cache and artifact actions
- Gitleaks v3 with latest vulnerability definitions

### Changed

- GitHub Actions workflows now use Node.js 24 runtime (required for runner v2.327.1+)
- Playwright testing capabilities expanded with HAR, Drop, and ARIA APIs
- Vitest performance optimizations
- Development dependency matrix simplified with latest tool versions

### Notes

- Minimum GitHub Actions runner version: **v2.327.1** (required for Node 24 support)
- Self-hosted runners must be updated before deploying these changes
- No breaking changes in production dependencies
- All development tools maintain backward compatibility

## [0.1.0] - Initial Release

### Added

- Monorepo structure with pnpm workspaces
- TypeScript client SDK (@aura-sign/client)
- React components and hooks (@aura-sign/react)
- SIWE authentication with iron-session (@aura-sign/next-auth)
- Prisma database client with pgvector (@aura-sign/database-client)
- Trust math calculations (@aura-sign/trustmath)
- Demo Next.js application
- Docker compose setup for local development
- CI workflow with linting, type checking, and tests

---

## How to Update This Changelog

When making changes, add an entry under the `[Unreleased]` section in the appropriate category:

### Categories

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for security improvements

### Example Entry Format

```markdown
### Added

- New feature with brief description (#PR-number)
- Another feature (#PR-number)

### Fixed

- Bug fix description (#PR-number)
```

### Release Process

When creating a new release:

1. Move entries from `[Unreleased]` to a new version section
2. Add release date
3. Update version numbers
4. Create git tag
5. Push changes and tag

Example:

```markdown
## [0.2.0] - 2024-01-15

### Added

- Feature from unreleased section
```
