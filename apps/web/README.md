# Aura-Sign Web

Web application with vector similarity API and end-to-end tests.

## Features

- Next.js 14 application
- Vector similarity API endpoint
- Playwright E2E tests
- Integration with database-client package

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## Testing

### Run E2E Tests

```bash
# Install Playwright browsers (first time only)
pnpm exec playwright install

# Run all E2E tests
pnpm test:e2e

# Run tests with UI
pnpm exec playwright test --ui

# Run specific test file
pnpm exec playwright test tests/similarity.spec.ts
```

### Test Different Environments

```bash
# Test against staging
BASE_URL=https://staging.example.com pnpm test:e2e

# Test against production
BASE_URL=https://example.com pnpm test:e2e
```

## API Endpoints

### POST /api/similarity

Find similar identities based on embedding vector.

**Request:**
```json
{
  "embedding": [/* array of 1536 numbers */],
  "limit": 10,
  "threshold": 0.8
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "identity-123",
      "distance": 0.15
    }
  ]
}
```

## Configuration

- Port: 3002 (default)
- Base URL: Set via `BASE_URL` environment variable
- Database: Configured via Prisma client

## CI/CD

Add to your GitHub Actions workflow:

```yaml
- name: Install dependencies
  run: pnpm install

- name: Install Playwright
  run: pnpm --filter web exec playwright install --with-deps

- name: Run E2E tests
  run: pnpm --filter web test:e2e
```

## Project Structure

```
apps/web/
├── pages/
│   ├── index.tsx          # Home page
│   └── api/               # API routes
├── tests/
│   └── similarity.spec.ts # E2E tests
├── playwright.config.ts   # Playwright configuration
└── package.json
```
