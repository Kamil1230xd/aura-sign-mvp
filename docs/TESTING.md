# Testing Guide

This document describes the testing infrastructure and practices for the Aura-Sign MVP monorepo.

## Overview

The project uses a hybrid testing approach:
- **Unit Tests**: Using Vitest for TypeScript packages
- **E2E Tests**: Using Playwright for web applications

## Running Tests

### Run All Tests

From the root of the monorepo:

```bash
# Run all tests (unit + e2e)
pnpm test

# Run only unit tests for packages
pnpm test:unit

# Run only E2E tests for web apps
pnpm test:e2e
```

### Run Package-Specific Tests

```bash
# Run tests for client-ts package
pnpm --filter @aura-sign/client test

# Run tests for react package
pnpm --filter @aura-sign/react test

# Run tests in watch mode
pnpm --filter @aura-sign/client test:watch
```

### Run E2E Tests

```bash
# Run E2E tests
pnpm test:e2e

# Run E2E tests with UI
pnpm --filter web test:e2e:ui

# View last E2E test report
pnpm --filter web test:e2e:report
```

## Test Structure

### Unit Tests (Vitest)

Unit tests are located alongside source files with `.test.ts` or `.test.tsx` extensions:

```
packages/
  client-ts/
    src/
      client.ts
      client.test.ts      # Unit tests
      types.ts
  react/
    src/
      types.ts
      types.test.ts       # Unit tests
      hooks/
        useAuraUser.ts
```

#### Configuration

Each package with unit tests has a `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // or 'happy-dom' for React
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['dist', 'node_modules', '**/*.test.ts']
    }
  }
});
```

### E2E Tests (Playwright)

E2E tests are located in the `apps/web/tests/` directory:

```
apps/
  web/
    tests/
      similarity.spec.ts   # E2E tests
    playwright.config.ts   # Playwright configuration
```

#### Configuration

Playwright is configured in `apps/web/playwright.config.ts`:
- Base URL: `http://localhost:3000` (configurable via `API_BASE_URL` env var)
- Runs on Chromium by default
- Retries failed tests 2 times on CI
- Generates HTML reports

## Writing Tests

### Unit Tests Example

```typescript
import { describe, it, expect, vi } from 'vitest';
import { AuraClient } from './client';

describe('AuraClient', () => {
  it('should initialize with config', () => {
    const client = new AuraClient({ baseUrl: 'http://localhost:3000' });
    expect(client).toBeInstanceOf(AuraClient);
  });
});
```

### E2E Tests Example

```typescript
import { test, expect } from '@playwright/test';

test('should return valid response', async ({ request }) => {
  const response = await request.post('/api/endpoint', {
    data: { key: 'value' }
  });
  
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data).toHaveProperty('result');
});
```

## Test Coverage

Currently, the following packages have unit tests:
- `@aura-sign/client` - 12 tests covering the API client
- `@aura-sign/react` - 7 tests covering type definitions

The following packages are planned for testing:
- `@aura-sign/next-auth` - Authentication handlers
- `@aura-sign/trustmath` - Trust calculation logic
- `@aura-sign/database-client` - Database operations

## CI/CD Integration

Tests are automatically run in CI/CD pipelines:
- All unit tests run on every commit
- E2E tests run on pull requests (requires running server)
- Failed tests block merging

## Best Practices

1. **Test Files**: Place test files next to source files with `.test.ts` extension
2. **Naming**: Use descriptive test names that explain what is being tested
3. **Isolation**: Each test should be independent and not rely on others
4. **Mocking**: Mock external dependencies (APIs, databases) in unit tests
5. **Coverage**: Aim for high coverage of critical paths and business logic
6. **Speed**: Keep unit tests fast (< 100ms each), use E2E for integration testing

## Troubleshooting

### Unit Tests Failing

```bash
# Clear build artifacts
pnpm clean

# Reinstall dependencies
pnpm install

# Run tests with verbose output
pnpm --filter <package-name> test -- --reporter=verbose
```

### E2E Tests Failing

```bash
# Ensure server is running (E2E tests expect a running server)
pnpm dev

# In another terminal, run E2E tests
pnpm test:e2e

# View the test report for details
pnpm --filter web test:e2e:report
```

### Missing Playwright Browsers

```bash
# Install Playwright browsers
cd apps/web
pnpx playwright install
```

## Adding Tests to New Packages

1. Add test script to `package.json`:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

2. Add vitest as a dev dependency:
```bash
pnpm add -D --filter <package-name> vitest
```

3. Create `vitest.config.ts` in the package root

4. Write tests in `src/*.test.ts` files

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
