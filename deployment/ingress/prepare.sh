#!/usr/bin/env bash
# Staging hook for the ingress stack (standalone mode). Runs as the deploy user; toolkit exports
# the incoming dotenv and links ingress/.rendered into this release's private runtime directory.
#
#   1. refuse to run beside another ingress (shared mode: Infrastructure's Traefik owns 80/443)
#   2. render the Traefik static config and the dashboard/bouncer secrets into .rendered
#   3. write derived values to $TOOLKIT_RUNTIME_DIR/extra.env
#   4. create the public-network, private networks and volumes (toolkit only creates
#      kreditozrouti-* resources itself)
set -Eeuo pipefail
set +x
umask 077
: "${TOOLKIT_RUNTIME_DIR:?}" "${TOOLKIT_ENV_FILE:?}"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

for name in ACME_EMAIL TRAEFIK_DOMAIN TRAEFIK_HTPASSWD CF_DNS_API_TOKEN TRAEFIK_DASHBOARD_ALLOWED_IPS; do
  [[ -n "${!name:-}" ]] || fail "missing $name"
done
[[ "$ACME_EMAIL" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+$ ]] || fail 'ACME_EMAIL is not a plain email address'
[[ "$TRAEFIK_DOMAIN" =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$ ]] || fail 'TRAEFIK_DOMAIN must be a hostname'
[[ "$TRAEFIK_HTPASSWD" == *:\$2* && "$TRAEFIK_HTPASSWD" != *$'\n'* ]] || fail 'TRAEFIK_HTPASSWD must be one bcrypt user:hash line'

# 1. Shared-mode guard. Our own containers run from ~/kreditozrouti/versions/ingress/<release>;
#    anything else publishing 80/443 (Infrastructure's Traefik, a host proxy container) must go first.
while IFS='|' read -r container working_dir; do
  [[ -z "$container" ]] && continue
  [[ "$working_dir" == */kreditozrouti/versions/ingress/* ]] ||
    fail "container '$container' (${working_dir:-no compose dir}) already publishes port 80/443. Another ingress runs on this host (shared mode): do not deploy this ingress here. See docs/runbooks/fresh-server.md."
done < <(
  for port in 80 443; do
    docker ps --filter "publish=$port" --format '{{.Names}}|{{.Label "com.docker.compose.project.working_dir"}}'
  done
)

# 2. Render into the private runtime directory.
rendered="$script_dir/.rendered"
[[ -L "$rendered" && "$(realpath -e "$rendered")" == "$(realpath -e "$TOOLKIT_RUNTIME_DIR")"/* ]] ||
  fail 'ingress/.rendered must link into this release private runtime directory'
mkdir -p -- "$rendered"
# The template placeholders are literal ${...} text, not shell expansions (hence SC2016).
config="$(<"$script_dir/config/traefik.yml")"
# shellcheck disable=SC2016
config="${config//'${ACME_EMAIL}'/$ACME_EMAIL}"
# shellcheck disable=SC2016
config="${config//'${CERT_RESOLVER}'/letsencrypt}"
# shellcheck disable=SC2016
[[ "$config" != *'${'* ]] || fail 'unsubstituted variable left in the Traefik static configuration'
printf '%s\n' "$config" > "$rendered/traefik.yml"
printf '%s\n' "$TRAEFIK_HTPASSWD" > "$rendered/traefik.htpasswd"

# One bouncer key for the life of the stack: reuse the current snapshot's, otherwise create it.
# A stable key keeps CrowdSec from being recreated by every release.
key=''
previous="$script_dir/../../current/ingress/.rendered/crowdsec-lapi-key"
if [[ -f "$previous" ]]; then
  key="$(<"$previous")"
fi
if [[ -z "$key" ]]; then
  key="$(python3 -c 'import secrets; print(secrets.token_urlsafe(33))')"
fi
[[ "$key" =~ ^[A-Za-z0-9_-]+$ ]] || fail 'CrowdSec bouncer key is invalid'
printf '%s' "$key" > "$rendered/crowdsec-lapi-key"
# cap_drop: ALL containers need world-readable files; the runtime parent stays private.
chmod 644 "$rendered/traefik.yml" "$rendered/traefik.htpasswd" "$rendered/crowdsec-lapi-key"

# 3. Derived values, literal single-quoted dotenv.
resolved="$(realpath -e "$rendered")"
printf "TRAEFIK_CREDENTIALS_PATH='%s'\nCROWDSEC_LAPI_KEY_PATH='%s'\nCROWDSEC_BOUNCER_API_KEY='%s'\n" \
  "$resolved/traefik.htpasswd" "$resolved/crowdsec-lapi-key" "$key" > "$TOOLKIT_RUNTIME_DIR/extra.env"
chmod 600 "$TOOLKIT_RUNTIME_DIR/extra.env"

# 4. Resources (idempotent). Compose declares all of them external so a `down -v` never removes data.
if ! docker network inspect public-network >/dev/null 2>&1; then
  docker network create public-network >/dev/null
fi
for network in traefik-socket-proxy-network traefik-crowdsec-network; do
  if ! docker network inspect "$network" >/dev/null 2>&1; then
    docker network create --internal "$network" >/dev/null
  fi
done
for volume in traefik-certificates-volume traefik-logs-volume traefik-plugins-volume crowdsec-db-volume crowdsec-config-volume; do
  if ! docker volume inspect "$volume" >/dev/null 2>&1; then
    docker volume create "$volume" >/dev/null
  fi
done
