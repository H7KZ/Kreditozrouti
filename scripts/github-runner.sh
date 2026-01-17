#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script Name: github-runner.sh
# Description: Deploys self-hosted GitHub Actions runners.
#
# Usage:       ./github-runner.sh --path <deployment_path> [OPTIONS]
#
# Options:
#   -p, --path <path>       Path to deployment directory (required)
#   -r, --repo <url>        GitHub repository URL (required)
#   -t, --token <token>     GitHub Personal Access Token (required)
#   -n, --replicas <num>    Number of runner instances (default: 2)
#   -l, --labels <list>     Additional labels (comma-separated)
#   --project <name>        Project name prefix (default: github)
#   -h, --help              Show help message
#
# Environment Variables (alternative to flags):
#   DEPLOYMENT_PATH         Path to deployment directory
#   GITHUB_REPO_URL         Repository URL
#   GITHUB_ACCESS_TOKEN     Personal Access Token
#   PROJECT                 Project name prefix
#   RUNNER_REPLICAS         Number of runners
#   RUNNER_LABELS           Additional labels
#
# Example:
#   ./github-runner.sh -p ~/deployment -r https://github.com/owner/repo -t ghp_xxx
# ==============================================================================

# ------------------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------------------

readonly SCRIPT_NAME="$(basename "$0")"
readonly STACK_NAME="github-runner"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# ------------------------------------------------------------------------------
# Functions
# ------------------------------------------------------------------------------

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%dT%H:%M:%S%z')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%dT%H:%M:%S%z')]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%dT%H:%M:%S%z')]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%dT%H:%M:%S%z')]${NC} $1" >&2
}

usage() {
    cat << EOF
Usage: $SCRIPT_NAME --path <deployment_path> [OPTIONS]

Required:
    -p, --path <path>       Path to deployment directory
    -r, --repo <url>        GitHub repository URL
    -t, --token <token>     GitHub Personal Access Token (with repo scope)

Optional:
    -n, --replicas <num>    Number of runner instances (default: 2)
    -l, --labels <list>     Additional labels (comma-separated)
    --project <name>        Project name prefix (default: github)
    -h, --help              Show this help message

Environment Variables:
    DEPLOYMENT_PATH         Path to deployment directory
    GITHUB_REPO_URL         Repository URL
    GITHUB_ACCESS_TOKEN     Personal Access Token
    PROJECT                 Project name prefix
    RUNNER_REPLICAS         Number of runners
    RUNNER_LABELS           Additional labels

Examples:
    $SCRIPT_NAME -p ~/deployment -r https://github.com/owner/repo -t ghp_xxxx
    $SCRIPT_NAME --path /opt/app/deployment --repo https://github.com/owner/repo --token ghp_xxxx --replicas 4

Expected directory structure:
    <deployment_path>/
    ├── github-runner/
    │   └── docker-compose.github-runner.yml
    └── traefik/
        └── networks.yml
EOF
    exit 1
}

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

    if ! [[ "$value" =~ ^[0-9]+$ ]]; then
        log_error "$name must be a positive integer: $value"
        exit 1
    fi

    if [[ "$value" -lt 1 ]]; then
        log_error "$name must be at least 1: $value"
        exit 1
    fi
}

validate_files() {
    local files=("$@")
    local missing=()

    for file in "${files[@]}"; do
        [[ ! -f "$file" ]] && missing+=("$file")
    done

    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "Missing configuration files:"
        for file in "${missing[@]}"; do
            log_error "  - $file"
        done
        exit 1
    fi
}

# ------------------------------------------------------------------------------
# Main
# ------------------------------------------------------------------------------

main() {
    # Default values from environment
    local deployment_path="${DEPLOYMENT_PATH:-}"
    local repo_url="${GITHUB_REPO_URL:-}"
    local access_token="${GITHUB_ACCESS_TOKEN:-}"
    local project="${PROJECT:-github}"
    local replicas="${RUNNER_REPLICAS:-2}"
    local extra_labels="${RUNNER_LABELS:-}"

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -p|--path)
                deployment_path="$2"
                shift 2
                ;;
            -r|--repo)
                repo_url="$2"
                shift 2
                ;;
            -t|--token)
                access_token="$2"
                shift 2
                ;;
            --project)
                project="$2"
                shift 2
                ;;
            -n|--replicas)
                replicas="$2"
                shift 2
                ;;
            -l|--labels)
                extra_labels="$2"
                shift 2
                ;;
            -h|--help)
                usage
                ;;
            *)
                log_error "Unknown parameter: $1"
                usage
                ;;
        esac
    done

    log "=========================================="
    log "GitHub Actions Runner Deployment"
    log "=========================================="

    # Validate required parameters
    if [[ -z "$deployment_path" ]]; then
        log_error "Deployment path is not set."
        log_error "Use --path flag or set DEPLOYMENT_PATH environment variable."
        exit 1
    fi

    if [[ -z "$repo_url" ]]; then
        log_error "Repository URL is required."
        log_error "Use --repo flag or set GITHUB_REPO_URL environment variable."
        exit 1
    fi

    if [[ -z "$access_token" ]]; then
        log_error "Access token is required."
        log_error "Use --token flag or set GITHUB_ACCESS_TOKEN environment variable."
        exit 1
    fi

    # Resolve deployment path to absolute path
    if [[ -d "$deployment_path" ]]; then
        deployment_path=$(cd "$deployment_path" && pwd)
    else
        log_error "Deployment directory not found: $deployment_path"
        exit 1
    fi

    # Validate inputs
    validate_url "$repo_url"
    validate_number "$replicas" "Replicas"

    # Build labels
    local labels="docker,self-hosted"
    if [[ -n "$extra_labels" ]]; then
        labels="$labels,$extra_labels"
    fi

    # Export environment variables
    export GITHUB_REPO_URL="$repo_url"
    export GITHUB_ACCESS_TOKEN="$access_token"
    export PROJECT="$project"
    export RUNNER_REPLICAS="$replicas"
    export RUNNER_LABELS="$labels"

    log "Path:       $deployment_path"
    log "Repository: $GITHUB_REPO_URL"
    log "Project:    $PROJECT"
    log "Replicas:   $RUNNER_REPLICAS"
    log "Labels:     $RUNNER_LABELS"
    log "=========================================="

    # Define paths
    local runner_dir="$deployment_path/github-runner"
    local compose_file="$runner_dir/docker-compose.github-runner.yml"
    local networks_config="$deployment_path/traefik/networks.yml"

    # Validate configuration files
    validate_files "$compose_file" "$networks_config"

    # Ensure traefik network exists
    if ! docker network inspect "traefik-network" &>/dev/null; then
        log "Creating network: traefik-network"
        docker network create "traefik-network"
    fi

    # Deploy runners
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

main "$@"
