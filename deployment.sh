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


echo "================================================="
echo "🚀 Project Namespace: $PROJECT_NAME"
echo "🌍 Environment:       $ENVIRONMENT"
echo "================================================="
echo


echo "# Starting Application Deployment Process"
echo


APP_COMPOSE_FILE="./deployment/$ENVIRONMENT/docker-compose.${ENVIRONMENT}.yml"
NETWORKS_CONFIG_PATH="./deployment/$ENVIRONMENT/networks.yml"
VOLUMES_CONFIG_PATH="./deployment/$ENVIRONMENT/volumes.yml"
TRAEFIK_NETWORKS_CONFIG_PATH="./deployment/traefik/networks.yml" # Needed to connect the app to Traefik

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


echo "# Deploying '$PROJECT_NAME' stack..."
docker compose \
    -p "$PROJECT_NAME" \
    -f "$APP_COMPOSE_FILE" \
    -f "$TRAEFIK_NETWORKS_CONFIG_PATH" \
    -f "$NETWORKS_CONFIG_PATH" \
    -f "$VOLUMES_CONFIG_PATH" \
    up --remove-orphans --build -d

if [ $? -eq 0 ]; then
    echo "✅ Application stack '$PROJECT_NAME' deployed successfully."
else
    echo "❌ Error: Docker Compose command failed for project '$PROJECT_NAME'. Please check the output above."
    exit 1
fi


echo
echo "✨ Application Deployment Finished! ✨"
