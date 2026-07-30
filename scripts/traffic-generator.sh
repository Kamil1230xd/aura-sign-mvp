#!/usr/bin/env bash
# Ulepszony generator ruchu dla Aura-Sign MVP
# - opcje CLI (getopts)
# - wykrywa "docker compose" vs "docker-compose"
# - retry dla sprawdzenia bazy danych
# - debug, limit batchy, czytelniejsze logi
set -euo pipefail

# Domyślne wartości (można nadpisać przez ENV lub CLI)
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
TRUSTMATH_SERVICE="${TRUSTMATH_SERVICE:-trustmath-worker}"
DB_USER="${DB_USER:-user}"
DB_NAME="${DB_NAME:-aura}"
BATCH_IDENTITIES="${BATCH_IDENTITIES:-5}"
BATCH_EVENTS="${BATCH_EVENTS:-20}"
SLEEP_SECONDS="${SLEEP_SECONDS:-3}"
MAX_BATCHES="${MAX_BATCHES:-}"  # pusta = nieskończoność
DEBUG="${DEBUG:-false}"
DB_CHECK_RETRIES="${DB_CHECK_RETRIES:-5}"
DB_CHECK_DELAY="${DB_CHECK_DELAY:-2}"

timestamp() { date --rfc-3339=seconds 2>/dev/null || date +"%Y-%m-%d %H:%M:%S"; }
log() { printf '%s %s\n' "$(timestamp)" ">>> $*"; }
dbg() { if [ "$DEBUG" = "true" ]; then printf '%s %s\n' "$(timestamp)" ">>> [DEBUG] $*"; fi; }
err() { printf '%s %s\n' "$(timestamp)" ">>> [ERROR] $*" >&2; }

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Options:
  -p SERVICE   Postgres service name (docker-compose service). Default: $POSTGRES_SERVICE
  -t SERVICE   TrustMath worker service name. Default: $TRUSTMATH_SERVICE
  -u USER      DB user. Default: $DB_USER
  -n DB        DB name. Default: $DB_NAME
  -i NUM       Identities per batch. Default: $BATCH_IDENTITIES
  -e NUM       Events per batch. Default: $BATCH_EVENTS
  -s SEC       Sleep seconds between batches. Default: $SLEEP_SECONDS
  -m NUM       Max batches (empty = infinite). Default: $MAX_BATCHES
  -r NUM       DB check retries. Default: $DB_CHECK_RETRIES
  -d           Enable debug output
  -h           Show this help
EOF
}

# Parse CLI options
while getopts ":p:t:u:n:i:e:s:m:r:dh" opt; do
  case "$opt" in
    p) POSTGRES_SERVICE="$OPTARG" ;;
    t) TRUSTMATH_SERVICE="$OPTARG" ;;
    u) DB_USER="$OPTARG" ;;
    n) DB_NAME="$OPTARG" ;;
    i) BATCH_IDENTITIES="$OPTARG" ;;
    e) BATCH_EVENTS="$OPTARG" ;;
    s) SLEEP_SECONDS="$OPTARG" ;;
    m) MAX_BATCHES="$OPTARG" ;;
    r) DB_CHECK_RETRIES="$OPTARG" ;;
    d) DEBUG="true" ;;
    h) usage; exit 0 ;;
    \?) err "Invalid option: -$OPTARG"; usage; exit 2 ;;
    :) err "Option -$OPTARG requires an argument."; usage; exit 2 ;;
  esac
done

# Wykryj docker compose command
if command -v docker-compose >/dev/null 2>&1; then
  DC_CMD="docker-compose"
elif docker compose version >/dev/null 2>&1; then
  DC_CMD="docker compose"
else
  err "Nie znaleziono ani 'docker-compose', ani 'docker compose'. Zainstaluj docker-compose lub użyj docker compose."
  exit 2
fi
dbg "Using compose command: $DC_CMD"

# Obsługa przerwania (Ctrl+C)
running=true
on_exit() {
  log "[INFO] Przerwano. Zatrzymywanie generatora..."
  running=false
}
trap on_exit INT TERM

# Sprawdzenie dostępności bazy z retry
check_db() {
  local attempt=1
  while [ "$attempt" -le "$DB_CHECK_RETRIES" ]; do
    dbg "DB check attempt $attempt/$DB_CHECK_RETRIES..."
    if $DC_CMD exec -T "$POSTGRES_SERVICE" psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" >/dev/null 2>&1; then
      log "[OK] Baza danych odpowiada (service: $POSTGRES_SERVICE)."
      return 0
    fi
    dbg "DB nie dostępna, oczekiwanie ${DB_CHECK_DELAY}s..."
    sleep "$DB_CHECK_DELAY"
    attempt=$((attempt + 1))
  done
  err "Baza danych nie odpowiada po $DB_CHECK_RETRIES próbach (service: $POSTGRES_SERVICE)."
  return 1
}

# Trigger worker (curl -> node fallback)
trigger_worker() {
  dbg "Wywołanie worker ($TRUSTMATH_SERVICE)..."
  if $DC_CMD exec -T "$TRUSTMATH_SERVICE" sh -c "command -v curl >/dev/null 2>&1"; then
    $DC_CMD exec -T "$TRUSTMATH_SERVICE" sh -c "curl -sS -X POST http://localhost:9090/run || echo 'curl failed'"
  else
    $DC_CMD exec -T "$TRUSTMATH_SERVICE" sh -c "command -v node >/dev/null 2>&1 && node -e \"(async()=>{try{const r=await fetch('http://localhost:9090/run'); const t=await r.text(); console.log(t)}catch(e){console.error('Err:', e.message)}})()\" || echo 'No curl or node inside worker'"
  fi
}

# Start
log "[START] Inicjacja generatora ruchu..."
check_db || exit 1

BATCH_ID=1
while $running; do
  if [ -n "$MAX_BATCHES" ] && [ "$BATCH_ID" -gt "$MAX_BATCHES" ]; then
    log "[INFO] Osiągnięto limit batchy ($MAX_BATCHES). Kończę."
    break
  fi

  log "[BATCH #$BATCH_ID] Generowanie danych..."

  # 1) Wstrzykiwanie tożsamości
  dbg "INSERT INTO identity ($BATCH_IDENTITIES identities)"
  if ! $DC_CMD exec -T "$POSTGRES_SERVICE" psql -U "$DB_USER" -d "$DB_NAME" -c "
    INSERT INTO identity (id, address, current_epoch, created_at, updated_at)
    SELECT gen_random_uuid(),
           '0x' || encode(gen_random_bytes(20), 'hex'),
           1, now(), now()
    FROM generate_series(1, $BATCH_IDENTITIES)
    ON CONFLICT DO NOTHING;" >/dev/null 2>&1; then
    log "[WARN] Nie udało się wstawić tożsamości (może DB chwilowo zajęta)."
  fi

  # 2) Wstrzykiwanie zdarzeń
  dbg "INSERT INTO trust_event ($BATCH_EVENTS events)"
  if ! $DC_CMD exec -T "$POSTGRES_SERVICE" psql -U "$DB_USER" -d "$DB_NAME" -c "
    WITH ids AS (
      SELECT id FROM identity ORDER BY random() LIMIT $BATCH_EVENTS
    )
    INSERT INTO trust_event (id, identity_id, event_type, status, metadata, timestamp)
    SELECT gen_random_uuid(),
           id,
           (ARRAY['siwe_login','intent_verified','attestation_added','anomaly_detected'])[floor(random()*4)+1],
           'verified',
           '{\"simulation\": true}',
           now()
    FROM ids;" >/dev/null 2>&1; then
    log "[WARN] Nie udało się wstawić zdarzeń."
  fi

  log "[BATCH #$BATCH_ID] Dodano (próbka) $BATCH_IDENTITIES users, $BATCH_EVENTS events."

  # 3) Trigger worker
  log "[SILNIK] Wywołanie TrustMath..."
  if ! trigger_worker >/dev/null 2>&1; then
    log "[WARN] Trigger worker nie powiódł się."
  fi

  # 4) Oddech
  BATCH_ID=$((BATCH_ID+1))
  sleep "$SLEEP_SECONDS"
done

log "[STOP] Generator zakończony."
exit 0
