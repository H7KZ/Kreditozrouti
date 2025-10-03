#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Check if a project name (namespace) was provided as an argument
if [ -z "$1" ]; then
    echo "Error: No project name specified."
    echo "Usage: $0 <project_name>"
    exit 1
fi

PROJECT_NAME="$1"

echo "🚀 Deploying to project namespace: $PROJECT_NAME"
echo

# Check if a container with 'traefik' in its name is already running
if [ -n "$(docker ps -q --filter "name=traefik")" ]; then
    echo "✅ Traefik container is already running. Skipping Traefik-specific setup."
    SKIP_TRAEFIK_SETUP=true
else
    echo "ℹ️ No running Traefik container detected. Including Traefik setup."
    SKIP_TRAEFIK_SETUP=false
fi

echo

# Initialize arguments for the docker compose command
COMPOSE_ARGS=()

# Conditional Traefik Setup
if [ "$SKIP_TRAEFIK_SETUP" = false ]; then
    # (This entire section for setting up Traefik networks, volumes,
    # and compose file remains unchanged and is omitted for brevity)
    echo "Creating Traefik networks..."

    DOCKER_COMPOSE_NETWORKS_CONFIG="docker-compose.networks.yml"

    if [ ! -f "$DOCKER_COMPOSE_NETWORKS_CONFIG" ]; then
        echo "Error: Traefik network config '$DOCKER_COMPOSE_NETWORKS_CONFIG' not found!"
        exit 1
    fi

    NETWORKS=$(awk '/name:/ {print $2}' "$DOCKER_COMPOSE_NETWORKS_CONFIG")

    for NETWORK in $NETWORKS; do
        if ! docker network inspect "$NETWORK" &>/dev/null; then
            echo "   Creating network: $NETWORK"
            docker network create "$NETWORK"
        else
            echo "   Network already exists: $NETWORK"
        fi
    done

    echo "Traefik networks configured!"
    echo

    echo "Creating Traefik volumes..."

    DOCKER_COMPOSE_VOLUMES_CONFIG="docker-compose.volumes.yml"

    if [ ! -f "$DOCKER_COMPOSE_VOLUMES_CONFIG" ]; then
        echo "Error: Traefik volume config '$DOCKER_COMPOSE_VOLUMES_CONFIG' not found!"
        exit 1
    fi

    VOLUMES=$(awk '/name:/ {print $2}' "$DOCKER_COMPOSE_VOLUMES_CONFIG")

    for VOLUME in $VOLUMES; do
        if ! docker volume inspect "$VOLUME" &>/dev/null; then
            echo "   Creating volume: $VOLUME"
            docker volume create "$VOLUME"
        else
            echo "   Volume already exists: $VOLUME"
        fi
    done
    
    echo "Traefik volumes configured!"
    echo

    DOCKER_COMPOSE_TRAEFIK_CONFIG="docker-compose.traefik.yml"
    if [ ! -f "$DOCKER_COMPOSE_TRAEFIK_CONFIG" ]; then echo "Error: Base Traefik config file '$DOCKER_COMPOSE_TRAEFIK_CONFIG' not found!"; exit 1; fi
    COMPOSE_ARGS+=("-f" "$DOCKER_COMPOSE_TRAEFIK_CONFIG")
fi

echo "Adding main deployment configuration..."

MAIN_COMPOSE_FILE="docker-compose.yml"

# Check for the main docker-compose.yml file
if [ ! -f "$MAIN_COMPOSE_FILE" ]; then
    echo "Error: Main deployment file '$MAIN_COMPOSE_FILE' not found!"
    exit 1
fi

# Add the main compose file to the arguments array
COMPOSE_ARGS+=("-f" "$MAIN_COMPOSE_FILE")

# Check if there are any compose files to process at all
if [ ${#COMPOSE_ARGS[@]} -eq 0 ]; then
    echo "Error: No Docker Compose files to process. Exiting."
    exit 1
fi

echo
echo "Using the following configuration files:"

USED_FILES=()

for i in "${!COMPOSE_ARGS[@]}"; do
    if [[ ${COMPOSE_ARGS[i]} == "-f" ]]; then
        USED_FILES+=("${COMPOSE_ARGS[i+1]}")
    fi
done

printf "   - %s\n" "${USED_FILES[@]}"
echo

# Execute the docker compose command with all the collected files
echo "Running Docker Compose..."

docker compose \
    -p "$PROJECT_NAME" \
    "${COMPOSE_ARGS[@]}" \
    up --remove-orphans -d

if [ $? -eq 0 ]; then
    echo "✅ Docker Compose command executed successfully."
else
    echo "❌ Error: Docker Compose command failed. Please check the output above for details."
    exit 1
fi

echo "Deployed!"
echo

# Cleanup
echo "Clearing unused Docker resources..."

docker system prune -af

echo "Cleared!"
echo
echo "✨ Done!"
