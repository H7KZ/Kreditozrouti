#!/bin/bash
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
# Required Env Vars:
#   - IMAGE_REGISTRY (e.g., ghcr.io)
#   - IMAGE_PREFIX   (e.g., owner/repo)
#   - IMAGE_TAG      (e.g., v1.0.0)
# ==============================================================================

log() {
    echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] $1"
}

usage() {
    echo "Usage: $0 <project_name> <environment>"
    echo "Example: $0 prod production"
    exit 1
}

if [ -z "${1:-}" ]; then
    echo "Error: No project name specified."
    usage
fi

PROJECT_NAME="$1"
ENVIRONMENT="${2:-production}"

# Validate Environment Variables
if [ -z "${IMAGE_REGISTRY:-}" ] || [ -z "${IMAGE_PREFIX:-}" ] || [ -z "${IMAGE_TAG:-}" ]; then
    echo "Error: Required environment variables are missing."
    echo "Please export: IMAGE_REGISTRY, IMAGE_PREFIX, IMAGE_TAG"
    exit 1
fi

log "Starting Deployment"
log "Project: $PROJECT_NAME"
log "Environment: $ENVIRONMENT"
log "Image: $IMAGE_REGISTRY/$IMAGE_PREFIX:$IMAGE_TAG"

# Path Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_COMPOSE_FILE="$SCRIPT_DIR/$ENVIRONMENT/docker-compose.$ENVIRONMENT.yml"
NETWORKS_CONFIG="$SCRIPT_DIR/$ENVIRONMENT/networks.yml"
VOLUMES_CONFIG="$SCRIPT_DIR/$ENVIRONMENT/volumes.yml"
TRAEFIK_NETWORKS="$SCRIPT_DIR/traefik/networks.yml"
ENV_FILE="$SCRIPT_DIR/$ENVIRONMENT/.env"

# File Validation
REQUIRED_FILES=("$APP_COMPOSE_FILE" "$NETWORKS_CONFIG" "$VOLUMES_CONFIG" "$TRAEFIK_NETWORKS" "$ENV_FILE")
for FILE in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$FILE" ]; then
        echo "Error: Configuration file not found: $FILE"
        exit 1
    fi
done

log "Configuration files validated."

# Network Setup
log "Configuring Docker networks..."
# Create project specific networks
awk '/name:/ {print $2}' "$NETWORKS_CONFIG" | while read -r NETWORK; do
    if ! docker network inspect "$NETWORK" &>/dev/null; then
        log "Creating network: $NETWORK"
        docker network create "$NETWORK"
    fi
done

# Ensure traefik network exists
if ! docker network inspect "traefik-network" &>/dev/null; then
    log "Creating network: traefik-network"
    docker network create "traefik-network"
fi

# Volume Setup
log "Configuring Docker volumes..."
awk '/name:/ {print $2}' "$VOLUMES_CONFIG" | while read -r VOLUME; do
    if ! docker volume inspect "$VOLUME" &>/dev/null; then
        log "Creating volume: $VOLUME"
        docker volume create "$VOLUME"
    fi
done

# Pull Images
log "Pulling images..."
docker compose \
    -p "$PROJECT_NAME" \
    --env-file "$ENV_FILE" \
    -f "$APP_COMPOSE_FILE" \
    -f "$TRAEFIK_NETWORKS" \
    -f "$NETWORKS_CONFIG" \
    -f "$VOLUMES_CONFIG" \
    pull

# Deploy
log "Deploying stack..."
docker compose \
    -p "$PROJECT_NAME" \
    --env-file "$ENV_FILE" \
    -f "$APP_COMPOSE_FILE" \
    -f "$TRAEFIK_NETWORKS" \
    -f "$NETWORKS_CONFIG" \
    -f "$VOLUMES_CONFIG" \
    up --remove-orphans -d

log "Deployment Complete."
log "View logs with: docker compose -p $PROJECT_NAME logs -f"
