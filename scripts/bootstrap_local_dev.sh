#!/usr/bin/env bash
set -euo pipefail
echo "Bootstrap Aura local dev (safe)."

if ! command -v pnpm &>/dev/null; then
  echo "pnpm missing. Install first."
  exit 1
fi

cp .env.example .env.local || true

read -rp "DATABASE_URL (postgres://user:pass@host:5432/aura): " DATABASE_URL
read -rp "SESSION_SECRET (min 32 chars): " SESSION_SECRET
read -rp "IRON_SESSION_PASSWORD (min 32 chars): " IRON_SESSION_PASSWORD

cat > .env.local <<EOF
DATABASE_URL=${DATABASE_URL}
SESSION_SECRET=${SESSION_SECRET}
IRON_SESSION_PASSWORD=${IRON_SESSION_PASSWORD}
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minio
MINIO_SECRET_KEY=minio123
REDIS_URL=redis://localhost:6379
EOF

echo ".env.local created. Do NOT commit this file."
echo "Starting docker-compose..."
docker compose up -d

echo "Installing deps..."
pnpm install

echo "Generate prisma client & seed"
pnpm --filter @aura-sign/database-client prisma generate
pnpm --filter @aura-sign/database-client prisma db push --preview-feature
pnpm --filter @aura-sign/database-client prisma:seed

echo "Ready. Run 'pnpm dev' to start monorepo."
