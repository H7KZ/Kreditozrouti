#!/bin/bash
set -euo pipefail

# ==============================================================================
# Script Name: rollback.sh
# Description: Switches the current deployment to a previously saved version.
#              Loads registry credentials automatically if available.
#
# Usage:       ./rollback.sh <environment> <version> [options]
# Arguments:
#   environment    production|development
#   version        Tag to rollback to (e.g., v1.0.0)
#
# Options:
#   -l, --list     List available versions
#   -c, --current  Show current version
#   -h, --help     Show help
# ==============================================================================

log() {
    echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] $1"
}

usage() {
    echo "Usage: $0 <environment> <version> [options]"
    echo ""
    echo "Options:"
    echo "  -l, --list     List available versions"
    echo "  -c, --current  Show current deployed version"
    echo "  -h, --help     Show this help message"
    exit 1
}

list_versions() {
    local env=$1
    local versions_dir="$HOME/versions/$env"

    if [ ! -d "$versions_dir" ]; then
        echo "Error: No versions found for environment: $env"
        exit 1
    fi

    echo "Available versions for $env:"
    local current
    current=$(readlink -f "$HOME/versions/$env/current" 2>/dev/null || echo "none")

    find "$versions_dir" -maxdepth 1 -mindepth 1 -type d | sort -V | while read -r dir; do
        local version
        version=$(basename "$dir")
        if [ "$version" != "current" ]; then
            local status=" "
            local registry_info=""

            if [ "$dir" = "$current" ]; then
                status="*"
            fi

            if [ -f "$dir/.registry" ]; then
                registry_info="(saved credentials)"
            fi

            echo "  $status $version $registry_info"
        fi
    done
    echo "  (* = current version)"
}

show_current() {
    local env=$1
    local current_link="$HOME/versions/$env/current"

    if [ -L "$current_link" ]; then
        local current_version
        current_version=$(basename "$(readlink -f "$current_link")")
        echo "Current $env version: $current_version"
    else
        echo "No current version set for $env"
    fi
}

# Argument Parsing
if [ -z "${1:-}" ]; then
    usage
fi

ENVIRONMENT="$1"
shift

if [[ "$ENVIRONMENT" != "production" && "$ENVIRONMENT" != "development" ]]; then
    echo "Error: Invalid environment '$ENVIRONMENT'. Must be 'production' or 'development'."
    exit 1
fi

case "${1:-}" in
    -l|--list)
        list_versions "$ENVIRONMENT"
        exit 0
        ;;
    -c|--current)
        show_current "$ENVIRONMENT"
        exit 0
        ;;
    -h|--help)
        usage
        ;;
esac

VERSION="${1:-}"

if [ -z "$VERSION" ]; then
    echo "Error: Version not specified."
    usage
fi

# Rollback Execution
VERSION_DIR="$HOME/versions/$ENVIRONMENT/$VERSION"
CURRENT_LINK="$HOME/versions/$ENVIRONMENT/current"
REGISTRY_FILE="$VERSION_DIR/.registry"

# Set Project Names
if [ "$ENVIRONMENT" = "production" ]; then
    PROJECT_NAME="prod"
    ENV_NAME="prod"
else
    PROJECT_NAME="dev"
    ENV_NAME="dev"
fi

log "Initiating Rollback"
log "Target: $ENVIRONMENT / $VERSION"

if [ ! -d "$VERSION_DIR" ]; then
    echo "Error: Version directory not found: $VERSION_DIR"
    list_versions "$ENVIRONMENT"
    exit 1
fi

if [ ! -f "$VERSION_DIR/deploy.sh" ]; then
    echo "Error: deploy.sh not found in version directory."
    exit 1
fi

# Ensure .env exists
if [ ! -f "$VERSION_DIR/$ENV_NAME/.env" ]; then
    log "Warning: .env file not found, attempting to copy from home..."
    cp "$HOME/.env.$ENV_NAME" "$VERSION_DIR/$ENV_NAME/.env" || {
        echo "Error: Could not find .env file source."
        exit 1
    }
fi

# Load Registry Credentials
if [ -f "$REGISTRY_FILE" ]; then
    log "Loading registry credentials from backup..."
    source "$REGISTRY_FILE"
    export IMAGE_REGISTRY
    export IMAGE_PREFIX
    export IMAGE_TAG

    if [ -n "${GHCR_TOKEN:-}" ] && [ -n "${GHCR_USER:-}" ]; then
        log "Logging into container registry..."
        echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
    fi
else
    log "Warning: No registry credential file found."
    log "Attempting to use manual environment variables..."

    export IMAGE_TAG="$VERSION"

    if [ -z "${IMAGE_REGISTRY:-}" ] || [ -z "${IMAGE_PREFIX:-}" ]; then
        echo "Error: IMAGE_REGISTRY and IMAGE_PREFIX must be manually set."
        exit 1
    fi
fi

log "Executing deployment script..."
cd "$VERSION_DIR"
bash ./deploy.sh "$PROJECT_NAME" "$ENV_NAME"

log "Updating symlinks..."
ln -sfn "$VERSION_DIR" "$CURRENT_LINK"

log "Rollback Complete."
log "Current version is now: $(readlink -f "$CURRENT_LINK")"
