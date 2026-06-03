#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script Name: deploy.sh
# Description: Deploys self-hosted GitHub Actions runners.
#              Configuration via environment variables.
#
# Usage:       bash ./deploy.sh
#
# Required variables (set as environment variables):
#   GITHUB_REPO_URL       Repository URL (https://github.com/owner/repo)
#   GITHUB_ACCESS_TOKEN   Personal Access Token (repo scope)
#
# Optional:
#   RUNNER_REPLICAS       Number of runner instances (default: 2)
#   RUNNER_LABELS         Additional labels, comma-separated
# ==============================================================================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_NAME="$(basename "$0")"
readonly STACK_NAME="global"

source "$(cd "$SCRIPT_DIR/.." && pwd)/lib.sh"

validate_url() {
    local url="$1"
    if [[ ! "$url" =~ ^https://github\.com/[^/]+/[^/]+$ ]]; then
        log_error "Invalid GitHub repository URL: $url"
        log_error "Expected format: https://github.com/owner/repo"
        exit 1
    fi
}

validate_number() {
    local value="$1"
    local name="$2"
    if ! [[ "$value" =~ ^[0-9]+$ ]] || [[ "$value" -lt 1 ]]; then
        log_error "$name must be a positive integer: $value"
        exit 1
    fi
}

main() {
    [[ -z "${GITHUB_REPO_URL:-}" ]]     && { log_error "GITHUB_REPO_URL not set";     exit 1; }
    [[ -z "${GITHUB_ACCESS_TOKEN:-}" ]] && { log_error "GITHUB_ACCESS_TOKEN not set"; exit 1; }

    validate_url "$GITHUB_REPO_URL"

    local replicas="${RUNNER_REPLICAS:-2}"
    validate_number "$replicas" "RUNNER_REPLICAS"

    local labels="docker,self-hosted"
    [[ -n "${RUNNER_LABELS:-}" ]] && labels="$labels,${RUNNER_LABELS}"

    export GITHUB_REPO_URL
    export GITHUB_ACCESS_TOKEN
    export PROJECT="$STACK_NAME"
    export RUNNER_REPLICAS="$replicas"
    export RUNNER_LABELS="$labels"

    local compose_file="$SCRIPT_DIR/docker-compose.github-runner.yml"
    local networks_config="$(cd "$SCRIPT_DIR/.." && pwd)/traefik/networks.yml"

    log "=========================================="
    log "GitHub Actions Runner Deployment"
    log "=========================================="
    log "Repository: $GITHUB_REPO_URL"
    log "Project:    $PROJECT"
    log "Replicas:   $RUNNER_REPLICAS"
    log "Labels:     $RUNNER_LABELS"
    log "=========================================="

    validate_files "$compose_file" "$networks_config"

    if ! docker network inspect "traefik-network" &>/dev/null; then
        log "Creating network: traefik-network"
        docker network create "traefik-network"
    fi

    log "Deploying GitHub runners..."
    docker compose \
        -p "$STACK_NAME" \
        -f "$compose_file" \
        -f "$networks_config" \
        up -d --scale runner="$replicas"

    log_success "=========================================="
    log_success "Runner Deployment Complete"
    log_success "=========================================="
    log "Runners: $replicas instance(s)"
    log "Status:  docker compose -p $STACK_NAME ps"
    log "Logs:    docker compose -p $STACK_NAME logs -f"
}

main
