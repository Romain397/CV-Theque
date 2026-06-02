#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACK_DIR="$ROOT_DIR/Back"
FRONT_DIR="$ROOT_DIR/Front"
BACK_PORT="${BACK_PORT:-8000}"
FRONT_PORT="${FRONT_PORT:-5173}"
HOST="${HOST:-127.0.0.1}"
BACK_PID=""
FRONT_PID=""

log() {
  printf '\033[1;34m[GotT]\033[0m %s\n' "$1"
}

warn() {
  printf '\033[1;33m[GotT]\033[0m %s\n' "$1"
}

need_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf '\033[1;31m[GotT]\033[0m %s\n' "$2"
    exit 1
  fi
}

port_in_use() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
    return $?
  fi

  (echo >/dev/tcp/"$HOST"/"$port") >/dev/null 2>&1
}

find_free_port() {
  local port="$1"
  while port_in_use "$port"; do
    port=$((port + 1))
  done
  printf '%s' "$port"
}

cleanup() {
  if [[ -n "${BACK_PID:-}" ]]; then kill "$BACK_PID" 2>/dev/null || true; fi
  if [[ -n "${FRONT_PID:-}" ]]; then kill "$FRONT_PID" 2>/dev/null || true; fi
}

ensure_running() {
  local pid="$1"
  local label="$2"
  if kill -0 "$pid" 2>/dev/null; then
    return 0
  fi

  printf '\033[1;31m[GotT]\033[0m %s\n' "$label"
  exit 1
}

trap cleanup EXIT INT TERM

need_command php "PHP est introuvable. Installe PHP avant de lancer le backend."
need_command npm "npm est introuvable. Installe Node.js/npm avant de lancer le frontend."

if [[ ! -d "$BACK_DIR" || ! -d "$FRONT_DIR" ]]; then
  printf '\033[1;31m[GotT]\033[0m Lance ce script depuis la racine du projet GotT.\n'
  exit 1
fi

if [[ ! -f "$BACK_DIR/.env" && -f "$BACK_DIR/.env.example" ]]; then
  cp "$BACK_DIR/.env.example" "$BACK_DIR/.env"
  log "Back/.env créé depuis Back/.env.example"
fi

mkdir -p "$BACK_DIR/var"

if [[ ! -d "$BACK_DIR/vendor" ]]; then
  need_command composer "Composer est introuvable. Installe Composer ou lance composer install dans Back."
  log "Installation des dépendances PHP..."
  (cd "$BACK_DIR" && composer install --no-interaction)
fi

if [[ ! -d "$FRONT_DIR/node_modules" ]]; then
  log "Installation des dépendances frontend..."
  (cd "$FRONT_DIR" && npm install)
fi

export DATABASE_URL="${DATABASE_URL:-sqlite:///var/cvtheque.db}"

if [[ -f "$BACK_DIR/init_sqlite.php" ]]; then
  log "Préparation de la base SQLite locale..."
  (cd "$BACK_DIR" && php init_sqlite.php)
else
  warn "Back/init_sqlite.php introuvable, la base sera préparée par les migrations si possible."
fi

if [[ -f "$BACK_DIR/bin/console" ]]; then
  log "Application des migrations Doctrine..."
  (cd "$BACK_DIR" && php bin/console doctrine:migrations:migrate --no-interaction) || warn "Les migrations ont échoué. Vérifie Back/var et la configuration Doctrine."
else
  warn "Back/bin/console introuvable, migrations ignorées."
fi

BACK_PORT="$(find_free_port "$BACK_PORT")"
FRONT_PORT="$(find_free_port "$FRONT_PORT")"
API_URL="http://$HOST:$BACK_PORT"

log "Démarrage du backend Symfony sur $API_URL"
(
  cd "$BACK_DIR"
  DATABASE_URL="$DATABASE_URL" php -S "$HOST:$BACK_PORT" -t public public/index.php
) &
BACK_PID=$!

sleep 0.4
ensure_running "$BACK_PID" "Le backend n'a pas démarré."

log "Démarrage du frontend Vite sur http://$HOST:$FRONT_PORT"
(
  cd "$FRONT_DIR"
  VITE_API_URL="${VITE_API_URL:-$API_URL}" npm run dev -- --host "$HOST" --port "$FRONT_PORT" --strictPort
) &
FRONT_PID=$!

sleep 0.4
ensure_running "$FRONT_PID" "Le frontend n'a pas démarré."

printf '\n'
log "Projet prêt."
printf '  API Symfony : %s\n' "$API_URL"
printf '  Front Vite  : http://%s:%s\n' "$HOST" "$FRONT_PORT"
printf '  Admin dev   : admin@cvtheque.local / admin123\n'
printf '\nCtrl+C pour arrêter les deux serveurs.\n\n'

while [[ -n "$BACK_PID" && -n "$FRONT_PID" ]] && kill -0 "$BACK_PID" 2>/dev/null && kill -0 "$FRONT_PID" 2>/dev/null; do
  sleep 1
done

if [[ -n "$BACK_PID" ]] && ! kill -0 "$BACK_PID" 2>/dev/null; then
  warn "Le backend s'est arrêté."
fi

if [[ -n "$FRONT_PID" ]] && ! kill -0 "$FRONT_PID" 2>/dev/null; then
  warn "Le frontend s'est arrêté."
fi

exit 1
