#!/usr/bin/env bash
# Runs inside the toolkit host window before current/previous can move (ingress stack).
# Toolkit exports the saved environment, including CROWDSEC_BOUNCER_API_KEY from extra.env.
set -Eeuo pipefail
set +x
: "${CROWDSEC_BOUNCER_API_KEY:?}"
key="$CROWDSEC_BOUNCER_API_KEY"
[[ "$key" =~ ^[A-Za-z0-9_-]+$ ]] || {
  echo 'ERROR: invalid snapshot bouncer key' >&2
  exit 1
}

wait_healthy() {
  local service="$1" container status elapsed=0
  container="$(docker ps -q --filter label=com.docker.compose.project=global --filter "label=com.docker.compose.service=$service")"
  [[ -n "$container" ]] || {
    echo "ERROR: $service is not running" >&2
    return 1
  }
  while ((elapsed < 120)); do
    status="$(docker inspect -f '{{.State.Health.Status}}' "$container" 2>/dev/null || echo unknown)"
    case "$status" in
      healthy) echo "OK: $service"; return 0 ;;
      unhealthy) echo "ERROR: $service is unhealthy" >&2; return 1 ;;
    esac
    sleep 5
    elapsed=$((elapsed + 5))
  done
  echo "ERROR: $service did not become healthy in 120 seconds" >&2
  return 1
}

wait_healthy crowdsec
# LAPI's persisted bouncer registry must match the selected snapshot. The key travels over stdin so
# it never appears in a process list.
{
  printf "key='%s'\n" "$key"
  cat <<'REGISTER'
set -eu
cscli bouncers delete traefik >/dev/null 2>&1 || true
cscli bouncers add traefik --key "$key" >/dev/null
REGISTER
} | docker exec -i crowdsec sh -s
docker exec crowdsec cscli bouncers list 2>/dev/null | grep -q traefik || {
  echo "ERROR: CrowdSec bouncer 'traefik' is not registered" >&2
  exit 1
}
echo "OK: CrowdSec bouncer 'traefik' registered"
wait_healthy traefik
