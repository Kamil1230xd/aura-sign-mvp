# setup-node-pnpm Composite Action

Reusable GitHub Actions composite action that configures Node.js and pnpm with optional dependency installation and caching.

## Features

- ✅ Setup Node.js with configurable version (default: 20)
- ✅ Setup pnpm with configurable version (default: 8)
- ✅ Optional dependency installation with `--frozen` lockfile
- ✅ Configurable pnpm store caching
- ✅ Support for custom npm registries (for private packages)
- ✅ Git safe directory configuration
- ✅ Environment output (node and pnpm versions)

## Usage

### Basic Usage (defaults)

```yaml
steps:
  - uses: actions/checkout@v4
  
  - name: Setup Node.js and pnpm
    uses: ./.github/actions/setup-node-pnpm
```

This will:
- Install Node.js 20
- Install pnpm 8
- Install dependencies with `pnpm install --frozen`
- Enable pnpm store caching
- Output node and pnpm versions

### Custom Versions

```yaml
steps:
  - uses: actions/checkout@v4
  
  - name: Setup with custom versions
    uses: ./.github/actions/setup-node-pnpm
    with:
      node-version: '18'
      pnpm-version: '9'
```

### Skip Dependency Installation

Useful when you want to manually control dependency installation:

```yaml
steps:
  - uses: actions/checkout@v4
  
  - name: Setup without installing deps
    uses: ./.github/actions/setup-node-pnpm
    with:
      install-deps: 'false'
  
  - name: Install specific dependencies
    run: pnpm install --filter my-package
```

### Custom Registry (Private Packages)

```yaml
steps:
  - uses: actions/checkout@v4
  
  - name: Setup with custom registry
    uses: ./.github/actions/setup-node-pnpm
    with:
      registry-url: 'https://npm.pkg.github.com'
    env:
      NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Disable Caching

Useful for troubleshooting cache-related issues:

```yaml
steps:
  - uses: actions/checkout@v4
  
  - name: Setup without cache
    uses: ./.github/actions/setup-node-pnpm
    with:
      cache: 'false'
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `node-version` | Node.js version to setup | No | `'20'` |
| `pnpm-version` | pnpm version to setup | No | `'8'` |
| `install-deps` | Install dependencies (pnpm install --frozen) | No | `'true'` |
| `registry-url` | Optional registry url (for private registries) | No | `''` |
| `cache` | Enable pnpm store caching (true or false) | No | `'true'` |

## What This Action Does

1. **Setup Node.js** - Uses `actions/setup-node@v4` with pnpm caching enabled
2. **Setup pnpm** - Uses `pnpm/action-setup@v2` with specified version
3. **Configure git** - Adds workspace to git safe directories
4. **Install dependencies** (optional) - Runs `pnpm fetch --prod` and `pnpm install --frozen`
5. **Setup cache** (optional) - Caches `~/.pnpm-store` and `~/.cache/pnpm`
6. **Output environment** - Displays node and pnpm versions

## Examples

See [example-composite-action.yml](../../workflows/example-composite-action.yml) for complete usage examples including:
- Default configuration
- Custom versions
- Skip installation
- Custom registry authentication
- Disable caching
- Cross-platform usage

## Integration with Existing Workflows

You can replace repetitive setup steps in your workflows:

**Before:**
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'pnpm'

- name: Setup pnpm
  uses: pnpm/action-setup@v2
  with:
    version: 8

- name: Install dependencies
  run: pnpm install --frozen-lockfile
```

**After:**
```yaml
- name: Setup Node.js and pnpm
  uses: ./.github/actions/setup-node-pnpm
```

## Notes

- The action uses `pnpm install --frozen` which is stricter than `--frozen-lockfile`
- Cache key is based on `pnpm-lock.yaml` hash for optimal cache invalidation
- Git safe directory configuration prevents "dubious ownership" errors in containers
- The `pnpm fetch --prod` command pre-downloads packages for better reliability
