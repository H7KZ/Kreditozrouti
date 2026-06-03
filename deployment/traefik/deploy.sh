#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script Name: deploy.sh
# Description: Deploys the global Traefik reverse proxy stack.
#              Configuration via environment variables.
#
# Usage:       bash ./deploy.sh
#
# Required variables (set as environment variables):
#   DEPLOYMENT_PATH             Path to deployment directory
#   TRAEFIK_DOMAIN              Traefik dashboard domain
#   TRAEFIK_CREDENTIALS_PATH    Path to htpasswd credentials file
#   CF_API_EMAIL                Cloudflare account email
#   CF_DNS_API_TOKEN            Cloudflare API token (Zone:DNS:Edit)
#
# Optional:
#   ACME_EMAIL                  Let's Encrypt email (defaults to CF_API_EMAIL)
#
# Expected directory structure:
#   $DEPLOYMENT_PATH/traefik/
#     docker-compose.traefik.yml, traefik.yml, networks.yml, volumes.yml
# ==============================================================================

readonly SCRIPT_NAME="$(basename "$0")"
readonly STACK_NAME="global"

source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib.sh"

main() {
    [[ -z "${DEPLOYMENT_PATH:-}" ]]          && { log_error "DEPLOYMENT_PATH is not set";          exit 1; }
    [[ -z "${TRAEFIK_DOMAIN:-}" ]]           && { log_error "TRAEFIK_DOMAIN is not set";           exit 1; }
    [[ -z "${TRAEFIK_CREDENTIALS_PATH:-}" ]] && { log_error "TRAEFIK_CREDENTIALS_PATH is not set"; exit 1; }
    [[ -z "${CF_API_EMAIL:-}" ]]             && { log_error "CF_API_EMAIL is not set";             exit 1; }
    [[ -z "${CF_DNS_API_TOKEN:-}" ]]         && { log_error "CF_DNS_API_TOKEN is not set";         exit 1; }

    [[ -d "$DEPLOYMENT_PATH" ]]         || { log_error "Deployment directory not found: $DEPLOYMENT_PATH";       exit 1; }
    [[ -f "$TRAEFIK_CREDENTIALS_PATH" ]] || { log_error "Credentials file not found: $TRAEFIK_CREDENTIALS_PATH"; exit 1; }

    export TRAEFIK_DOMAIN
    export TRAEFIK_CREDENTIALS_PATH
    export CF_API_EMAIL
    export CF_DNS_API_TOKEN
    export ACME_EMAIL="${ACME_EMAIL:-$CF_API_EMAIL}"

    log "=========================================="
    log "Traefik Deployment (Cloudflare DNS-01)"
    log "=========================================="
    log "Path:        $DEPLOYMENT_PATH"
    log "Domain:      $TRAEFIK_DOMAIN"
    log "Credentials: $TRAEFIK_CREDENTIALS_PATH"
    log "CF Email:    $CF_API_EMAIL"
    log "CF Token:    ${CF_DNS_API_TOKEN:0:8}..."
    log "ACME Email:  $ACME_EMAIL"
    log "=========================================="

    local traefik_dir="$DEPLOYMENT_PATH/traefik"
    local compose_file="$traefik_dir/docker-compose.traefik.yml"
    local networks_config="$traefik_dir/networks.yml"
    local volumes_config="$traefik_dir/volumes.yml"

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
