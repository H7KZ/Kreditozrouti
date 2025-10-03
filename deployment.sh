#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# The hardcoded name for the stack that manages Traefik and other global services
GLOBAL_STACK_NAME="global"

# Check if a project name (the application stack name) was provided
if [ -z "$1" ]; then
    echo "❌ Error: No project name specified."
    echo "Usage: $0 <project_name> [environment]"
    echo "Example: $0 my-app-prod prod"
    exit 1
fi

PROJECT_NAME="$1"

# Set the environment, defaulting to 'prod' if the second argument is not provided
ENVIRONMENT=${2:-prod}

echo "================================================="
echo "🚀 Project Namespace: $PROJECT_NAME"
echo "🌍 Environment:       $ENVIRONMENT"
echo "================================================="
echo

echo "# Starting Deployment Process"
echo

echo "# Load Networks and Volumes"
echo

NETWORKS_CONFIG_PATH="./deployment/$ENVIRONMENT/networks.yml"
VOLUMES_CONFIG_PATH="./deployment/$ENVIRONMENT/volumes.yml"

if [ ! -f "$NETWORKS_CONFIG_PATH" ]; then echo "❌ Error: Network config '$NETWORKS_CONFIG_PATH' not found!"; exit 1; fi
if [ ! -f "$VOLUMES_CONFIG_PATH" ]; then echo "❌ Error: Volume config '$VOLUMES_CONFIG_PATH' not found!"; exit 1; fi

echo "- Parsing networks from '$NETWORKS_CONFIG_PATH'"

NETWORKS=$(awk '/name:/ {print $2}' "$NETWORKS_CONFIG_PATH")

for NETWORK in $NETWORKS; do
    if ! docker network inspect "$NETWORK" &>/dev/null; then
        echo "--> Creating network: $NETWORK"
        docker network create "$NETWORK"
    else
        echo "--> Network already exists: $NETWORK"
    fi
done

echo "- Parsing volumes from '$VOLUMES_CONFIG_PATH'"

VOLUMES=$(awk '/name:/ {print $2}' "$VOLUMES_CONFIG_PATH")

for VOLUME in $VOLUMES; do
    if ! docker volume inspect "$VOLUME" &>/dev/null; then
        echo "--> Creating volume: $VOLUME"
        docker volume create "$VOLUME"
    else
        echo "--> Volume already exists: $VOLUME"
    fi
done

echo
echo "✅ Networks and volumes are set up!"
echo

echo "# Deploy Traefik (if not already running)"
echo

TRAEFIK_NETWORKS_CONFIG_PATH="./deployment/traefik.networks.yml"

if [ ! -f "$TRAEFIK_NETWORKS_CONFIG_PATH" ]; then echo "❌ Error: Traefik network config '$TRAEFIK_NETWORKS_CONFIG_PATH' not found!"; exit 1; fi

echo "- Parsing networks from '$TRAEFIK_NETWORKS_CONFIG_PATH'"

NETWORKS=$(awk '/name:/ {print $2}' "$TRAEFIK_NETWORKS_CONFIG_PATH")

for NETWORK in $NETWORKS; do
    if ! docker network inspect "$NETWORK" &>/dev/null; then
        echo "--> Creating network: $NETWORK"
        docker network create "$NETWORK"
    else
        echo "--> Network already exists: $NETWORK"
    fi
done

echo
echo "✅ Traefik networks are set up!"
echo

echo "# Checking for existing Traefik deployment..."
echo

# Check if a container with 'traefik' in its name is already running
# We check this to avoid re-deploying the global stack unnecessarily (causing downtime)
if [ -n "$(docker ps -q --filter "name=traefik")" ]; then
    echo "✅ Traefik container is already running. Skipping global stack deployment."
else
    echo "ℹ️ No running Traefik container detected. Setting up the '$GLOBAL_STACK_NAME' stack..."

    TRAEFIK_VOLUMES_CONFIG_PATH="./deployment/traefik.volumes.yml"

    if [ ! -f "$TRAEFIK_VOLUMES_CONFIG_PATH" ]; then echo "❌ Error: Traefik volume config '$TRAEFIK_VOLUMES_CONFIG_PATH' not found!"; exit 1; fi

    echo "- Parsing volumes from '$TRAEFIK_VOLUMES_CONFIG_PATH'"

    VOLUMES=$(awk '/name:/ {print $2}' "$TRAEFIK_VOLUMES_CONFIG_PATH")
    
    for VOLUME in $VOLUMES; do
        if ! docker volume inspect "$VOLUME" &>/dev/null; then
            echo "--> Creating volume: $VOLUME"
            docker volume create "$VOLUME"
        else
            echo "--> Volume already exists: $VOLUME"
        fi
    done

    echo
    echo "✅ Traefik volumes are set up!"
    echo

    TRAEFIK_COMPOSE_FILE="docker-compose.traefik.yml"

    if [ ! -f "$TRAEFIK_COMPOSE_FILE" ]; then echo "❌ Error: Traefik config '$TRAEFIK_COMPOSE_FILE' not found!"; exit 1; fi
    
    echo "Deploying '$GLOBAL_STACK_NAME' stack with Traefik..."
    echo

    docker compose -p "$GLOBAL_STACK_NAME" -f "$TRAEFIK_COMPOSE_FILE" up -d

    if [ $? -eq 0 ]; then
        echo "✅ Global stack deployed successfully."
    else
        echo "❌ Error: Failed to deploy the '$GLOBAL_STACK_NAME' stack."
        exit 1
    fi
fi

echo
echo "# Application Stack Deployment"
echo

# Construct the filename for the environment-specific compose file
APP_COMPOSE_FILE="docker-compose.${ENVIRONMENT}.yml"

echo "- Looking for configuration file: '$APP_COMPOSE_FILE'"

# Check for the application's docker-compose file
if [ ! -f "$APP_COMPOSE_FILE" ]; then
    echo "❌ Error: Main deployment file '$APP_COMPOSE_FILE' not found!"
    exit 1
fi

echo
echo "# Deploying '$PROJECT_NAME' stack..."
echo

# Execute the docker compose command for the application stack
docker compose \
    -p "$PROJECT_NAME" \
    -f "$APP_COMPOSE_FILE" \
    up --remove-orphans --build -d

if [ $? -eq 0 ]; then
    echo "✅ Application stack '$PROJECT_NAME' deployed successfully."
else
    echo "❌ Error: Docker Compose command failed for project '$PROJECT_NAME'. Please check the output above."
    exit 1
fi

echo
echo "# Cleanup"
echo
echo "Clearing unused Docker resources (images, containers, etc.)..."
echo

docker system prune -af

echo "✅ Cleanup complete."
echo
echo "✨ Deployment Finished! ✨"
