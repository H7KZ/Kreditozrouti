#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script Name: traefik.sh
# Description: Deploys the global Traefik reverse proxy stack.
#              Sets up required networks and volumes.
#
# Usage:       ./traefik.sh --path <deployment_path> [OPTIONS]
#
# Options:
#   -p, --path <path>           Path to deployment directory (required)
#   -d, --domain <domain>       Traefik dashboard domain (required)
#   -c, --credentials <path>    Path to htpasswd credentials file (required)
#   -e, --email <email>         ACME/Let's Encrypt email (optional)
#   -h, --help                  Show help message
#
# Environment Variables (alternative to flags):
#   DEPLOYMENT_PATH             Path to deployment directory
#   TRAEFIK_DOMAIN              Dashboard domain
#   TRAEFIK_CREDENTIALS_PATH    Path to credentials file
#   ACME_EMAIL                  Let's Encrypt email
#
# Example:
#   ./traefik.sh -p ~/deployment -d traefik.example.com -c ~/.htpasswd
# ==============================================================================

# ------------------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------------------

readonly SCRIPT_NAME="$(basename "$0")"
readonly STACK_NAME="global"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# ------------------------------------------------------------------------------
# Functions
# ------------------------------------------------------------------------------

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%dT%H:%M:%S%z')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%dT%H:%M:%S%z')]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%dT%H:%M:%S%z')]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%dT%H:%M:%S%z')]${NC} $1" >&2
}

usage() {
    cat << EOF
Usage: $SCRIPT_NAME --path <deployment_path> [OPTIONS]

Required:
    -p, --path <path>           Path to deployment directory
    -d, --domain <domain>       Traefik dashboard domain
    -c, --credentials <path>    Path to htpasswd credentials file

Optional:
    -e, --email <email>         Let's Encrypt notification email
    -h, --help                  Show this help message

Environment Variables:
    DEPLOYMENT_PATH             Path to deployment directory
    TRAEFIK_DOMAIN              Dashboard domain
    TRAEFIK_CREDENTIALS_PATH    Path to credentials file
    ACME_EMAIL                  Let's Encrypt email

Examples:
    $SCRIPT_NAME -p ~/deployment -d traefik.example.com -c ~/.htpasswd
    $SCRIPT_NAME --path /opt/app/deployment --domain traefik.example.com --credentials /etc/traefik/.htpasswd

Expected directory structure:
    <deployment_path>/
    └── traefik/
        ├── docker-compose.traefik.yml
        ├── networks.yml
        └── volumes.yml

Generate htpasswd file:
    htpasswd -c ~/.htpasswd admin
EOF
    exit 1
}

validate_files() {
    local files=("$@")
    local missing=()

    for file in "${files[@]}"; do
        [[ ! -f "$file" ]] && missing+=("$file")
    done

    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "Missing configuration files:"
        for file in "${missing[@]}"; do
            log_error "  - $file"
        done
        exit 1
    fi
}

create_networks() {
    local config_file="$1"

    log "Setting up Docker networks..."

    grep -E '^\s+name:\s+' "$config_file" | awk '{print $2}' | while read -r network; do
        if ! docker network inspect "$network" &>/dev/null; then
            log "Creating network: $network"
            docker network create "$network"
        else
            log "Network exists: $network"
        fi
    done
}

create_volumes() {
    local config_file="$1"

    log "Setting up Docker volumes..."

    grep -E '^\s+name:\s+' "$config_file" | awk '{print $2}' | while read -r volume; do
        if ! docker volume inspect "$volume" &>/dev/null; then
            log "Creating volume: $volume"
            docker volume create "$volume"
        else
            log "Volume exists: $volume"
        fi
    done
}

# ------------------------------------------------------------------------------
# Main
# ------------------------------------------------------------------------------

main() {
    # Default values from environment
    local deployment_path="${DEPLOYMENT_PATH:-}"
    local domain="${TRAEFIK_DOMAIN:-}"
    local credentials="${TRAEFIK_CREDENTIALS_PATH:-}"
    local email="${ACME_EMAIL:-}"

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
            -c|--credentials)
                credentials="$2"
                shift 2
                ;;
            -e|--email)
                email="$2"
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
    log "Traefik Deployment"
    log "=========================================="

    # Validate required parameters
    if [[ -z "$deployment_path" ]]; then
        log_error "Deployment path is not set."
        log_error "Use --path flag or set DEPLOYMENT_PATH environment variable."
        exit 1
    fi

    if [[ -z "$domain" ]]; then
        log_error "TRAEFIK_DOMAIN is not set."
        log_error "Use --domain flag or set TRAEFIK_DOMAIN environment variable."
        exit 1
    fi

    if [[ -z "$credentials" ]]; then
        log_error "TRAEFIK_CREDENTIALS_PATH is not set."
        log_error "Use --credentials flag or set TRAEFIK_CREDENTIALS_PATH environment variable."
        exit 1
    fi

    # Resolve deployment path to absolute path
    if [[ -d "$deployment_path" ]]; then
        deployment_path=$(cd "$deployment_path" && pwd)
    else
        log_error "Deployment directory not found: $deployment_path"
        exit 1
    fi

    # Resolve and validate credentials path
    if [[ -f "$credentials" ]]; then
        credentials=$(cd "$(dirname "$credentials")" && pwd)/$(basename "$credentials")
    else
        log_error "Credentials file not found: $credentials"
        log ""
        log "Generate a credentials file with:"
        log "  htpasswd -c $credentials admin"
        exit 1
    fi

    # Export environment variables
    export TRAEFIK_DOMAIN="$domain"
    export TRAEFIK_CREDENTIALS_PATH="$credentials"
    export ACME_EMAIL="${email:-admin@$domain}"

    log "Path:        $deployment_path"
    log "Domain:      $TRAEFIK_DOMAIN"
    log "Credentials: $TRAEFIK_CREDENTIALS_PATH"
    log "ACME Email:  $ACME_EMAIL"
    log "=========================================="

    # Define paths
    local traefik_dir="$deployment_path/traefik"
    local compose_file="$traefik_dir/docker-compose.traefik.yml"
    local networks_config="$traefik_dir/networks.yml"
    local volumes_config="$traefik_dir/volumes.yml"

    # Validate configuration files
    validate_files "$compose_file" "$networks_config" "$volumes_config"

    # Create infrastructure
    create_networks "$networks_config"
    create_volumes "$volumes_config"

    # Deploy stack
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
}

main "$@"
