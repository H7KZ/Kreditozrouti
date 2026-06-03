#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script Name: deploy.sh
# Description: Unified deployment script for Docker Compose stacks.
#              Orchestrates networks, volumes, and container deployment.
#              Supports full-stack and per-service deployments.
#
# Usage:       ./deploy.sh <project_name> <environment> [service]
# Example:     ./deploy.sh prod production
#              ./deploy.sh dev development
#              ./deploy.sh prod production api
#              ./deploy.sh prod production client
#
# Arguments:
#   project_name    Docker Compose project name (e.g., prod, dev)
#   environment     Environment name matching directory (production, development)
#   service         (optional) Single service to deploy (api, client, scraper)
#
# Required Environment Variables:
#   IMAGE_REGISTRY      Container registry (e.g., ghcr.io)
#   IMAGE_PREFIX        Image name prefix (e.g., owner/repo)
#
# For full-stack deploy (no service arg):
#   API_IMAGE_TAG       Image tag for the api service (e.g., v1.0.0)
#   CLIENT_IMAGE_TAG    Image tag for the client service (e.g., v1.0.0)
#   SCRAPER_IMAGE_TAG   Image tag for the scraper service (e.g., v1.0.0)
#
# For single-service deploy:
#   API_IMAGE_TAG       Required when service=api
#   CLIENT_IMAGE_TAG    Required when service=client
#   SCRAPER_IMAGE_TAG   Required when service=scraper
#
# Version Cleanup:
#   After a successful deploy, old version directories under
#   $HOME/versions/<environment>/ that are older than 7 days and not the
#   current symlink target are removed. A minimum of 3 versions is always kept.
#
# Directory Structure:
#   ./
#   ├── <environment>/
#   │   ├── docker-compose.<environment>.yml
#   │   ├── networks.yml
#   │   ├── volumes.yml
#   │   └── .env
#   └── traefik/
#       └── networks.yml
# ==============================================================================

# ------------------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------------------

readonly SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$HOME/scripts/lib.sh"

# ------------------------------------------------------------------------------
# Functions
# ------------------------------------------------------------------------------

usage() {
    cat << EOF
Usage: $SCRIPT_NAME <project_name> <environment> [service]

Arguments:
    project_name    Docker Compose project name (e.g., prod, dev)
    environment     Environment name (production, development)
    service         (optional) Single service to deploy (api, client, scraper)

Examples:
    $SCRIPT_NAME prod production
    $SCRIPT_NAME dev development
    $SCRIPT_NAME prod production api
    $SCRIPT_NAME prod production client

Required Environment Variables:
    IMAGE_REGISTRY      Container registry (e.g., ghcr.io)
    IMAGE_PREFIX        Image name prefix (e.g., owner/repo)

Full-stack deploy:
    API_IMAGE_TAG       Image tag for api
    CLIENT_IMAGE_TAG    Image tag for client
    SCRAPER_IMAGE_TAG   Image tag for scraper

Single-service deploy (only the relevant tag is required):
    API_IMAGE_TAG       Required when service=api
    CLIENT_IMAGE_TAG    Required when service=client
    SCRAPER_IMAGE_TAG   Required when service=scraper
EOF
    exit 1
}

validate_environment_vars() {
    local service="$1"
    local missing=()

    [[ -z "${IMAGE_REGISTRY:-}" ]] && missing+=("IMAGE_REGISTRY")
    [[ -z "${IMAGE_PREFIX:-}" ]] && missing+=("IMAGE_PREFIX")

    if [[ -z "$service" ]]; then
        # Full-stack: all three tags required
        [[ -z "${API_IMAGE_TAG:-}" ]] && missing+=("API_IMAGE_TAG")
        [[ -z "${CLIENT_IMAGE_TAG:-}" ]] && missing+=("CLIENT_IMAGE_TAG")
        [[ -z "${SCRAPER_IMAGE_TAG:-}" ]] && missing+=("SCRAPER_IMAGE_TAG")
    else
        # Single-service: only the relevant tag required
        case "$service" in
            api)     [[ -z "${API_IMAGE_TAG:-}" ]]     && missing+=("API_IMAGE_TAG") ;;
            client)  [[ -z "${CLIENT_IMAGE_TAG:-}" ]]  && missing+=("CLIENT_IMAGE_TAG") ;;
            scraper) [[ -z "${SCRAPER_IMAGE_TAG:-}" ]] && missing+=("SCRAPER_IMAGE_TAG") ;;
            *) log_error "Unknown service: '$service'. Valid values: api, client, scraper"; exit 1 ;;
        esac
    fi

    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "Missing required environment variables: ${missing[*]}"
        exit 1
    fi
}

cleanup_on_error() {
    log_error "Deployment failed. Rolling back..."
    exit 1
}

cleanup_old_versions() {
    local environment="$1"
    local versions_dir="$HOME/versions/$environment"
    local current_link="$HOME/versions/$environment/current"

    # Only proceed if the versions directory exists
    [[ -d "$versions_dir" ]] || return 0

    # Get the real path of the current symlink target
    local current_target
    current_target=$(readlink -f "$current_link" 2>/dev/null || echo "")

    # List all version dirs sorted by modification time (oldest first)
    local all_versions=()
    while IFS= read -r -d '' dir; do
        all_versions+=("$dir")
    done < <(find "$versions_dir" -maxdepth 1 -mindepth 1 -type d -printf '%T@\t%p\0' | sort -z | cut -z -f2-)

    local total=${#all_versions[@]}
    local kept=0
    local deleted=0

    for dir in "${all_versions[@]}"; do
        [[ "$dir" == "$current_target" ]] && { ((kept++)); continue; }

        local age_days
        age_days=$(( ($(date +%s) - $(stat -c %Y "$dir")) / 86400 ))

        if [[ $age_days -gt 7 ]] && [[ $((total - deleted)) -gt 3 ]]; then
            log "Removing old version: $(basename "$dir") (${age_days}d old)"
            rm -rf "$dir"
            ((deleted++))
        else
            ((kept++))
        fi
    done

    [[ $deleted -gt 0 ]] && log_success "Cleaned up $deleted old version(s), kept $kept"
    [[ $deleted -eq 0 ]] && log "Version cleanup: $kept version(s) kept, nothing removed"
}

# ------------------------------------------------------------------------------
# Main
# ------------------------------------------------------------------------------

main() {
    # Parse arguments
    if [[ $# -lt 1 ]]; then
        log_error "No project name specified."
        usage
    fi

    local project_name="$1"
    local environment="${2:-production}"
    local service="${3:-}"

    # Set up error handling
    trap cleanup_on_error ERR

    # Define paths
    local images_config="$SCRIPT_DIR/.images"
    local app_compose_file="$SCRIPT_DIR/$environment/docker-compose.$environment.yml"
    local networks_config="$SCRIPT_DIR/$environment/networks.yml"
    local volumes_config="$SCRIPT_DIR/$environment/volumes.yml"
    local traefik_networks="$SCRIPT_DIR/traefik/networks.yml"
    local env_file="$SCRIPT_DIR/.env"

    # Load persisted image configuration if available
    if [[ -f "$images_config" ]]; then
        log "Loading image configuration from $images_config..."
        set -a
        # shellcheck source=/dev/null
        source "$images_config"
        set +a
    fi

    # Validate environment variables
    validate_environment_vars "$service"

    # Validate required files
    validate_files "$app_compose_file" "$networks_config" "$volumes_config" "$traefik_networks" "$env_file"

    # Display deployment info
    log "=========================================="
    log "Starting Deployment"
    log "=========================================="
    log "Project:     $project_name"
    log "Environment: $environment"
    if [[ -n "$service" ]]; then
        log "Service:     $service (single-service deploy)"
    fi
    log "Registry:    $IMAGE_REGISTRY/$IMAGE_PREFIX"
    if [[ -n "$service" ]]; then
        case "$service" in
            api)     log "Tag:         ${API_IMAGE_TAG}" ;;
            client)  log "Tag:         ${CLIENT_IMAGE_TAG}" ;;
            scraper) log "Tag:         ${SCRAPER_IMAGE_TAG}" ;;
        esac
    else
        log "Tags:        api=${API_IMAGE_TAG:-} client=${CLIENT_IMAGE_TAG:-} scraper=${SCRAPER_IMAGE_TAG:-}"
    fi
    log "=========================================="

    if [[ -n "$service" ]]; then
        # ---- Per-service deploy ----
        log "Pulling image for $service..."
        docker compose \
            -p "$project_name" \
            --env-file "$env_file" \
            -f "$traefik_networks" \
            -f "$networks_config" \
            -f "$volumes_config" \
            -f "$app_compose_file" \
            pull "$service"

        log "Deploying $service..."
        docker compose \
            -p "$project_name" \
            --env-file "$env_file" \
            -f "$traefik_networks" \
            -f "$networks_config" \
            -f "$volumes_config" \
            -f "$app_compose_file" \
            up --no-deps -d "$service"
    else
        # ---- Full-stack deploy ----
        create_networks "$networks_config"

        # Ensure traefik network exists (external dependency)
        if ! docker network inspect "traefik-network" &>/dev/null; then
            log "Creating network: traefik-network"
            docker network create "traefik-network"
        fi

        create_volumes "$volumes_config"

        log "Pulling images..."
        docker compose \
            -p "$project_name" \
            --env-file "$env_file" \
            -f "$traefik_networks" \
            -f "$networks_config" \
            -f "$volumes_config" \
            -f "$app_compose_file" \
            pull

        log "Deploying stack..."
        docker compose \
            -p "$project_name" \
            --env-file "$env_file" \
            -f "$traefik_networks" \
            -f "$networks_config" \
            -f "$volumes_config" \
            -f "$app_compose_file" \
            up --remove-orphans -d
    fi

    # Remove error trap on success
    trap - ERR

    # Clean up old version directories
    cleanup_old_versions "$environment" || true

    log_success "=========================================="
    log_success "Deployment Complete"
    log_success "=========================================="
    log "View logs: docker compose -p $project_name logs -f"
    log "Status:    docker compose -p $project_name ps"
}

main "$@"
