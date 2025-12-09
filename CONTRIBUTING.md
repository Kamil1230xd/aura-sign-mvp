# Contributing to Aura-Sign MVP

Thank you for your interest in contributing to Aura-Sign MVP! This document provides guidelines and instructions for contributing to the project.

## Getting Started

### Prerequisites

- Node.js 20 or higher
- pnpm 8 or higher
- Git

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/Kamil1230xd/aura-sign-mvp.git
   cd aura-sign-mvp
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Run tests and type checks:
   ```bash
   pnpm type-check
   pnpm test:unit
   pnpm lint
   ```

## Code Quality Standards

### TypeScript

- All code must pass `pnpm type-check` without errors
- Use strict TypeScript settings (no `any` types unless absolutely necessary)
- Export types and interfaces for public APIs
- Use explicit return types for functions

### Linting

- Run `pnpm lint` before committing
- Fix all ESLint errors and warnings
- Follow the project's ESLint configuration

### Formatting

- Code is formatted using Prettier
- Run `pnpm format` to auto-format all files
- Run `pnpm format:check` to verify formatting
- Configuration is in `.prettierrc`

### Testing

- Write unit tests for new functionality
- Ensure all tests pass with `pnpm test:unit`
- Maintain or improve code coverage
- Tests should be in `*.test.ts` files alongside source code

## Git Workflow

### Branching Strategy

- `main` - production-ready code
- Feature branches: `feature/description`
- Bug fixes: `fix/description`
- CI/CD changes: `ci/description`
- Documentation: `docs/description`

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic changes)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes
- `perf`: Performance improvements
- `security`: Security improvements

Examples:
```
feat(auth): add SIWE authentication support
fix(client): handle network errors gracefully
docs: update README with setup instructions
ci: add secret scanning to workflow
```

### Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all checks pass:
   ```bash
   pnpm type-check
   pnpm lint
   pnpm test:unit
   pnpm build
   ```
4. Commit with conventional commit messages
5. Push to your branch
6. Open a pull request with:
   - Clear title following conventional commits
   - Description of changes
   - Link to related issue (if applicable)
   - List of testing performed

### Pull Request Checklist

- [ ] Code passes all type checks
- [ ] Code passes all lint checks
- [ ] All tests pass
- [ ] New tests added for new functionality
- [ ] Documentation updated (if applicable)
- [ ] Commit messages follow conventional commits
- [ ] No secrets or sensitive data committed
- [ ] Changes are minimal and focused

## Security

### Secret Management

- **NEVER** commit secrets, API keys, or credentials
- Use environment variables for sensitive configuration
- Add sensitive files to `.gitignore`
- Use GitHub Secrets for CI/CD credentials
- If you accidentally commit a secret:
  1. Revoke/rotate the secret immediately
  2. Remove it from git history
  3. Report to maintainers

### Security Scanning

- All PRs are scanned for secrets using gitleaks
- PRs with detected secrets will be blocked
- Dependencies are scanned for vulnerabilities
- Address security vulnerabilities promptly

## Code Review

All contributions require code review:

- Code reviews ensure quality and consistency
- Be respectful and constructive in reviews
- Address review comments promptly
- Maintainers will merge approved PRs

## Development Workflow

### Local Development

```bash
# Start all packages in development mode
pnpm dev

# Start only the demo site (port 3001)
pnpm demo

# Build all packages
pnpm build

# Run type checking
pnpm type-check

# Run linting
pnpm lint

# Run unit tests
pnpm test:unit

# Format code
pnpm format
```

### Package-Specific Development

```bash
# Work on specific package
pnpm --filter @aura-sign/client dev
pnpm --filter demo-site dev

# Test specific package
pnpm --filter @aura-sign/client test

# Build specific package
pnpm --filter @aura-sign/client build
```

## Monorepo Structure

```
/apps
  /demo-site    - Demo Next.js application
  /web          - Main web application
/packages
  /client-ts    - TypeScript client SDK
  /react        - React components and hooks
  /next-auth    - SIWE authentication handler
  /database-client - Prisma database client
  /trustmath    - Trust calculations
```

## License

By contributing, you agree that your contributions will be licensed under the project's license. See `NOTICE.md` for details on the hybrid licensing model.

## Questions?

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- Reach out to maintainers for guidance

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [pnpm Documentation](https://pnpm.io/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Next.js Documentation](https://nextjs.org/docs)
