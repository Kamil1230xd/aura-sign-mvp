# setup-node-pnpm Composite Action

A reusable composite GitHub Action for setting up Node.js and pnpm with optional dependency installation, caching, and registry authentication.

## Features

- ✅ Cross-platform support (Ubuntu, Windows, macOS)
- ✅ Configurable Node.js and pnpm versions
- ✅ Smart caching for pnpm store and node_modules
- ✅ Optional automatic dependency installation
- ✅ Registry authentication support for publishing

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `node-version` | Node.js version to use | No | `20` |
| `pnpm-version` | pnpm version to use | No | `8` |
| `install-deps` | Whether to install dependencies with `pnpm install --frozen-lockfile` | No | `true` |
| `registry-url` | Optional registry URL for authentication (e.g., `https://registry.npmjs.org/`) | No | `` |
| `cache` | Enable caching for pnpm store and node_modules | No | `true` |

## Usage Examples

### Basic Usage (Default Configuration)

```yaml
- name: Setup Node + pnpm
  uses: ./.github/actions/setup-node-pnpm
```

This will:
- Install Node.js 20
- Install pnpm 8
- Enable caching
- Automatically install dependencies with `--frozen-lockfile`

### Custom Versions

```yaml
- name: Setup Node 18 + pnpm 9
  uses: ./.github/actions/setup-node-pnpm
  with:
    node-version: '18'
    pnpm-version: '9'
```

### Skip Automatic Installation

```yaml
- name: Setup without auto-install
  uses: ./.github/actions/setup-node-pnpm
  with:
    install-deps: 'false'

- name: Install with custom flags
  run: pnpm install --no-frozen-lockfile
```

### With Registry Authentication

```yaml
- name: Setup for publishing
  uses: ./.github/actions/setup-node-pnpm
  with:
    registry-url: 'https://registry.npmjs.org/'
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Disable Caching

```yaml
- name: Setup without cache
  uses: ./.github/actions/setup-node-pnpm
  with:
    cache: 'false'
```

## Complete Workflow Example

See [example-composite-action.yml](../../workflows/example-composite-action.yml) for a comprehensive example showing multiple usage patterns.

## Caching Strategy

When caching is enabled (`cache: 'true'`), this action uses `actions/setup-node@v4`'s built-in pnpm caching mechanism, which automatically:
- Caches the pnpm store based on the lock file
- Provides optimal cache performance across different operating systems
- Handles cache invalidation when dependencies change

The caching is managed by GitHub Actions' native caching for pnpm, which is more efficient and reliable than manual cache management.

## Why Use This Action?

### Before (Repetitive Setup)

```yaml
- uses: actions/checkout@v4
- uses: pnpm/action-setup@v2
  with:
    version: 8
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'pnpm'
- run: pnpm install --frozen-lockfile
```

### After (Simplified)

```yaml
- uses: actions/checkout@v4
- uses: ./.github/actions/setup-node-pnpm
```

## Maintenance

This composite action encapsulates the setup logic used across multiple workflows in this repository. When updating Node.js or pnpm versions project-wide, update the defaults in this action.
