#!/bin/bash

set -e

if [ -z "$1" ]; then
    echo "❌ Error: No project name specified."
    echo "Usage: $0 <project_name> [environment]"
    echo "Example: $0 my-app-prod prod"
    exit 1
fi

PROJECT_NAME="$1"
ENVIRONMENT=${2:-prod}

# Check for required image environment variables
if [ -z "$IMAGE_REGISTRY" ] || [ -z "$IMAGE_PREFIX" ] || [ -z "$IMAGE_TAG" ]; then
    echo "⚠️  Warning: Image variables not set. Using defaults."
    echo "   Set IMAGE_REGISTRY, IMAGE_PREFIX, IMAGE_TAG for registry images."
fi

echo "================================================="
echo "🚀 Project Namespace: $PROJECT_NAME"
echo "🌐 Environment:       $ENVIRONMENT"
if [ -n "$IMAGE_TAG" ]; then
    echo "🏷️  Image Tag:         $IMAGE_TAG"
    echo "📦 Registry:          $IMAGE_REGISTRY/$IMAGE_PREFIX"
fi
echo "================================================="
echo


echo "# Starting Application Deployment Process"
echo

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "📁 Current Directory: $SCRIPT_DIR"
echo

APP_COMPOSE_FILE="$SCRIPT_DIR/$ENVIRONMENT/docker-compose.${ENVIRONMENT}.yml"
NETWORKS_CONFIG_PATH="$SCRIPT_DIR/$ENVIRONMENT/networks.yml"
VOLUMES_CONFIG_PATH="$SCRIPT_DIR/$ENVIRONMENT/volumes.yml"
TRAEFIK_NETWORKS_CONFIG_PATH="$SCRIPT_DIR/traefik/networks.yml"

if [ ! -f "$APP_COMPOSE_FILE" ]; then echo "❌ Error: Main deployment file '$APP_COMPOSE_FILE' not found!"; exit 1; fi
if [ ! -f "$NETWORKS_CONFIG_PATH" ]; then echo "❌ Error: Network config '$NETWORKS_CONFIG_PATH' not found!"; exit 1; fi
if [ ! -f "$VOLUMES_CONFIG_PATH" ]; then echo "❌ Error: Volume config '$VOLUMES_CONFIG_PATH' not found!"; exit 1; fi
if [ ! -f "$TRAEFIK_NETWORKS_CONFIG_PATH" ]; then echo "❌ Error: Traefik network config '$TRAEFIK_NETWORKS_CONFIG_PATH' not found! Cannot link application."; exit 1; fi


echo "# Setting up application networks..."
NETWORKS=$(awk '/name:/ {print $2}' "$NETWORKS_CONFIG_PATH")

for NETWORK in $NETWORKS; do
    if ! docker network inspect "$NETWORK" &>/dev/null; then
        echo "--> Creating network: $NETWORK"
        docker network create "$NETWORK"
    else
        echo "--> Network already exists: $NETWORK"
    fi
done
echo "✅ Application networks are ready."
echo


echo "# Setting up application volumes..."
VOLUMES=$(awk '/name:/ {print $2}' "$VOLUMES_CONFIG_PATH")

for VOLUME in $VOLUMES; do
    if ! docker volume inspect "$VOLUME" &>/dev/null; then
        echo "--> Creating volume: $VOLUME"
        docker volume create "$VOLUME"
    else
        echo "--> Volume already exists: $VOLUME"
    fi
done
echo "✅ Application volumes are ready."
echo


echo "# Pulling latest images from registry..."
docker compose \
    -p "$PROJECT_NAME" \
    -f "$APP_COMPOSE_FILE" \
    -f "$TRAEFIK_NETWORKS_CONFIG_PATH" \
    -f "$NETWORKS_CONFIG_PATH" \
    -f "$VOLUMES_CONFIG_PATH" \
    pull

if [ $? -eq 0 ]; then
    echo "✅ Images pulled successfully."
else
    echo "❌ Error: Failed to pull images. Please check your registry credentials."
    exit 1
fi
echo


echo "# Deploying '$PROJECT_NAME' stack..."
docker compose \
    -p "$PROJECT_NAME" \
    -f "$APP_COMPOSE_FILE" \
    -f "$TRAEFIK_NETWORKS_CONFIG_PATH" \
    -f "$NETWORKS_CONFIG_PATH" \
    -f "$VOLUMES_CONFIG_PATH" \
    up --remove-orphans -d

if [ $? -eq 0 ]; then
    echo "✅ Application stack '$PROJECT_NAME' deployed successfully."
else
    echo "❌ Error: Docker Compose command failed for project '$PROJECT_NAME'. Please check the output above."
    exit 1
fi


echo
echo "✨ Application Deployment Finished! ✨"
