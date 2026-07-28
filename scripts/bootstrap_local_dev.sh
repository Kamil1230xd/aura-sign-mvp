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

read -r -p "Create .env.local with auto-generated secure credentials? [Y/n]: " create
create=${create:-Y}
if [[ "$create" =~ ^(Y|y|)$ ]]; then
  # Generate secure random passwords
  DB_USER="aura_user"
  DB_PASS=$(openssl rand -base64 32 | tr -d '\n')
  MINIO_USER="minio"
  MINIO_PASS=$(openssl rand -base64 32 | tr -d '\n')
  
  cat > "$ENV_FILE" <<EOF
# Database Configuration
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/aura
POSTGRES_USER=${DB_USER}
POSTGRES_PASSWORD=${DB_PASS}
POSTGRES_DB=aura

# Application Configuration
NEXT_PUBLIC_APP_NAME=Aura-Sign-Local
SESSION_SECRET=$(openssl rand -base64 32 | tr -d '\n')
IRON_SESSION_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')

# MinIO Configuration
MINIO_ENDPOINT=http://localhost:9000
MINIO_ROOT_USER=${MINIO_USER}
MINIO_ROOT_PASSWORD=${MINIO_PASS}
MINIO_ACCESS_KEY=${MINIO_USER}
MINIO_SECRET_KEY=${MINIO_PASS}

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Optional Services
EMBEDDING_API=http://localhost:4001
EOF
  echo "Created $ENV_FILE with auto-generated secure credentials"
  echo "⚠️  IMPORTANT: Keep .env.local secure and never commit it to version control"
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
    # Extract POSTGRES_USER from .env.local safely, or use default
    PG_USER="postgres"
    if [ -f "$ENV_FILE" ]; then
      # Safely extract POSTGRES_USER using grep and cut, avoiding source
      PG_USER_FROM_FILE=$(grep "^POSTGRES_USER=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' | head -1)
      # Validate extracted value is a simple alphanumeric username
      if [[ "$PG_USER_FROM_FILE" =~ ^[a-zA-Z0-9_-]+$ ]]; then
        PG_USER="$PG_USER_FROM_FILE"
      fi
    fi
    until docker exec "$POSTGRES_CONTAINER" pg_isready -U "$PG_USER" >/dev/null 2>&1; do
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
