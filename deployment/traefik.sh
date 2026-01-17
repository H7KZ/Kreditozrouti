#!/bin/bash
set -euo pipefail

# ==============================================================================
# Script Name: traefik.sh
# Description: Deploys the global Traefik reverse proxy stack.
#              Sets up required global networks and volumes.
#
# Usage:       ./traefik.sh [OPTIONS]
# Options:
#   -d, --domain <domain>       Main domain (e.g., example.com)
#   -c, --credentials <path>    Path to basic auth credentials file
#   -h, --help                  Show help
# ==============================================================================

GLOBAL_STACK_NAME="global"

log() {
    echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] $1"
}

usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  -d, --domain <domain>       Set the Traefik main domain"
    echo "  -c, --credentials <path>    Path to the basic auth credentials file"
    echo "  -h, --help                  Show help"
    exit 1
}

# Default values from Environment
TRAEFIK_DOMAIN="${TRAEFIK_DOMAIN:-}"
TRAEFIK_CREDENTIALS_PATH="${TRAEFIK_CREDENTIALS_PATH:-}"

# Parse Arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -d|--domain) TRAEFIK_DOMAIN="$2"; shift ;;
        -c|--credentials) TRAEFIK_CREDENTIALS_PATH="$2"; shift ;;
        -h|--help) usage ;;
        *) echo "Unknown parameter: $1"; usage ;;
    esac
    shift
done

log "Deploying Global Services (Traefik)"

# Validation
if [ -z "$TRAEFIK_DOMAIN" ]; then
    echo "Error: TRAEFIK_DOMAIN is not set (use --domain or env var)."
    exit 1
fi

if [ -z "$TRAEFIK_CREDENTIALS_PATH" ]; then
    echo "Error: TRAEFIK_CREDENTIALS_PATH is not set (use --credentials or env var)."
    exit 1
fi

# Resolve Absolute Path
if [ -f "$TRAEFIK_CREDENTIALS_PATH" ]; then
    TRAEFIK_CREDENTIALS_PATH=$(cd "$(dirname "$TRAEFIK_CREDENTIALS_PATH")" && pwd)/$(basename "$TRAEFIK_CREDENTIALS_PATH")
else
    echo "Error: Credentials file not found at: $TRAEFIK_CREDENTIALS_PATH"
    exit 1
fi

export TRAEFIK_DOMAIN
export TRAEFIK_CREDENTIALS_PATH

log "Configuration: Domain=$TRAEFIK_DOMAIN"

# Setup Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TRAEFIK_COMPOSE_FILE="$SCRIPT_DIR/traefik/docker-compose.traefik.yml"
TRAEFIK_NETWORKS_CONFIG="$SCRIPT_DIR/traefik/networks.yml"
TRAEFIK_VOLUMES_CONFIG="$SCRIPT_DIR/traefik/volumes.yml"

# File Checks
for FILE in "$TRAEFIK_COMPOSE_FILE" "$TRAEFIK_NETWORKS_CONFIG" "$TRAEFIK_VOLUMES_CONFIG"; do
    if [ ! -f "$FILE" ]; then
        echo "Error: Config file not found: $FILE"
        exit 1
    fi
done

# Infrastructure Setup
log "Setting up networks..."
awk '/name:/ {print $2}' "$TRAEFIK_NETWORKS_CONFIG" | while read -r NETWORK; do
    if ! docker network inspect "$NETWORK" &>/dev/null; then
        log "Creating network: $NETWORK"
        docker network create "$NETWORK"
    fi
done

log "Setting up volumes..."
awk '/name:/ {print $2}' "$TRAEFIK_VOLUMES_CONFIG" | while read -r VOLUME; do
    if ! docker volume inspect "$VOLUME" &>/dev/null; then
        log "Creating volume: $VOLUME"
        docker volume create "$VOLUME"
    fi
done

# Deployment
log "Deploying stack..."
docker compose \
    -p "$GLOBAL_STACK_NAME" \
    -f "$TRAEFIK_COMPOSE_FILE" \
    -f "$TRAEFIK_NETWORKS_CONFIG" \
    -f "$TRAEFIK_VOLUMES_CONFIG" \
    up -d

log "Traefik deployment finished."
