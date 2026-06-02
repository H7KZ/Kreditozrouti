#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script Name: bootstrap.sh
# Description: Full fresh-server setup. Sources server.conf and runs all
#              infrastructure scripts in the correct deploy order.
#
# Usage:       bash ./bootstrap.sh
#
# Prerequisites:
#   - Copy server.conf.example to server.conf and fill in all values
#   - Docker must already be installed (sudo bash ./install-docker.sh)
#   - Run from the scripts/ directory or any location (uses SCRIPT_DIR)
#
# Deploy order: Traefik → Monitoring → GitHub Runner
# ==============================================================================

readonly SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly CONFIG_FILE="$SCRIPT_DIR/server.conf"

source "$SCRIPT_DIR/lib.sh"

# ------------------------------------------------------------------------------
# Validation
# ------------------------------------------------------------------------------

validate_config() {
    local missing=()

    local required_vars=(
        DEPLOYMENT_PATH
        TRAEFIK_DOMAIN TRAEFIK_ADMIN_USER TRAEFIK_ADMIN_PASSWORD
        TRAEFIK_CREDENTIALS_PATH CF_API_EMAIL CF_DNS_API_TOKEN ACME_EMAIL
        DOMAIN MONITORING_PROJECT GRAFANA_ADMIN_PASSWORD
        GITHUB_REPO_URL GITHUB_ACCESS_TOKEN
    )

    for var in "${required_vars[@]}"; do
        [[ -z "${!var:-}" ]] && missing+=("$var")
    done

    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "Missing required config values in server.conf:"
        for var in "${missing[@]}"; do
            log_error "  - $var"
        done
        exit 1
    fi
}

# ------------------------------------------------------------------------------
# Main
# ------------------------------------------------------------------------------

main() {
    log "=========================================="
    log "Server Bootstrap"
    log "=========================================="

    # Check config file exists
    if [[ ! -f "$CONFIG_FILE" ]]; then
        log_error "Config file not found: $CONFIG_FILE"
        log_error ""
        log_error "Create it from the example:"
        log_error "  cp $SCRIPT_DIR/server.conf.example $SCRIPT_DIR/server.conf"
        log_error "  nano $SCRIPT_DIR/server.conf"
        exit 1
    fi

    # Load config
    # shellcheck source=/dev/null
    source "$CONFIG_FILE"
    validate_config

    # Check Docker is installed
    if ! command -v docker &>/dev/null; then
        log_error "Docker is not installed."
        log_error "Install it first (requires sudo):"
        log_error "  sudo bash $SCRIPT_DIR/install-docker.sh"
        log_error "Then log out and back in, and re-run this script."
        exit 1
    fi

    log "Config:   $CONFIG_FILE"
    log "Docker:   $(docker --version)"
    log "=========================================="

    # Step 1: Generate htpasswd
    log ""
    log "Step 1/3: Generating Traefik dashboard credentials..."
    if ! command -v htpasswd &>/dev/null; then
        log "htpasswd not found — installing apache2-utils..."
        sudo apt-get install -y apache2-utils
    fi
    htpasswd -cb "$TRAEFIK_CREDENTIALS_PATH" "$TRAEFIK_ADMIN_USER" "$TRAEFIK_ADMIN_PASSWORD"
    chmod 600 "$TRAEFIK_CREDENTIALS_PATH"
    log_success "htpasswd written to $TRAEFIK_CREDENTIALS_PATH"

    # Step 2: Deploy Traefik
    log ""
    log "Step 2/3: Deploying Traefik..."
    bash "$SCRIPT_DIR/traefik.sh"

    # Step 3: Deploy Monitoring
    log ""
    log "Step 3/4: Deploying Monitoring..."
    bash "$SCRIPT_DIR/monitoring.sh"

    # Step 4: Deploy GitHub Runner
    log ""
    log "Step 4/4: Deploying GitHub Runner..."
    bash "$SCRIPT_DIR/github-runner.sh"

    log ""
    log_success "=========================================="
    log_success "Bootstrap Complete"
    log_success "=========================================="
    log "Traefik dashboard: https://${TRAEFIK_DOMAIN}"
    log "Grafana:           https://${DOMAIN}/grafana"
    log ""
    log "Next step: trigger your first app deployment from GitHub Actions."
}

main "$@"
