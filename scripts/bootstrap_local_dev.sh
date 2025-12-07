#!/usr/bin/env bash
set -euo pipefail

echo "Bootstrap: starting local dev environment"

# check pnpm
if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm not found. Install pnpm (https://pnpm.io/installation)."
  exit 1
fi

ENV_FILE=".env.local"
if [ -f "$ENV_FILE" ]; then
  echo "$ENV_FILE exists; backing up to $ENV_FILE.bak"
  cp "$ENV_FILE" "$ENV_FILE.bak"
fi

read -r -p "Create .env.local with sane defaults? [Y/n]: " create
create=${create:-Y}
if [[ "$create" =~ ^(Y|y|)$ ]]; then
  cat > "$ENV_FILE" <<EOF
DATABASE_URL=postgresql://aura_user:aura_pass@localhost:5432/aura
NEXT_PUBLIC_APP_NAME=Aura-Sign-Local
SESSION_SECRET=$(openssl rand -base64 32 | tr -d '\n')
IRON_SESSION_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minio
MINIO_SECRET_KEY=minio123
REDIS_URL=redis://localhost:6379
EMBEDDING_API=http://localhost:4001
EOF
  echo "Created $ENV_FILE"
fi

echo "Bringing up docker services..."
if [ -f docker-compose.yml ]; then
  docker compose up -d
  echo "Waiting for Postgres..."
  POSTGRES_CONTAINER=""
  for _ in {1..30}; do
    POSTGRES_CONTAINER=$(docker ps -q -f label=com.docker.compose.service=postgres)
    if [ -n "$POSTGRES_CONTAINER" ]; then
      break
    fi
    sleep 1
  done
  
  if [ -z "$POSTGRES_CONTAINER" ]; then
    echo "Warning: Postgres container not found, skipping readiness check"
  else
    until docker exec "$POSTGRES_CONTAINER" pg_isready -U aura_user >/dev/null 2>&1; do
      sleep 1
    done
    echo "Postgres is ready"
  fi
else
  echo "No docker-compose.yml present - skip bringing up infra"
fi

echo "Installing dependencies..."
pnpm install

echo "Generating Prisma client..."
pnpm --filter @aura-sign/database-client prisma generate

echo "Running prisma migrate deploy..."
pnpm --filter @aura-sign/database-client prisma migrate deploy || true

echo "Seeding database..."
pnpm --filter @aura-sign/database-client prisma db seed

echo "Bootstrap complete. Run 'pnpm dev' to start apps."
