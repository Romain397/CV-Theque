#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACK_DIR="$ROOT_DIR/Back"
FRONT_DIR="$ROOT_DIR/Front"

if [[ ! -f "$BACK_DIR/.env" && -f "$BACK_DIR/.env.example" ]]; then
  cp "$BACK_DIR/.env.example" "$BACK_DIR/.env"
fi

mkdir -p "$BACK_DIR/var"

# Force the local Symfony runtime to use the SQLite database bundled with the project.
export DATABASE_URL="sqlite:///var/cvtheque.db"

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