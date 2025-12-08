#!/usr/bin/env bash
set -euo pipefail
echo "Bootstrap Aura local dev (safe)."

if ! command -v pnpm &>/dev/null; then
  echo "pnpm missing. Install first."
  exit 1
fi

echo ""
echo "Enter your configuration values (or press Enter to use defaults):"
echo ""

# Prompt for DATABASE_URL with default matching docker-compose.yml
read -rp "DATABASE_URL [postgresql://aura_user:aura_pass@localhost:5432/aura]: " DATABASE_URL
DATABASE_URL=${DATABASE_URL:-postgresql://aura_user:aura_pass@localhost:5432/aura}

# Prompt for SESSION_SECRET
read -rp "SESSION_SECRET (min 32 chars): " SESSION_SECRET
while [ -z "$SESSION_SECRET" ] || [ ${#SESSION_SECRET} -lt 32 ]; do
  echo "ERROR: SESSION_SECRET must be at least 32 characters."
  read -rp "SESSION_SECRET (min 32 chars): " SESSION_SECRET
done

# Prompt for IRON_SESSION_PASSWORD
read -rp "IRON_SESSION_PASSWORD (min 32 chars): " IRON_SESSION_PASSWORD
while [ -z "$IRON_SESSION_PASSWORD" ] || [ ${#IRON_SESSION_PASSWORD} -lt 32 ]; do
  echo "ERROR: IRON_SESSION_PASSWORD must be at least 32 characters."
  read -rp "IRON_SESSION_PASSWORD (min 32 chars): " IRON_SESSION_PASSWORD
done

cat > .env.local <<EOF
# Postgres / DB
DATABASE_URL=${DATABASE_URL}

# SIWE / auth
NEXT_PUBLIC_APP_NAME=Aura-Sign-Demo
SESSION_SECRET=${SESSION_SECRET}
IRON_SESSION_PASSWORD=${IRON_SESSION_PASSWORD}

# Storage
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minio
MINIO_SECRET_KEY=minio123

# Worker / queue
REDIS_URL=redis://localhost:6379

# Optional (embeddings)
EMBEDDING_API=http://localhost:4001
EOF

echo ".env.local created. Do NOT commit this file."
echo "Starting docker-compose..."
docker compose up -d

echo "Installing deps..."
pnpm install

echo "Generate prisma client & seed..."
pnpm --filter @aura-sign/database-client prisma generate
pnpm --filter @aura-sign/database-client prisma db push
pnpm --filter @aura-sign/database-client prisma:seed

echo "Ready. Run 'pnpm dev' to start monorepo."
