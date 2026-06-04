#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script Name: deploy.sh
# Description: Deploys the global Traefik reverse proxy stack.
#              Configuration via environment variables or an env file.
#
# Usage:       bash ./deploy.sh [--env-file <path>]
#
# Options:
#   --env-file <path>     Path to a file of KEY=VALUE pairs to source before
#                         validation (useful for local/manual runs)
#
# Required variables (set as environment variables or in the env file):
#   TRAEFIK_DOMAIN              Traefik dashboard domain
#   TRAEFIK_HTPASSWD            htpasswd line (generate: htpasswd -nb user pass)
#   CF_API_EMAIL                Cloudflare account email
#   CF_DNS_API_TOKEN            Cloudflare API token (Zone:DNS:Edit)
#
# Optional:
#   ACME_EMAIL                  Let's Encrypt email (defaults to CF_API_EMAIL)
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

readonly HTPASSWD_PATH="$HOME/variables/.traefik-htpasswd"

main() {
    [[ -z "${TRAEFIK_DOMAIN:-}" ]]   && { log_error "TRAEFIK_DOMAIN is not set";   exit 1; }
    [[ -z "${TRAEFIK_HTPASSWD:-}" ]] && { log_error "TRAEFIK_HTPASSWD is not set"; exit 1; }
    [[ -z "${CF_API_EMAIL:-}" ]]     && { log_error "CF_API_EMAIL is not set";     exit 1; }
    [[ -z "${CF_DNS_API_TOKEN:-}" ]] && { log_error "CF_DNS_API_TOKEN is not set"; exit 1; }

    mkdir -p "$(dirname "$HTPASSWD_PATH")"
    printf '%s\n' "$TRAEFIK_HTPASSWD" > "$HTPASSWD_PATH"
    chmod 600 "$HTPASSWD_PATH"
    log "Wrote htpasswd to $HTPASSWD_PATH"

    export TRAEFIK_DOMAIN
    export TRAEFIK_CREDENTIALS_PATH="$HTPASSWD_PATH"
    export CF_API_EMAIL
    export CF_DNS_API_TOKEN
    export ACME_EMAIL="${ACME_EMAIL:-$CF_API_EMAIL}"

    log "=========================================="
    log "Traefik Deployment (Cloudflare DNS-01)"
    log "=========================================="
    log "Domain:      $TRAEFIK_DOMAIN"
    log "Credentials: $HTPASSWD_PATH"
    log "CF Email:    $CF_API_EMAIL"
    log "CF Token:    ${CF_DNS_API_TOKEN:0:8}..."
    log "ACME Email:  $ACME_EMAIL"
    log "=========================================="

    local compose_file="$SCRIPT_DIR/docker-compose.traefik.yml"
    local networks_config="$SCRIPT_DIR/networks.yml"
    local volumes_config="$SCRIPT_DIR/volumes.yml"

    validate_files "$compose_file" "$networks_config" "$volumes_config"
    create_networks "$networks_config"
    create_volumes "$volumes_config"

    log "Deploying Traefik stack..."
    docker compose \
        -p "$STACK_NAME" \
        -f "$networks_config" \
        -f "$volumes_config" \
        -f "$compose_file" \
        up -d

    log_success "=========================================="
    log_success "Traefik Deployment Complete"
    log_success "=========================================="
    log "Dashboard: https://$TRAEFIK_DOMAIN"
    log "Logs:      docker compose -p $STACK_NAME logs -f"
    log ""
    log "Certificate issuance may take 1-2 minutes."
    log "Monitor with: docker compose -p $STACK_NAME logs -f traefik 2>&1 | grep -i acme"
}

main
