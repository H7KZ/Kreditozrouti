#!/usr/bin/env bash
set -euo pipefail
set +x
umask 077
[[ $# == 2 && "$1" =~ ^(production|development|monitoring)$ && "$2" == /* ]] || {
  echo 'usage: render-env.sh <environment> <absolute-new-dotenv>' >&2; exit 2;
}
target="$1"
output="$2"
[[ ! -e "$output" && ! -L "$output" ]] || { echo 'ERROR: dotenv already exists' >&2; exit 1; }
require() {
  local name
  for name in "$@"; do
    [[ -n "${!name:-}" ]] || { echo "ERROR: missing $name" >&2; exit 1; }
  done
}
# Literal dotenv quotes preserve $, #, backticks and backslashes. Reject quote/control
# characters instead of relying on shell escaping or Compose interpolation.
put() {
  case "$2" in
    *"'"*|*[[:cntrl:]]*|*\\) echo "ERROR: unsafe dotenv value for $1 (quote, control character or trailing backslash)" >&2; exit 1 ;;
  esac
  printf "%s='%s'\n" "$1" "$2"
}
temporary="$(mktemp "${output}.XXXXXX")"
trap 'rm -f -- "$temporary"' EXIT
if [[ "$target" == monitoring ]]; then
  require GRAFANA_ADMIN_PASSWORD DISCORD_WEBHOOK_URL HEALTHCHECKS_PING_URL UMAMI_DB_NAME UMAMI_DB_USER UMAMI_DB_PASSWORD UMAMI_APP_SECRET
  {
    put GRAFANA_ADMIN_USER "${GRAFANA_ADMIN_USER:-admin}"
    for key in GRAFANA_ADMIN_PASSWORD DISCORD_WEBHOOK_URL HEALTHCHECKS_PING_URL UMAMI_DB_NAME UMAMI_DB_USER UMAMI_DB_PASSWORD UMAMI_APP_SECRET; do
      put "$key" "${!key}"
    done
  } > "$temporary"
else
  require APP_PROJECT APP_DOMAIN APP_MYSQL_DATABASE APP_MYSQL_ROOT_PASSWORD APP_MYSQL_URI APP_REDIS_URI APP_REDIS_PASSWORD APP_MYSQL_USER APP_MYSQL_PASSWORD APP_API_SESSION_SECRET APP_API_COMMAND_TOKEN APP_MCP_JWT_SECRET
  [[ "$APP_DOMAIN" =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$ ]] || { echo 'ERROR: DOMAIN must be a hostname' >&2; exit 1; }
  [[ "$APP_PROJECT" =~ ^[A-Za-z0-9][A-Za-z0-9_-]*$ ]] || { echo 'ERROR: PROJECT must be a safe distinct route suffix' >&2; exit 1; }
  {
    put PROJECT "$APP_PROJECT"
    put DOMAIN "$APP_DOMAIN"
    put API_SESSION_SECRET "$APP_API_SESSION_SECRET"
    put API_COMMAND_TOKEN "$APP_API_COMMAND_TOKEN"
    put VITE_APP_VERSION "$APP_SOURCE_COMMIT"
    put MYSQL_USER "$APP_MYSQL_USER"
    put MYSQL_DATABASE "$APP_MYSQL_DATABASE"
    put MYSQL_PASSWORD "$APP_MYSQL_PASSWORD"
    put MYSQL_ROOT_PASSWORD "$APP_MYSQL_ROOT_PASSWORD"
    put MYSQL_URI "$APP_MYSQL_URI"
    put REDIS_URI "$APP_REDIS_URI"
    put REDIS_PASSWORD "$APP_REDIS_PASSWORD"
    put GOOGLE_USER "$APP_GOOGLE_USER"
    put GOOGLE_APP_PASSWORD "${APP_GOOGLE_APP_PASSWORD:-}"
    put VITE_UMAMI_WEBSITE_ID "${APP_UMAMI_WEBSITE_ID:-}"
    put VITE_UMAMI_SRC "$APP_UMAMI_SRC"
    put MCP_JWT_SECRET "${APP_MCP_JWT_SECRET:-}"
    put PHPMYADMIN_BASIC_AUTH "${APP_PHPMYADMIN_BASIC_AUTH:-}"
  } > "$temporary"
fi
chmod 600 "$temporary"
mv -T -- "$temporary" "$output"
