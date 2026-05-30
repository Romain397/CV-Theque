#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACK_DIR="$ROOT_DIR/Back"
FRONT_DIR="$ROOT_DIR/Front"

if [[ ! -f "$BACK_DIR/.env" && -f "$BACK_DIR/.env.example" ]]; then
  cp "$BACK_DIR/.env.example" "$BACK_DIR/.env"
fi

mkdir -p "$BACK_DIR/var"

# First-run initialization
if [[ ! -f "$BACK_DIR/var/cvtheque.db" ]]; then
  echo "First run: initializing sqlite DB..."
  if [[ -f "$BACK_DIR/init_sqlite.php" ]]; then
    php "$BACK_DIR/init_sqlite.php"
  else
    echo "Warning: init_sqlite.php not found in $BACK_DIR"
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

# Run Doctrine migrations (idempotent)
(cd "$BACK_DIR" && php bin/console doctrine:migrations:migrate --no-interaction)

cleanup() {
  kill "${BACK_PID:-}" "${FRONT_PID:-}" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

(
  cd "$BACK_DIR"
  php -S 127.0.0.1:8000 -t public public/index.php
) &
BACK_PID=$!

(
  cd "$FRONT_DIR"
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