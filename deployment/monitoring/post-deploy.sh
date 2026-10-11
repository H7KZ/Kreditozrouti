#!/usr/bin/env bash
set -euo pipefail
set +x
# Toolkit exports the saved environment. Release/runtime inventories are immutable.
: "${UMAMI_DB_USER:?}" "${UMAMI_DB_NAME:?}" "${UMAMI_GRAFANA_PASSWORD:?}"
stack=kreditozrouti-monitoring
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
wait_for() {
  local attempt
  for attempt in {1..60}; do
    if "$@" >/dev/null 2>&1; then return 0; fi
    sleep 5
  done
  echo "ERROR: monitoring readiness timeout after $attempt attempts" >&2; return 1
}
wait_for docker exec "$stack-prometheus-1" wget -qO- http://localhost:9090/-/ready
wait_for docker exec "$stack-alertmanager-1" wget -qO- http://localhost:9093/-/ready
wait_for docker exec "$stack-prometheus-1" wget -qO- http://loki.:3100/ready
wait_for docker exec "$stack-prometheus-1" wget -qO- http://alloy.:12345/-/ready
wait_for docker exec "$stack-grafana-1" wget -qO- http://localhost:3000/api/health
wait_for docker exec "$stack-umami-db-1" psql -U "$UMAMI_DB_USER" -d "$UMAMI_DB_NAME" -tAc 'select 1 from website_event limit 1'
docker exec -i "$stack-umami-db-1" psql -v ON_ERROR_STOP=1 -U "$UMAMI_DB_USER" -d "$UMAMI_DB_NAME" \
  -v pw="$UMAMI_GRAFANA_PASSWORD" -v db="$UMAMI_DB_NAME" < "$script_dir/umami/grafana-role.sql" >/dev/null
