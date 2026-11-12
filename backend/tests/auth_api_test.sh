#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export SOLARCRM_ENV=testing
export SOLARCRM_DB_HOST=127.0.0.1
export SOLARCRM_DB_PORT=3306
export SOLARCRM_DB_NAME=solarcrm
export SOLARCRM_DB_USER=solarcrm
export SOLARCRM_DB_PASSWORD=change_me
export SOLARCRM_OWNER_EMAIL=owner@solarcrm.local
export SOLARCRM_OWNER_PASSWORD=ChangeMe123!

sudo mysql -uroot -e "CREATE DATABASE IF NOT EXISTS ${SOLARCRM_DB_NAME};" >/dev/null 2>&1 || {
  echo "MySQL root access is not available. Skipping backend auth test." >&2
  exit 0
}

sudo mysql -uroot "${SOLARCRM_DB_NAME}" < database/schema.sql >/dev/null 2>&1 || true

php bin/bootstrap-owner.php >/dev/null 2>&1 || true

php -S 127.0.0.1:8081 -t public >/tmp/solarcrm_auth_test.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" >/dev/null 2>&1 || true' EXIT

for _ in $(seq 1 25); do
  if curl -fsS http://127.0.0.1:8081/api/health >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done

COOKIE_JAR=$(mktemp)
LOGIN_RESPONSE=$(curl -sS -c "$COOKIE_JAR" -D - -o /tmp/solarcrm_login_body.txt \
  -X POST http://127.0.0.1:8081/api/auth/login \
  -H 'Content-Type: application/json' \
  --data '{"email":"owner@solarcrm.local","password":"ChangeMe123!"}')

printf '%s\n' "$LOGIN_RESPONSE" | grep -q '200' || {
  echo "Login endpoint did not return HTTP 200." >&2
  cat /tmp/solarcrm_login_body.txt >&2 || true
  exit 1
}

printf '%s\n' "$LOGIN_RESPONSE" | grep -q 'Set-Cookie:' || {
  echo "Login response did not set a session cookie." >&2
  exit 1
}

CSRF_TOKEN=$(php -r '$data=json_decode(file_get_contents("/tmp/solarcrm_login_body.txt"), true); echo $data["data"]["csrf_token"] ?? "";')
if [[ -z "$CSRF_TOKEN" ]]; then
  echo "Login response did not contain a CSRF token." >&2
  cat /tmp/solarcrm_login_body.txt >&2 || true
  exit 1
fi

curl -sS -b "$COOKIE_JAR" -o /tmp/solarcrm_me_body.txt \
  -H "X-CSRF-Token: ${CSRF_TOKEN}" \
  http://127.0.0.1:8081/api/auth/me

grep -Eq '"success"[[:space:]]*:[[:space:]]*true' /tmp/solarcrm_me_body.txt || {
  echo "Authenticated /api/auth/me request failed." >&2
  cat /tmp/solarcrm_me_body.txt >&2 || true
  exit 1
}

curl -sS -b "$COOKIE_JAR" -X POST \
  -H "X-CSRF-Token: ${CSRF_TOKEN}" \
  -o /tmp/solarcrm_logout_body.txt \
  http://127.0.0.1:8081/api/auth/logout

grep -Eq '"success"[[:space:]]*:[[:space:]]*true' /tmp/solarcrm_logout_body.txt || {
  echo "Logout request did not succeed." >&2
  cat /tmp/solarcrm_logout_body.txt >&2 || true
  exit 1
}

echo "Auth API smoke test passed."
