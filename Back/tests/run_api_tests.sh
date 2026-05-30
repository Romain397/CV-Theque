#!/usr/bin/env bash
set -euo pipefail
API=http://127.0.0.1:8000

echo "1) Attempt login (should fail if no admin yet)"
curl -sS -X POST "$API/login" -H 'Content-Type: application/json' -d '{"email":"admin@cvtheque.local","password":"admin123"}' || true

echo "\n2) Register bootstrap admin"
RESP=$(curl -sS -X POST "$API/register" -H 'Content-Type: application/json' -d '{"name":"Bootstrap","email":"admin@cvtheque.local","password":"admin123","role":"admin"}')
echo "$RESP"
TOKEN=$(echo "$RESP" | jq -r .token)
if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "No token returned; ensure admin was approved or DB seeded." >&2
  exit 1
fi

echo "\n3) List users with token"
curl -sS "$API/users" -H "Authorization: Bearer $TOKEN" | jq '.'

echo "\n4) Conditional GET with ETag"
ETAG=$(curl -si -H "Authorization: Bearer $TOKEN" "$API/users" | awk '/ETag:/ {print $2}' | tr -d '\r')
if [ -n "$ETAG" ]; then
  echo "ETag: $ETAG"
  curl -si -H "Authorization: Bearer $TOKEN" -H "If-None-Match: $ETAG" "$API/users" | head -n 20
fi

echo "\n5) Create a user then PATCH"
CREATED=$(curl -sS -X POST "$API/register" -H 'Content-Type: application/json' -d '{"name":"Test User","email":"test@example.local","password":"test123","role":"student"}')
UID=$(echo "$CREATED" | jq -r '.user.id')
if [ "$UID" = "null" ] || [ -z "$UID" ]; then
  echo "User not created; maybe pending approval." >&2
else
  echo "PATCHing user $UID"
  curl -sS -X PATCH "$API/users/$UID" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"name":"Updated Test"}' | jq '.'
fi

echo "\nDone"
