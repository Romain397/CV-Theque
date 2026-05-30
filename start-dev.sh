#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACK_DIR="$ROOT_DIR/Back"
FRONT_DIR="$ROOT_DIR/Front"

if [[ ! -f "$BACK_DIR/.env" && -f "$BACK_DIR/.env.example" ]]; then
  cp "$BACK_DIR/.env.example" "$BACK_DIR/.env"
  echo "Created $BACK_DIR/.env from example"
fi

mkdir -p "$BACK_DIR/var"

# First-run initialization
if [[ ! -f "$BACK_DIR/var/cvtheque.db" ]]; then
  echo "First run: initializing sqlite DB..."
  if [[ -f "$BACK_DIR/init_sqlite.php" ]]; then
    php "$BACK_DIR/init_sqlite.php"
  else
    echo "Warning: init_sqlite.php not found in $BACK_DIR — la DB sera créée par les migrations si disponibles."
  fi
fi

# Ensure PHP dependencies (composer) are installed if available
if ! [[ -d "$BACK_DIR/vendor" ]]; then
  if command -v composer >/dev/null 2>&1; then
    echo "Installing PHP dependencies (composer install)..."
    (cd "$BACK_DIR" && composer install --no-interaction)
  else
    echo "Composer not found — please run 'composer install' in $BACK_DIR if needed."
  fi
fi

# Ensure frontend dependencies
if ! [[ -d "$FRONT_DIR/node_modules" ]]; then
  if command -v npm >/dev/null 2>&1; then
    echo "Installing frontend dependencies (npm install)..."
    (cd "$FRONT_DIR" && npm install)
  else
    echo "npm not found — please run 'npm install' in $FRONT_DIR if needed."
  fi
fi

# Force the local Symfony runtime to use the SQLite database bundled with the project.
export DATABASE_URL="sqlite:///var/cvtheque.db"

# Run Doctrine migrations (idempotent) if Symfony console exists
if [[ -f "$BACK_DIR/bin/console" ]]; then
  (cd "$BACK_DIR" && php bin/console doctrine:migrations:migrate --no-interaction) || echo "Warning: migrations failed (check Back/logs or run manually)"
else
  echo "Symfony console not found — skipping migrations. You can run them later with: cd Back && php bin/console doctrine:migrations:migrate"
fi

cleanup() {
  if [[ -n "${BACK_PID:-}" ]]; then kill "$BACK_PID" 2>/dev/null || true; fi
  if [[ -n "${FRONT_PID:-}" ]]; then kill "$FRONT_PID" 2>/dev/null || true; fi
}

trap cleanup EXIT INT TERM

(
  cd "$BACK_DIR"
  if ! command -v php >/dev/null 2>&1; then
    echo "PHP non trouvé dans le PATH. Installez PHP pour démarrer le backend."
    exit 1
  fi
  # Enable development auth bypass for local testing when DEV_AUTH_BYPASS=1
  export DEV_AUTH_BYPASS="${DEV_AUTH_BYPASS:-1}"
  php -S 127.0.0.1:8000 -t public public/index.php
) &
BACK_PID=$!

(
  cd "$FRONT_DIR"
  if ! command -v npm >/dev/null 2>&1; then
    echo "npm non trouvé dans le PATH. Installez Node/npm pour démarrer le frontend."
    exit 1
  fi
  VITE_API_URL="${VITE_API_URL:-http://127.0.0.1:8000}" npm run dev -- --host 127.0.0.1 --port 5173
) &
FRONT_PID=$!

printf 'Symfony: http://127.0.0.1:8000\n'
printf 'Vite: http://127.0.0.1:5173\n'

while kill -0 "$BACK_PID" 2>/dev/null && kill -0 "$FRONT_PID" 2>/dev/null; do
  sleep 1
done

kill "$BACK_PID" "$FRONT_PID" 2>/dev/null || true
wait "$BACK_PID" "$FRONT_PID" 2>/dev/null || true

exit 1