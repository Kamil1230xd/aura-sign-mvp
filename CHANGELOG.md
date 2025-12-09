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
