#!/usr/bin/env bash
set -euo pipefail
ROOT=$(pwd)
DEST="$ROOT/monolith"

echo "Tworzenie monolith → $DEST"
rm -rf "$DEST"
mkdir -p "$DEST/src" "$DEST/config"

# copy src from apps/demo-site
rsync -av --exclude node_modules --exclude .next apps/demo-site/ "$DEST/src/"

# merge packages: copy useful packages into src/lib
mkdir -p "$DEST/src/lib"
for pkg in packages/*; do
  if [ -d "$pkg" ]; then
    name=$(basename "$pkg")
    rsync -av --exclude node_modules --exclude dist "$pkg/" "$DEST/src/lib/$name"
  fi
done

# create monolithic package.json
cat > "$DEST/package.json" <<'JSON'
{
  "name": "aura-sign-monolith",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --ext .ts,.tsx",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "ethers": "^5.7.2",
    "siwe": "^1.3.0",
    "iron-session": "^6.3.1",
    "next": "^13.5.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "engines": { "node": ">=20" }
}
JSON

echo "Monolith przygotowany. Uruchom: cd monolith && pnpm install && pnpm dev"
