#!/bin/bash
set -euo pipefail

# ==============================================================================
# Script Name: github-runner.sh
# Description: Deploys self-hosted GitHub Actions runners.
#
# Usage:       ./github-runner.sh [OPTIONS]
# Options:
#   -r, --repo <url>        GitHub repo URL
#   -t, --token <token>     GitHub PAT
#   -p, --project <name>    Project name prefix (default: github)
#   -e, --env <label>       Environment label (default: self-hosted)
#   -n, --replicas <num>    Number of runners (default: 2)
#   -l, --labels <list>     Extra labels (comma-separated)
# ==============================================================================

RUNNER_STACK_NAME="github-runner"

log() {
    echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] $1"
}

usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "Required:"
    echo "  -r, --repo <url>      GitHub repository URL"
    echo "  -t, --token <token>   GitHub Personal Access Token"
    echo "Optional:"
    echo "  -p, --project <name>  Project name (default: github)"
    echo "  -e, --env <name>      Environment label (default: self-hosted)"
    echo "  -n, --replicas <num>  Count (default: 2)"
    echo "  -l, --labels <str>    Additional labels"
    echo "  -h, --help            Show help"
    exit 1
}

# Defaults
PROJECT="${PROJECT:-github}"
ENV="${ENV:-self-hosted}"
RUNNER_REPLICAS="${RUNNER_REPLICAS:-2}"
RUNNER_LABELS="${RUNNER_LABELS:-}"
GITHUB_REPO_URL="${GITHUB_REPO_URL:-}"
GITHUB_ACCESS_TOKEN="${GITHUB_ACCESS_TOKEN:-}"

# Parse Arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -r|--repo) GITHUB_REPO_URL="$2"; shift ;;
        -t|--token) GITHUB_ACCESS_TOKEN="$2"; shift ;;
        -p|--project) PROJECT="$2"; shift ;;
        -e|--env) ENV="$2"; shift ;;
        -n|--replicas) RUNNER_REPLICAS="$2"; shift ;;
        -l|--labels) RUNNER_LABELS="$2"; shift ;;
        -h|--help) usage ;;
        *) echo "Unknown parameter: $1"; usage ;;
    esac
    shift
done

log "Deploying GitHub Actions Runner"

# Validation
if [ -z "$GITHUB_REPO_URL" ]; then echo "Error: Missing Repository URL (-r)"; exit 1; fi
if [ -z "$GITHUB_ACCESS_TOKEN" ]; then echo "Error: Missing Access Token (-t)"; exit 1; fi
if ! [[ "$RUNNER_REPLICAS" =~ ^[0-9]+$ ]]; then echo "Error: Replicas must be a number"; exit 1; fi

# Configure Labels
COMBINED_LABELS="docker,${ENV}"
if [ -n "$RUNNER_LABELS" ]; then
    COMBINED_LABELS="${COMBINED_LABELS},${RUNNER_LABELS}"
fi

export GITHUB_REPO_URL
export GITHUB_ACCESS_TOKEN
export PROJECT
export ENV
export RUNNER_REPLICAS
export RUNNER_LABELS="$COMBINED_LABELS"

log "Config: Repo=$GITHUB_REPO_URL, Replicas=$RUNNER_REPLICAS, Labels=$COMBINED_LABELS"

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNNER_COMPOSE_FILE="$SCRIPT_DIR/github-runner/docker-compose.github-runner.yml"
TRAEFIK_NETWORKS_CONFIG="$SCRIPT_DIR/traefik/networks.yml"

# File Checks
for FILE in "$RUNNER_COMPOSE_FILE" "$TRAEFIK_NETWORKS_CONFIG"; do
    if [ ! -f "$FILE" ]; then
        echo "Error: Config file not found: $FILE"
        exit 1
    fi
done

# Deployment
log "Deploying GitHub Runners..."
docker compose \
    -p "$RUNNER_STACK_NAME" \
    -f "$RUNNER_COMPOSE_FILE" \
    -f "$TRAEFIK_NETWORKS_CONFIG" \
    up -d --scale runner="$RUNNER_REPLICAS"

log "Runner deployment finished."
