#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script Name: rollback.sh
# Description: Switches the current deployment to a previously saved version.
#              Loads registry credentials automatically if available.
#
# Usage:       ./rollback.sh <environment> [version] [options]
#
# Arguments:
#   environment    Environment name (production, development)
#   version        Tag to rollback to (e.g., v1.0.0, dev-1.0.0)
#
# Options:
#   -l, --list     List available versions for the environment
#   -c, --current  Show current active version
#   -f, --force    Skip confirmation prompt
#   -h, --help     Show help message
#
# Directory Structure:
#   ~/versions/<environment>/
#   ├── <version>/          # Version-specific deployment files
#   │   ├── deploy.sh
#   │   ├── .registry       # Saved registry credentials
#   │   └── <environment>/
#   │       └── .env
#   └── current             # Symlink to active version
# ==============================================================================

# ------------------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------------------

readonly SCRIPT_NAME="$(basename "$0")"
readonly VERSIONS_BASE_DIR="$HOME/versions"
readonly VARIABLES_DIR="$HOME/variables"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
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
Usage: $SCRIPT_NAME <environment> [version] [options]

Arguments:
    environment    Environment name (production, development)
    version        Tag to rollback to (e.g., v1.0.0, dev-1.0.0)

Options:
    -l, --list     List available versions
    -c, --current  Show current version
    -f, --force    Skip confirmation prompt
    -h, --help     Show this help message

Examples:
    $SCRIPT_NAME production v1.2.3
    $SCRIPT_NAME development dev-1.0.0
    $SCRIPT_NAME production --list
    $SCRIPT_NAME development --current
EOF
    exit 1
}

validate_environment() {
    local env="$1"

    if [[ "$env" != "production" && "$env" != "development" ]]; then
        log_error "Invalid environment: $env"
        log_error "Must be 'production' or 'development'"
        exit 1
    fi
}

get_project_name() {
    local env="$1"

    case "$env" in
        production)  echo "prod" ;;
        development) echo "dev" ;;
        *)           echo "$env" ;;
    esac
}

list_versions() {
    local env="$1"
    local versions_dir="$VERSIONS_BASE_DIR/$env"

    if [[ ! -d "$versions_dir" ]]; then
        log_error "No versions found for environment: $env"
        exit 1
    fi

    local current_path
    current_path=$(readlink -f "$versions_dir/current" 2>/dev/null || echo "")

    echo ""
    echo -e "${CYAN}Available versions for $env:${NC}"
    echo ""

    find "$versions_dir" -maxdepth 1 -mindepth 1 -type d | sort -V | while read -r dir; do
        local version
        version=$(basename "$dir")

        # Skip the current symlink
        [[ "$version" == "current" ]] && continue

        local marker=" "
        local info=""

        # Mark current version
        [[ "$dir" == "$current_path" ]] && marker="*"

        # Check for saved credentials
        [[ -f "$dir/.registry" ]] && info="${GREEN}[credentials saved]${NC}"

        # Check for deploy script
        [[ ! -f "$dir/deploy.sh" ]] && info="${YELLOW}[missing deploy.sh]${NC}"

        echo -e "  $marker $version $info"
    done

    echo ""
    echo "  (* = current version)"
    echo ""
}

show_current() {
    local env="$1"
    local current_link="$VERSIONS_BASE_DIR/$env/current"

    if [[ -L "$current_link" ]]; then
        local current_version
        current_version=$(basename "$(readlink -f "$current_link")")
        log_success "Current $env version: $current_version"
    else
        log_warning "No current version set for $env"
    fi
}

confirm_rollback() {
    local env="$1"
    local version="$2"

    echo ""
    log_warning "You are about to rollback $env to version: $version"
    echo ""
    read -rp "Continue? [y/N] " response

    case "$response" in
        [yY][eE][sS]|[yY])
            return 0
            ;;
        *)
            log "Rollback cancelled."
            exit 0
            ;;
    esac
}

# ------------------------------------------------------------------------------
# Main
# ------------------------------------------------------------------------------

main() {
    local environment=""
    local version=""
    local force=false
    local action=""

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -l|--list)
                action="list"
                shift
                ;;
            -c|--current)
                action="current"
                shift
                ;;
            -f|--force)
                force=true
                shift
                ;;
            -h|--help)
                usage
                ;;
            -*)
                log_error "Unknown option: $1"
                usage
                ;;
            *)
                if [[ -z "$environment" ]]; then
                    environment="$1"
                elif [[ -z "$version" ]]; then
                    version="$1"
                else
                    log_error "Unexpected argument: $1"
                    usage
                fi
                shift
                ;;
        esac
    done

    # Validate environment is provided
    if [[ -z "$environment" ]]; then
        log_error "Environment not specified."
        usage
    fi

    validate_environment "$environment"

    # Handle list/current actions
    case "$action" in
        list)
            list_versions "$environment"
            exit 0
            ;;
        current)
            show_current "$environment"
            exit 0
            ;;
    esac

    # For rollback, version is required
    if [[ -z "$version" ]]; then
        log_error "Version not specified."
        usage
    fi

    # Configuration
    local version_dir="$VERSIONS_BASE_DIR/$environment/$version"
    local current_link="$VERSIONS_BASE_DIR/$environment/current"
    local registry_file="$version_dir/.registry"
    local project_name
    project_name=$(get_project_name "$environment")

    log "=========================================="
    log "Rollback Initiated"
    log "=========================================="
    log "Environment: $environment"
    log "Version:     $version"
    log "Project:     $project_name"
    log "=========================================="

    # Validate version directory exists
    if [[ ! -d "$version_dir" ]]; then
        log_error "Version directory not found: $version_dir"
        list_versions "$environment"
        exit 1
    fi

    # Validate deploy script exists
    if [[ ! -f "$version_dir/deploy.sh" ]]; then
        log_error "deploy.sh not found in version directory"
        exit 1
    fi

    # Confirm rollback (unless forced)
    if [[ "$force" != true ]]; then
        confirm_rollback "$environment" "$version"
    fi

    # Ensure .env file exists
    local env_file="$version_dir/$environment/.env"
    if [[ ! -f "$env_file" ]]; then
        log_warning ".env file not found, attempting to copy from variables directory..."

        local source_env=""
        case "$environment" in
            production)  source_env="$VARIABLES_DIR/.env.prod" ;;
            development) source_env="$VARIABLES_DIR/.env.dev" ;;
        esac

        if [[ -f "$source_env" ]]; then
            mkdir -p "$version_dir/$environment"
            cp "$source_env" "$env_file"
            log_success "Copied environment file from $source_env"
        else
            log_error "Could not find environment file source: $source_env"
            exit 1
        fi
    fi

    # Load registry credentials
    if [[ -f "$registry_file" ]]; then
        log "Loading saved registry credentials..."
        # shellcheck source=/dev/null
        source "$registry_file"

        export IMAGE_REGISTRY
        export IMAGE_PREFIX
        export IMAGE_TAG

        # Login to registry if credentials available
        if [[ -n "${GITHUB_TOKEN:-}" && -n "${GHCR_USER:-}" ]]; then
            log "Authenticating with container registry..."
            echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
        fi
    else
        log_warning "No saved registry credentials found."
        log "Using manual environment variables..."

        # Default IMAGE_TAG to version if not set
        export IMAGE_TAG="${IMAGE_TAG:-$version}"

        if [[ -z "${IMAGE_REGISTRY:-}" || -z "${IMAGE_PREFIX:-}" ]]; then
            log_error "IMAGE_REGISTRY and IMAGE_PREFIX must be set manually."
            log_error "Export these variables or ensure .registry file exists."
            exit 1
        fi
    fi

    # Execute deployment
    log "Executing deployment script..."
    cd "$version_dir"
    bash ./deploy.sh "$project_name" "$environment"

    # Update current symlink
    log "Updating current symlink..."
    ln -sfn "$version_dir" "$current_link"

    log_success "=========================================="
    log_success "Rollback Complete"
    log_success "=========================================="
    log "Active version: $(basename "$(readlink -f "$current_link")")"
}

main "$@"
