#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script Name: deploy.sh
# Description: Unified deployment script for Docker Compose stacks.
#              Orchestrates networks, volumes, and container deployment.
#
# Usage:       ./deploy.sh <project_name> <environment>
# Example:     ./deploy.sh prod production
#              ./deploy.sh dev development
#
# Arguments:
#   project_name    Docker Compose project name (e.g., prod, dev)
#   environment     Environment name matching directory (production, development)
#
# Required Environment Variables:
#   IMAGE_REGISTRY  Container registry (e.g., ghcr.io)
#   IMAGE_PREFIX    Image name prefix (e.g., owner/repo)
#   IMAGE_TAG       Image tag (e.g., v1.0.0, dev-1.0.0)
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
Usage: $SCRIPT_NAME <project_name> <environment>

Arguments:
    project_name    Docker Compose project name (e.g., prod, dev)
    environment     Environment name (production, development)

Examples:
    $SCRIPT_NAME prod production
    $SCRIPT_NAME dev development

Required Environment Variables:
    IMAGE_REGISTRY  Container registry (e.g., ghcr.io)
    IMAGE_PREFIX    Image name prefix (e.g., owner/repo)
    IMAGE_TAG       Image tag (e.g., v1.0.0)
EOF
    exit 1
}

validate_environment_vars() {
    local missing=()

    [[ -z "${IMAGE_REGISTRY:-}" ]] && missing+=("IMAGE_REGISTRY")
    [[ -z "${IMAGE_PREFIX:-}" ]] && missing+=("IMAGE_PREFIX")
    [[ -z "${IMAGE_TAG:-}" ]] && missing+=("IMAGE_TAG")

    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "Missing required environment variables: ${missing[*]}"
        exit 1
    fi
}

cleanup_on_error() {
    log_error "Deployment failed. Rolling back..."
    exit 1
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
    validate_environment_vars

    # Validate required files
    validate_files "$app_compose_file" "$networks_config" "$volumes_config" "$traefik_networks" "$env_file"

    # Display deployment info
    log "=========================================="
    log "Starting Deployment"
    log "=========================================="
    log "Project:     $project_name"
    log "Environment: $environment"
    log "Image:       $IMAGE_REGISTRY/$IMAGE_PREFIX:$IMAGE_TAG"
    log "=========================================="

    # Create networks
    create_networks "$networks_config"

    # Ensure traefik network exists (external dependency)
    if ! docker network inspect "traefik-network" &>/dev/null; then
        log "Creating network: traefik-network"
        docker network create "traefik-network"
    fi

    # Create volumes
    create_volumes "$volumes_config"

    # Pull images
    log "Pulling images..."
    docker compose \
        -p "$project_name" \
        --env-file "$env_file" \
        -f "$traefik_networks" \
        -f "$networks_config" \
        -f "$volumes_config" \
        -f "$app_compose_file" \
        pull

    # Deploy stack
    log "Deploying stack..."
    docker compose \
        -p "$project_name" \
        --env-file "$env_file" \
        -f "$traefik_networks" \
        -f "$networks_config" \
        -f "$volumes_config" \
        -f "$app_compose_file" \
        up --remove-orphans -d

    # Remove error trap on success
    trap - ERR

    log_success "=========================================="
    log_success "Deployment Complete"
    log_success "=========================================="
    log "View logs: docker compose -p $project_name logs -f"
    log "Status:    docker compose -p $project_name ps"
}

main "$@"
