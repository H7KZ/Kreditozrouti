#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script Name: deploy.sh
# Description: Deploys the monitoring stack (Prometheus, Grafana, Loki, Alloy).
#              Traefik must already be running before this script is called.
#              Configuration via environment variables or an env file.
#
# Usage:       bash ./deploy.sh [--env-file <path>]
#
# Options:
#   --env-file <path>     Path to a file of KEY=VALUE pairs to source before
#                         validation (useful for local/manual runs)
#
# Required variables (set as environment variables or in the env file):
#   MONITORING_DOMAIN       Public domain for Grafana + Faro routing
#   GRAFANA_ADMIN_PASSWORD  Grafana admin password
#
# Optional:
#   GRAFANA_ADMIN_USER    Grafana admin username (default: admin)
#   DISCORD_WEBHOOK_URL   Discord webhook for Grafana alerts
# ==============================================================================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_NAME="$(basename "$0")"
readonly STACK_NAME="global"

source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib.sh"

ENV_FILE=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        --env-file) ENV_FILE="$2"; shift 2 ;;
        *) log_error "Unknown argument: $1"; exit 1 ;;
    esac
done

if [[ -n "$ENV_FILE" ]]; then
    [[ -f "$ENV_FILE" ]] || { log_error "Env file not found: $ENV_FILE"; exit 1; }
    # shellcheck source=/dev/null
    set -a; source "$ENV_FILE"; set +a
fi

main() {
    [[ -z "${MONITORING_DOMAIN:-}" ]]      && { log_error "MONITORING_DOMAIN not set";                exit 1; }
    [[ -z "${GRAFANA_ADMIN_PASSWORD:-}" ]] && { log_error "GRAFANA_ADMIN_PASSWORD not set"; exit 1; }

    export DOMAIN="$MONITORING_DOMAIN"
    export PROJECT="$STACK_NAME"
    export GRAFANA_ADMIN_USER="${GRAFANA_ADMIN_USER:-admin}"
    export GRAFANA_ADMIN_PASSWORD
    export DISCORD_WEBHOOK_URL="${DISCORD_WEBHOOK_URL:-}"

    log "=========================================="
    log "Monitoring Stack Deployment"
    log "=========================================="
    log "Monitoring domain: $MONITORING_DOMAIN"
    log "Grafana user:      $GRAFANA_ADMIN_USER"
    log "Grafana password:  ${GRAFANA_ADMIN_PASSWORD:0:3}..."
    log "=========================================="

    local compose_file="$SCRIPT_DIR/docker-compose.monitoring.yml"
    local networks_config="$SCRIPT_DIR/networks.yml"
    local volumes_config="$SCRIPT_DIR/volumes.yml"

    validate_files "$compose_file" "$networks_config" "$volumes_config"
    create_networks "$networks_config"
    create_volumes "$volumes_config"

    if ! docker network inspect "traefik-network" &>/dev/null; then
        log "Creating network: traefik-network"
        docker network create "traefik-network"
    fi

    log "Deploying monitoring stack..."
    docker compose \
        -p "$STACK_NAME" \
        -f "$networks_config" \
        -f "$volumes_config" \
        -f "$compose_file" \
        up -d

    log_success "=========================================="
    log_success "Monitoring Stack Deployed"
    log_success "=========================================="
    log "Grafana:  https://$MONITORING_DOMAIN/grafana"
    log "Faro:     https://$MONITORING_DOMAIN/faro/collect"
    log ""
    log "Logs:   docker compose -p $STACK_NAME logs -f"
    log "Status: docker compose -p $STACK_NAME ps"
}

main
