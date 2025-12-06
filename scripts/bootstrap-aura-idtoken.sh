#!/usr/bin/env bash
# scripts/bootstrap-aura-idtoken.sh
# Uruchomienie środowiska AURA-IDTOKEN z docker compose v2, rozszerzonymi healthcheckami
set -euo pipefail
IFS=$'\n\t'

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
SERVICES_START="${SERVICES_START:-postgres redis}"
WORKER_SERVICE="${WORKER_SERVICE:-trustmath-worker}"
DB_USER="${DB_USER:-user}"
DB_NAME="${DB_NAME:-aura}"
MAX_RETRIES="${MAX_RETRIES:-60}"
RETRY_INTERVAL="${RETRY_INTERVAL:-2}"
# Opcjonalne endpointy zdrowia (w .env jako HEALTH_HTTP_URLS="http://svc:port/health,http://svc2/ready")
HEALTH_HTTP_URLS="${HEALTH_HTTP_URLS:-}"
# Kafka brokers jako host:port lista oddzielona przecinkami (KAFKA_BROKERS="kafka:9092")
KAFKA_BROKERS="${KAFKA_BROKERS:-}"

log() { echo ">> [${SECONDS}s] $*"; }

# Proste funkce sprawdzające
check_command() {
  command -v "$1" >/dev/null 2>&1
}

tcp_connect() {
  local host=$1 port=$2 timeout="${3:-2}"
  # próba użycia bash /dev/tcp
  (timeout "${timeout}" bash -c "cat < /dev/null > /dev/tcp/${host}/${port}" ) >/dev/null 2>&1
}

check_http() {
  local url=$1
  if check_command curl; then
    if curl -sS -f --connect-timeout 3 "$url" >/dev/null; then
      return 0
    else
      return 1
    fi
  else
    # fallback: użyj docker compose exec jeśli serwis to kontener lokalny
    return 2
  fi
}

check_kafka_tcp() {
  local broker=$1
  local host="${broker%%:*}"
  local port="${broker##*:}"
  tcp_connect "$host" "$port" 3
}

# Wymagane narzędzia (docker i docker compose)
for cmd in docker; do
  if ! check_command "$cmd"; then
    log "BŁĄD: wymagane '$cmd' nie jest zainstalowane lokalnie."
    exit 1
  fi
done

# Sprawdź obecność pliku .env
if [ ! -f .env ]; then
  log "BŁĄD: Brak pliku .env. Kopiuje z .env.example jeśli dostępne..."
  if [ -f .env.example ]; then
    cp .env.example .env
    log "Skopiowano .env.example -> .env. Uzupełnij sekrety w .env i uruchom skrypt ponownie."
  else
    log "Brak .env.example. Utwórz .env ręcznie."
  fi
  exit 1
fi

# Załaduj .env
set -a
# shellcheck disable=SC1091
source .env || true
set +a

log "INICJACJA PROTOKOŁU PROOF-OF-BEHAVIOR V2.0..."
log "Weryfikacja wektorów..."

# Podnoszenie kontenerów (docker compose v2)
log "INFRA: Podnoszenie usług: ${SERVICES_START}"
docker compose -f "${COMPOSE_FILE}" up -d ${SERVICES_START} || {
  log "BŁĄD: Nie udało się uruchomić: ${SERVICES_START}"
  docker compose -f "${COMPOSE_FILE}" ps
  exit 1
}

# Oczekiwanie na Postgres
log "DB: Oczekiwanie na Postgres..."
retries=0
until docker compose -f "${COMPOSE_FILE}" exec -T postgres pg_isready -U "${DB_USER}" -d "${DB_NAME}" >/dev/null 2>&1 || [ "$retries" -ge "$MAX_RETRIES" ]; do
  retries=$((retries+1))
  log "DB: Próba ${retries}/${MAX_RETRIES} — czekam ${RETRY_INTERVAL}s..."
  sleep "${RETRY_INTERVAL}"
done
if [ "$retries" -ge "$MAX_RETRIES" ]; then
  log "BŁĄD: Postgres nie odpowiedział w czasie. Sprawdź docker compose logs postgres"
  exit 1
fi
log "DB: Postgres gotowy."

# Tworzenie rozszerzenia pgvector
log "SQL: Tworzenie rozszerzenia vector..."
docker compose -f "${COMPOSE_FILE}" exec -T postgres psql -U "${DB_USER}" -d "${DB_NAME}" -c "CREATE EXTENSION IF NOT EXISTS vector;" || {
  log "BŁĄD: Nie udało się utworzyć rozszerzenia 'vector'."
  docker compose -f "${COMPOSE_FILE}" logs postgres --tail=200
  exit 1
}

# Migracje Prisma (jeśli pnpm dostępne)
if check_command pnpm; then
  log "SQL: Aplikowanie migracji Prisma..."
  pnpm prisma migrate deploy || { log "BŁĄD: pnpm prisma migrate deploy"; exit 1; }
else
  log "UWAGA: pnpm nie jest zainstalowane lokalnie. Uruchom pnpm prisma migrate deploy ręcznie jeśli potrzebne."
fi

# Tworzenie indeksu HNSW
log "SQL: Tworzenie indeksu HNSW..."
docker compose -f "${COMPOSE_FILE}" exec -T postgres psql -U "${DB_USER}" -d "${DB_NAME}" -c "
CREATE INDEX IF NOT EXISTS idx_identity_ai_embedding_hnsw
ON identity USING hnsw (ai_embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 200);
" || log "UWAGA: Nie udało się utworzyć indeksu. Sprawdź schemat."

# Uruchom worker
log "SILNIK: Uruchamianie Workera: ${WORKER_SERVICE}"
docker compose -f "${COMPOSE_FILE}" up -d "${WORKER_SERVICE}" || {
  log "BŁĄD: Nie udało się uruchomić worker'a ${WORKER_SERVICE}"
  docker compose -f "${COMPOSE_FILE}" ps
  exit 1
}

# Rozszerzone healthchecki
log "TEST: Sprawdzanie stanu zdrowia usług..."

healthy=true

# 1) Sprawdź, że kontenery są Up
if docker compose -f "${COMPOSE_FILE}" ps | grep -q "Up"; then
  log "Sprawdzenie kontenerów: są uruchomione."
else
  log "BŁĄD: Niektóre kontenery nie są Up."
  healthy=false
fi

# 2) HTTP health endpoints
if [ -n "${HEALTH_HTTP_URLS:-}" ]; then
  IFS=',' read -ra urls <<< "${HEALTH_HTTP_URLS}"
  for u in "${urls[@]}"; do
    log "Health HTTP: sprawdzam ${u}..."
    if check_http "${u}"; then
      log "OK: ${u}"
    else
      log "BŁĄD: ${u} nie odpowiada poprawnie."
      healthy=false
    fi
  done
else
  log "INFO: Brak HEALTH_HTTP_URLS — pomijam sprawdzenie HTTP."
fi

# 3) Kafka brokers (TCP connect)
if [ -n "${KAFKA_BROKERS:-}" ]; then
  IFS=',' read -ra brokers <<< "${KAFKA_BROKERS}"
  for b in "${brokers[@]}"; do
    log "Health Kafka: sprawdzam ${b} (TCP)..."
    if check_kafka_tcp "${b}"; then
      log "OK: Kafka broker ${b} dostępny (TCP)."
    else
      log "BŁĄD: Kafka broker ${b} niedostępny (TCP)."
      healthy=false
    fi
  done
else
  log "INFO: Brak KAFKA_BROKERS — pomijam sprawdzenie Kafki."
fi

if [ "${healthy}" = true ]; then
  log "SUKCES: SYSTEM AURA-IDTOKEN V2.0 JEST AKTYWNY."
  log "STATUS: Obliczalne Zaufanie: ONLINE."
  log "TRYB: Oczekiwanie na zdarzenia (Event Sourcing)..."
else
  log "BŁĄD: System nie wystartował poprawnie — sprawdź logi: docker compose logs"
  docker compose -f "${COMPOSE_FILE}" ps
  exit 1
fi

log "INFO: Aby monitorować logi workera: docker compose logs -f ${WORKER_SERVICE}"
log "KONIEC: Skrypt zakończył wykonanie pomyślnie."
