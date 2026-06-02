#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script Name: monitoring.sh
# Description: Deploys the monitoring stack (Prometheus, Grafana, Loki, Alloy).
#              Traefik must already be running before this script is called.
#
# Usage:       ./monitoring.sh --path <deployment_path> [OPTIONS]
#
# Options:
#   -p, --path <path>               Path to deployment directory (required)
#   -d, --domain <domain>           Public domain for Grafana + Faro routing (required)
#   --project <name>                Project name prefix for Traefik labels (required)
#   --grafana-user <user>           Grafana admin username (default: admin)
#   --grafana-password <pass>       Grafana admin password (required)
#   --action <action>               One of: up, down, restart, logs, status (default: up)
#   -h, --help                      Show help message
#
# Environment Variables (alternative to flags):
#   DEPLOYMENT_PATH                 Path to deployment directory
#   DOMAIN                          Public domain
#   PROJECT                         Project name prefix for Traefik labels
#   GRAFANA_ADMIN_USER              Grafana admin username
#   GRAFANA_ADMIN_PASSWORD          Grafana admin password
#
# Examples:
#   # Deploy (first time or update):
#   ./monitoring.sh -p ~/deployment -d kreditozrouti.cz --project kreditozrouti \
#                   --grafana-password secret
#
#   # Tear down:
#   ./monitoring.sh -p ~/deployment -d kreditozrouti.cz --project kreditozrouti \
#                   --grafana-password secret --action down
#
#   # Tail logs for all services:
#   ./monitoring.sh -p ~/deployment -d kreditozrouti.cz --project kreditozrouti \
#                   --grafana-password secret --action logs
#
#   # Via environment variables:
#   DEPLOYMENT_PATH=~/deployment DOMAIN=kreditozrouti.cz PROJECT=kreditozrouti \
#   GRAFANA_ADMIN_PASSWORD=secret ./monitoring.sh
#
# Deploy order: Traefik → this script → app stack
#
# Expected directory structure:
#   <deployment_path>/
#   └── monitoring/
#       ├── docker-compose.monitoring.yml
#       ├── networks.yml
#       ├── volumes.yml
#       ├── alloy/
#       │   └── config.alloy
#       ├── grafana/
#       │   └── provisioning/datasources/
#       │       ├── prometheus.yml
#       │       └── loki.yml
#       ├── loki/
#       │   └── loki.yml
#       └── prometheus/
#           └── prometheus.yml
# ==============================================================================

# ------------------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------------------

readonly SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly STACK_NAME="monitoring"

source "$SCRIPT_DIR/lib.sh"

# ------------------------------------------------------------------------------
# Functions
# ------------------------------------------------------------------------------

usage() {
    cat << EOF
Usage: $SCRIPT_NAME --path <deployment_path> [OPTIONS]

Required:
    -p, --path <path>               Path to deployment directory
    -d, --domain <domain>           Public domain (e.g. kreditozrouti.cz)
    --project <name>                Project name prefix for Traefik labels
    --grafana-password <pass>       Grafana admin password

Optional:
    --grafana-user <user>           Grafana admin username (default: admin)
    --action <action>               up | down | restart | logs | status (default: up)
    -h, --help                      Show this help message

Environment Variables:
    DEPLOYMENT_PATH                 Path to deployment directory
    DOMAIN                          Public domain
    PROJECT                         Project name prefix
    GRAFANA_ADMIN_USER              Grafana admin username
    GRAFANA_ADMIN_PASSWORD          Grafana admin password

Examples:
    $SCRIPT_NAME -p ~/deployment -d kreditozrouti.cz --project kreditozrouti \\
                 --grafana-password secret

    $SCRIPT_NAME -p ~/deployment -d kreditozrouti.cz --project kreditozrouti \\
                 --grafana-password secret --action logs

    $SCRIPT_NAME -p ~/deployment -d kreditozrouti.cz --project kreditozrouti \\
                 --grafana-password secret --action down

After deploy, services are available at:
    Grafana:  https://<domain>/grafana
    Faro:     https://<domain>/faro/collect  (Alloy receiver for browser telemetry)

EOF
    exit 1
}

# ------------------------------------------------------------------------------
# Main
# ------------------------------------------------------------------------------

main() {
    # Default values from environment
    local deployment_path="${DEPLOYMENT_PATH:-}"
    local domain="${DOMAIN:-}"
    local project="${PROJECT:-}"
    local grafana_user="${GRAFANA_ADMIN_USER:-admin}"
    local grafana_password="${GRAFANA_ADMIN_PASSWORD:-}"
    local action="up"

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -p|--path)
                deployment_path="$2"
                shift 2
                ;;
            -d|--domain)
                domain="$2"
                shift 2
                ;;
            --project)
                project="$2"
                shift 2
                ;;
            --grafana-user)
                grafana_user="$2"
                shift 2
                ;;
            --grafana-password)
                grafana_password="$2"
                shift 2
                ;;
            --action)
                action="$2"
                shift 2
                ;;
            -h|--help)
                usage
                ;;
            *)
                log_error "Unknown parameter: $1"
                usage
                ;;
        esac
    done

    log "=========================================="
    log "Monitoring Stack Deployment"
    log "=========================================="

    # Validate required parameters
    if [[ -z "$deployment_path" ]]; then
        log_error "Deployment path is not set."
        log_error "Use --path flag or set DEPLOYMENT_PATH environment variable."
        exit 1
    fi

    if [[ -z "$domain" ]]; then
        log_error "Domain is not set."
        log_error "Use --domain flag or set DOMAIN environment variable."
        exit 1
    fi

    if [[ -z "$project" ]]; then
        log_error "Project name is not set."
        log_error "Use --project flag or set PROJECT environment variable."
        exit 1
    fi

    if [[ -z "$grafana_password" ]]; then
        log_error "Grafana admin password is not set."
        log_error "Use --grafana-password flag or set GRAFANA_ADMIN_PASSWORD environment variable."
        exit 1
    fi

    # Validate action
    case "$action" in
        up|down|restart|logs|status) ;;
        *)
            log_error "Unknown action: $action"
            log_error "Valid actions: up, down, restart, logs, status"
            exit 1
            ;;
    esac

    # Resolve deployment path
    if [[ -d "$deployment_path" ]]; then
        deployment_path=$(cd "$deployment_path" && pwd)
    else
        log_error "Deployment directory not found: $deployment_path"
        exit 1
    fi

    # Export environment variables (consumed by docker compose)
    export DOMAIN="$domain"
    export PROJECT="$project"
    export GRAFANA_ADMIN_USER="$grafana_user"
    export GRAFANA_ADMIN_PASSWORD="$grafana_password"

    log "Path:             $deployment_path"
    log "Domain:           $DOMAIN"
    log "Project:          $PROJECT"
    log "Grafana user:     $GRAFANA_ADMIN_USER"
    log "Grafana password: ${GRAFANA_ADMIN_PASSWORD:0:3}..."
    log "Action:           $action"
    log "=========================================="

    # Define paths
    local monitoring_dir="$deployment_path/monitoring"
    local compose_file="$monitoring_dir/docker-compose.monitoring.yml"
    local networks_config="$monitoring_dir/networks.yml"
    local volumes_config="$monitoring_dir/volumes.yml"

    # Validate configuration files
    validate_files "$compose_file" "$networks_config" "$volumes_config"

    # Build the base compose command
    local compose_cmd=(
        docker compose
        -p "$STACK_NAME"
        -f "$networks_config"
        -f "$volumes_config"
        -f "$compose_file"
    )

    # Execute action
    case "$action" in
        up)
            create_networks "$networks_config"
            create_volumes "$volumes_config"

            log "Deploying monitoring stack..."
            "${compose_cmd[@]}" up -d --remove-orphans

            log_success "=========================================="
            log_success "Monitoring Stack Deployed"
            log_success "=========================================="
            log "Grafana:  https://$DOMAIN/grafana"
            log "Faro:     https://$DOMAIN/faro/collect"
            log ""
            log "Logs:     $SCRIPT_NAME --path $deployment_path --domain $DOMAIN --project $PROJECT --grafana-password '***' --action logs"
            log "Status:   $SCRIPT_NAME --path $deployment_path --domain $DOMAIN --project $PROJECT --grafana-password '***' --action status"
            ;;

        down)
            log_warning "Bringing down monitoring stack..."
            "${compose_cmd[@]}" down --remove-orphans

            log_success "Monitoring stack stopped."
            log_warning "Volumes retained — data is preserved."
            log_warning "To remove volumes too: docker volume rm \$(docker volume ls -q | grep monitoring)"
            ;;

        restart)
            log "Restarting monitoring stack..."
            "${compose_cmd[@]}" restart

            log_success "Monitoring stack restarted."
            ;;

        logs)
            log "Tailing logs (Ctrl+C to exit)..."
            "${compose_cmd[@]}" logs -f --tail=100
            ;;

        status)
            log "Monitoring stack status:"
            "${compose_cmd[@]}" ps
            ;;
    esac
}

main "$@"
