#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script Name: monitoring.sh
# Description: Deploys the monitoring stack (Prometheus, Grafana, Loki, Alloy).
#              Traefik must already be running before this script is called.
#              Configuration via scripts/server.conf or environment variables.
#
# Usage:       bash ./monitoring.sh
# Config:      See scripts/server.conf.example for all variables.
#
# Required variables:
#   DEPLOYMENT_PATH       Path to deployment directory
#   DOMAIN                Public domain for Grafana + Faro routing
#   GRAFANA_ADMIN_PASSWORD  Grafana admin password
#
# Optional:
#   GRAFANA_ADMIN_USER    Grafana admin username (default: admin)
#   DISCORD_WEBHOOK_URL   Discord webhook for Grafana alerts
#
# Operational commands (use docker compose directly):
#   docker compose -p monitoring logs -f
#   docker compose -p monitoring ps
#   docker compose -p monitoring down
#
# Deploy order: Traefik → this script → app stack
# ==============================================================================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_NAME="$(basename "$0")"
readonly STACK_NAME="monitoring"

source "$SCRIPT_DIR/lib.sh"

main() {
    readonly CONFIG_FILE="$SCRIPT_DIR/server.conf"
    if [[ -f "$CONFIG_FILE" ]]; then
        # shellcheck source=/dev/null
        source "$CONFIG_FILE"
    fi

    [[ -z "${DEPLOYMENT_PATH:-}" ]]       && { log_error "DEPLOYMENT_PATH not set — add to server.conf";       exit 1; }
    [[ -z "${DOMAIN:-}" ]]                && { log_error "DOMAIN not set — add to server.conf";                exit 1; }
    [[ -z "${GRAFANA_ADMIN_PASSWORD:-}" ]] && { log_error "GRAFANA_ADMIN_PASSWORD not set — add to server.conf"; exit 1; }

    [[ -d "$DEPLOYMENT_PATH" ]] || { log_error "Deployment directory not found: $DEPLOYMENT_PATH"; exit 1; }

    export DOMAIN
    export PROJECT="$STACK_NAME"
    export GRAFANA_ADMIN_USER="${GRAFANA_ADMIN_USER:-admin}"
    export GRAFANA_ADMIN_PASSWORD
    export DISCORD_WEBHOOK_URL="${DISCORD_WEBHOOK_URL:-}"

    log "=========================================="
    log "Monitoring Stack Deployment"
    log "=========================================="
    log "Path:             $DEPLOYMENT_PATH"
    log "Domain:           $DOMAIN"
    log "Grafana user:     $GRAFANA_ADMIN_USER"
    log "Grafana password: ${GRAFANA_ADMIN_PASSWORD:0:3}..."
    log "=========================================="

    local monitoring_dir="$DEPLOYMENT_PATH/monitoring"
    local compose_file="$monitoring_dir/docker-compose.monitoring.yml"
    local networks_config="$monitoring_dir/networks.yml"
    local volumes_config="$monitoring_dir/volumes.yml"

    validate_files "$compose_file" "$networks_config" "$volumes_config"
    create_networks "$networks_config"
    create_volumes "$volumes_config"

    log "Deploying monitoring stack..."
    docker compose \
        -p "$STACK_NAME" \
        -f "$networks_config" \
        -f "$volumes_config" \
        -f "$compose_file" \
        up -d --remove-orphans

    log_success "=========================================="
    log_success "Monitoring Stack Deployed"
    log_success "=========================================="
    log "Grafana:  https://$DOMAIN/grafana"
    log "Faro:     https://$DOMAIN/faro/collect"
    log ""
    log "Logs:   docker compose -p $STACK_NAME logs -f"
    log "Status: docker compose -p $STACK_NAME ps"
}

main
