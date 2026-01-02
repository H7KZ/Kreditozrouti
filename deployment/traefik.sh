#!/bin/bash

set -e

GLOBAL_STACK_NAME="global"

echo "================================================="
echo "🌍 Deploying Global Services (Traefik)"
echo "================================================="
echo

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "🔍 Current Directory: $SCRIPT_DIR"
echo

TRAEFIK_COMPOSE_FILE="$SCRIPT_DIR/traefik/docker-compose.traefik.yml"
TRAEFIK_NETWORKS_CONFIG_PATH="$SCRIPT_DIR/traefik/networks.yml"
TRAEFIK_VOLUMES_CONFIG_PATH="$SCRIPT_DIR/traefik/volumes.yml"

if [ ! -f "$TRAEFIK_COMPOSE_FILE" ]; then echo "❌ Error: Traefik config '$TRAEFIK_COMPOSE_FILE' not found!"; exit 1; fi
if [ ! -f "$TRAEFIK_NETWORKS_CONFIG_PATH" ]; then echo "❌ Error: Traefik network config '$TRAEFIK_NETWORKS_CONFIG_PATH' not found!"; exit 1; fi
if [ ! -f "$TRAEFIK_VOLUMES_CONFIG_PATH" ]; then echo "❌ Error: Traefik volume config '$TRAEFIK_VOLUMES_CONFIG_PATH' not found!"; exit 1; fi


echo "# Setting up Traefik networks..."
NETWORKS=$(awk '/name:/ {print $2}' "$TRAEFIK_NETWORKS_CONFIG_PATH")

for NETWORK in $NETWORKS; do
    if ! docker network inspect "$NETWORK" &>/dev/null; then
        echo "--> Creating network: $NETWORK"
        docker network create "$NETWORK"
    else
        echo "--> Network already exists: $NETWORK"
    fi
done
echo "✅ Traefik networks are ready."
echo


echo "# Setting up Traefik volumes..."
VOLUMES=$(awk '/name:/ {print $2}' "$TRAEFIK_VOLUMES_CONFIG_PATH")

for VOLUME in $VOLUMES; do
    if ! docker volume inspect "$VOLUME" &>/dev/null; then
        echo "--> Creating volume: $VOLUME"
        docker volume create "$VOLUME"
    else
        echo "--> Volume already exists: $VOLUME"
    fi
done
echo "✅ Traefik volumes are ready."
echo


echo "# Deploying '$GLOBAL_STACK_NAME' stack with Traefik..."
docker compose \
    -p "$GLOBAL_STACK_NAME" \
    -f "$TRAEFIK_COMPOSE_FILE" \
    -f "$TRAEFIK_NETWORKS_CONFIG_PATH" \
    -f "$TRAEFIK_VOLUMES_CONFIG_PATH" \
    up -d

if [ $? -eq 0 ]; then
    echo "✅ Global stack deployed successfully."
else
    echo "❌ Error: Failed to deploy the '$GLOBAL_STACK_NAME' stack."
    exit 1
fi


echo
echo "✨ Global Services Deployment Finished! ✨"
