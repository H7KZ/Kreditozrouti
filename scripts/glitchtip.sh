#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script Name: glitchtip.sh
# Description: Deploys GlitchTip error tracking service.
#              Sets up required networks, volumes, and all GlitchTip components.
#
# Usage:       ./glitchtip.sh --path <deployment_path> [OPTIONS]
#
# Options:
#   -p, --path <path>           Path to deployment directory (required)
#   -d, --domain <domain>       GlitchTip domain (required)
#   -s, --secret <key>          Django SECRET_KEY (required)
#   --postgres-password <pw>    PostgreSQL password (required)
#   -e, --email <url>           EMAIL_URL for SMTP (optional)
#   --from-email <email>        DEFAULT_FROM_EMAIL (optional)
#   --max-event-days <days>     Max event retention days (default: 90)
#   -h, --help                  Show help message
#
# Environment Variables (alternative to flags):
#   DEPLOYMENT_PATH             Path to deployment directory
#   GLITCHTIP_DOMAIN            GlitchTip domain
#   SECRET_KEY                  Django secret key
#   POSTGRES_PASSWORD           PostgreSQL password
#   EMAIL_URL                   SMTP connection string
#   DEFAULT_FROM_EMAIL          Sender email address
#   GLITCHTIP_MAX_EVENT_LIFE_DAYS  Event retention (days)
#
# Example:
#   ./glitchtip.sh -p ~/deployment -d glitchtip.example.com -s "random-secret" --postgres-password "dbpass"
# ==============================================================================

# ------------------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------------------

readonly SCRIPT_NAME="$(basename "$0")"
readonly STACK_NAME="glitchtip"

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
    -d, --domain <domain>       GlitchTip domain (e.g., glitchtip.example.com)
    -s, --secret <key>          Django SECRET_KEY (random string)
    --postgres-password <pw>    PostgreSQL password

Optional:
    -e, --email <url>           EMAIL_URL for SMTP (default: consolemail://)
    --from-email <email>        DEFAULT_FROM_EMAIL sender address
    --max-event-days <days>     Max event retention in days (default: 90)
    --enable-registration       Enable user self-registration (default: True)
    -h, --help                  Show this help message

Environment Variables:
    DEPLOYMENT_PATH             Path to deployment directory
    GLITCHTIP_DOMAIN            GlitchTip domain
    SECRET_KEY                  Django secret key
    POSTGRES_PASSWORD           PostgreSQL password
    EMAIL_URL                   SMTP connection string
    DEFAULT_FROM_EMAIL          Sender email address
    GLITCHTIP_MAX_EVENT_LIFE_DAYS  Event retention (days)
    ENABLE_USER_REGISTRATION    Enable self-registration

Examples:
    $SCRIPT_NAME -p ~/deployment -d glitchtip.example.com -s "\$(openssl rand -hex 32)" --postgres-password "securepass"

    # With email configuration
    $SCRIPT_NAME -p ~/deployment -d glitchtip.example.com -s "secret" --postgres-password "dbpass" \\
        -e "smtp://user:pass@smtp.example.com:587" --from-email "errors@example.com"

Generate a secret key:
    openssl rand -hex 32

Expected directory structure:
    <deployment_path>/
    └── glitchtip/
        └── docker-compose.glitchtip.yml
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
    local domain="${GLITCHTIP_DOMAIN:-}"
    local secret_key="${SECRET_KEY:-}"
    local postgres_password="${POSTGRES_PASSWORD:-}"
    local email_url="${EMAIL_URL:-consolemail://}"
    local from_email="${DEFAULT_FROM_EMAIL:-}"
    local max_event_days="${GLITCHTIP_MAX_EVENT_LIFE_DAYS:-90}"
    local enable_registration="${ENABLE_USER_REGISTRATION:-True}"

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
            -s|--secret)
                secret_key="$2"
                shift 2
                ;;
            --postgres-password)
                postgres_password="$2"
                shift 2
                ;;
            -e|--email)
                email_url="$2"
                shift 2
                ;;
            --from-email)
                from_email="$2"
                shift 2
                ;;
            --max-event-days)
                max_event_days="$2"
                shift 2
                ;;
            --enable-registration)
                enable_registration="True"
                shift
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
    log "GlitchTip Deployment"
    log "=========================================="

    # Validate required parameters
    if [[ -z "$deployment_path" ]]; then
        log_error "Deployment path is not set."
        log_error "Use --path flag or set DEPLOYMENT_PATH environment variable."
        exit 1
    fi

    if [[ -z "$domain" ]]; then
        log_error "GLITCHTIP_DOMAIN is not set."
        log_error "Use --domain flag or set GLITCHTIP_DOMAIN environment variable."
        exit 1
    fi

    if [[ -z "$secret_key" ]]; then
        log_error "SECRET_KEY is not set."
        log_error "Use --secret flag or set SECRET_KEY environment variable."
        log_error "Generate one with: openssl rand -hex 32"
        exit 1
    fi

    if [[ -z "$postgres_password" ]]; then
        log_error "POSTGRES_PASSWORD is not set."
        log_error "Use --postgres-password flag or set POSTGRES_PASSWORD environment variable."
        exit 1
    fi

    # Resolve deployment path to absolute path
    if [[ -d "$deployment_path" ]]; then
        deployment_path=$(cd "$deployment_path" && pwd)
    else
        log_error "Deployment directory not found: $deployment_path"
        exit 1
    fi

    # Set default from_email if not provided
    if [[ -z "$from_email" ]]; then
        from_email="noreply@$domain"
    fi

    # Export environment variables
    export GLITCHTIP_DOMAIN="$domain"
    export SECRET_KEY="$secret_key"
    export POSTGRES_PASSWORD="$postgres_password"
    export EMAIL_URL="$email_url"
    export DEFAULT_FROM_EMAIL="$from_email"
    export GLITCHTIP_MAX_EVENT_LIFE_DAYS="$max_event_days"
    export ENABLE_USER_REGISTRATION="$enable_registration"

    log "Path:           $deployment_path"
    log "Domain:         https://$GLITCHTIP_DOMAIN"
    log "From Email:     $DEFAULT_FROM_EMAIL"
    log "Max Event Days: $GLITCHTIP_MAX_EVENT_LIFE_DAYS"
    log "Registration:   $ENABLE_USER_REGISTRATION"
    log "=========================================="

    # Define paths
    local glitchtip_dir="$deployment_path/glitchtip"
    local compose_file="$glitchtip_dir/docker-compose.glitchtip.yml"
    local networks_config="$glitchtip_dir/networks.yml"
    local volumes_config="$glitchtip_dir/volumes.yml"

    # Validate configuration files
    validate_files "$compose_file" "$networks_config" "$volumes_config"

    # Create infrastructure
    create_networks "$networks_config"
    create_volumes "$volumes_config"

    # Deploy stack
    log "Deploying GlitchTip stack..."
    docker compose \
        -p "$STACK_NAME" \
        -f "$networks_config" \
        -f "$volumes_config" \
        -f "$compose_file" \
        up -d

    log_success "=========================================="
    log_success "GlitchTip Deployment Complete"
    log_success "=========================================="
    log ""
    log "GlitchTip URL: https://$GLITCHTIP_DOMAIN"
    log "Logs:          docker compose -p $STACK_NAME logs -f"
}

main "$@"
