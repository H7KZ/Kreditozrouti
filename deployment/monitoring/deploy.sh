#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Deploys the kreditozrouti-monitoring stack. Traefik (Infrastructure) must already run.
#
# Required env:
#   GRAFANA_ADMIN_PASSWORD, DISCORD_WEBHOOK_URL, HEALTHCHECKS_PING_URL
#   UMAMI_DB_NAME, UMAMI_DB_USER, UMAMI_DB_PASSWORD, UMAMI_APP_SECRET
# Optional env:
#   GRAFANA_ADMIN_USER (default admin), DOCKER_GID (default: group id of /var/run/docker.sock)
# ==============================================================================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly STACK_NAME="kreditozrouti-monitoring"

source "$SCRIPT_DIR/../lib.sh"

require() {
    local missing=()
    for name in "$@"; do [[ -n "${!name:-}" ]] || missing+=("$name"); done
    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "Missing required env: ${missing[*]}"
        exit 1
    fi
}

wait_for() {
    local description="$1" attempts="$2"; shift 2
    for ((i = 1; i <= attempts; i++)); do
        if "$@" >/dev/null 2>&1; then log_success "$description"; return 0; fi
        sleep 5
    done
    log_error "Timed out waiting for: $description"
    return 1
}

main() {
    require GRAFANA_ADMIN_PASSWORD DISCORD_WEBHOOK_URL HEALTHCHECKS_PING_URL UMAMI_DB_NAME UMAMI_DB_USER UMAMI_DB_PASSWORD UMAMI_APP_SECRET

    export GRAFANA_ADMIN_USER="${GRAFANA_ADMIN_USER:-admin}"
    export GRAFANA_ADMIN_PASSWORD
    export DOCKER_GID="${DOCKER_GID:-$(stat -c '%g' /var/run/docker.sock)}"
    export UMAMI_DB_NAME UMAMI_DB_USER UMAMI_DB_PASSWORD UMAMI_APP_SECRET
    # Read-only Grafana role on the Umami database, derived so no extra secret is needed.
    export UMAMI_GRAFANA_PASSWORD="$(printf '%s' "grafana_ro:$UMAMI_APP_SECRET" | sha256sum | cut -c1-40)"

    # Alertmanager reads webhook URLs from files, never from env or its config.
    install -d -m 0755 "$SCRIPT_DIR/.secrets"
    printf '%s' "$DISCORD_WEBHOOK_URL" > "$SCRIPT_DIR/.secrets/discord_webhook_url"
    printf '%s' "$HEALTHCHECKS_PING_URL" > "$SCRIPT_DIR/.secrets/healthchecks_ping_url"
    chmod 0644 "$SCRIPT_DIR/.secrets/"*

    log "=========================================="
    log "Deploying $STACK_NAME (docker gid $DOCKER_GID)"
    log "=========================================="

    local compose=(docker compose -p "$STACK_NAME" -f "$SCRIPT_DIR/networks.yml" -f "$SCRIPT_DIR/volumes.yml" -f "$SCRIPT_DIR/docker-compose.monitoring.yml")

    validate_files "$SCRIPT_DIR/docker-compose.monitoring.yml" "$SCRIPT_DIR/networks.yml" "$SCRIPT_DIR/volumes.yml"
    create_networks "$SCRIPT_DIR/networks.yml"
    create_volumes "$SCRIPT_DIR/volumes.yml"

    "${compose[@]}" pull --quiet
    "${compose[@]}" up -d --remove-orphans

    wait_for "prometheus ready" 36 docker exec "$STACK_NAME-prometheus-1" wget -qO- http://localhost:9090/-/ready
    wait_for "alertmanager ready" 24 docker exec "$STACK_NAME-alertmanager-1" wget -qO- http://localhost:9093/-/ready
    wait_for "loki ready" 36 docker exec "$STACK_NAME-prometheus-1" wget -qO- http://loki:3100/ready
    wait_for "alloy ready" 24 docker exec "$STACK_NAME-prometheus-1" wget -qO- http://alloy:12345/-/ready
    wait_for "grafana ready" 36 docker exec "$STACK_NAME-grafana-1" wget -qO- http://localhost:3000/api/health

    # Umami creates its tables on first start; grant the Grafana role once they exist.
    wait_for "umami schema" 60 docker exec "$STACK_NAME-umami-db-1" psql -U "$UMAMI_DB_USER" -d "$UMAMI_DB_NAME" -tAc "select 1 from website_event limit 1"
    docker exec -i "$STACK_NAME-umami-db-1" psql -v ON_ERROR_STOP=1 -U "$UMAMI_DB_USER" -d "$UMAMI_DB_NAME" \
        -v pw="$UMAMI_GRAFANA_PASSWORD" -v db="$UMAMI_DB_NAME" < "$SCRIPT_DIR/umami/grafana-role.sql" >/dev/null
    log_success "grafana_ro role on umami"

    # Metrics the dashboards and alerts depend on. Some appear only after the first request or job,
    # so a missing one is reported, not fatal.
    sleep 60
    local missing=()
    for service in api scraper mysqld-exporter redis-exporter; do
        if ! docker exec "$STACK_NAME-prometheus-1" wget -qO- "http://localhost:9090/api/v1/query?query=up%7Bproject%3D%22kreditozrouti%22%2Cservice%3D%22$service%22%7D" | grep -q '"value"'; then
            missing+=("$service")
        fi
    done
    if [[ ${#missing[@]} -gt 0 ]]; then
        log_warning "Not scraped yet (deploy the app stack or check prometheus.io labels): ${missing[*]}"
    else
        log_success "All expected services are scraped"
    fi

    cleanup_old_versions "monitoring" || true

    log_success "=========================================="
    log_success "$STACK_NAME deployed"
    log_success "=========================================="
    log "Grafana: https://kreditozrouti.cz/grafana"
    log "Status:  docker compose -p $STACK_NAME ps"
}

main
# Networks: kreditozrouti-monitoring-internal-network, kreditozrouti-monitoring-network, public-network
# Volumes:  kreditozrouti-prometheus-volume, kreditozrouti-alertmanager-volume, kreditozrouti-grafana-volume, kreditozrouti-loki-volume, kreditozrouti-alloy-volume, kreditozrouti-umami-postgres-volume, traefik-logs-volume
# Contract: app_build_info
