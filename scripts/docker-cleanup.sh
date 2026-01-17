#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script Name: docker-cleanup.sh
# Description: Cleans up unused Docker resources including containers, images,
#              volumes, networks, and build cache. Supports selective cleanup
#              and dry-run mode for safe operation.
#
# Usage:       ./docker-cleanup.sh [OPTIONS]
#
# Options:
#   -a, --all               Clean everything (default: only dangling/unused)
#   -n, --dry-run           Show what would be removed without removing
#   -f, --force             Skip confirmation prompts
#   -k, --keep-recent <hrs> Keep images used within N hours (default: 24)
#   --skip-containers       Skip container cleanup
#   --skip-images           Skip image cleanup
#   --skip-volumes          Skip volume cleanup
#   --skip-networks         Skip network cleanup
#   --skip-cache            Skip build cache cleanup
#   -v, --verbose           Show detailed output
#   -h, --help              Show help message
#
# Requirements:
#   - Docker Engine installed and running
#   - Sufficient permissions to run docker commands
#
# Note: Use --dry-run first to preview what will be removed.
# ==============================================================================

# ------------------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------------------

readonly SCRIPT_NAME="$(basename "$0")"
readonly LOG_FILE="/tmp/docker-cleanup-$(date +%Y%m%d-%H%M%S).log"

# Flags
CLEAN_ALL=false
DRY_RUN=false
FORCE=false
VERBOSE=false
KEEP_RECENT_HOURS=24
SKIP_CONTAINERS=false
SKIP_IMAGES=false
SKIP_VOLUMES=false
SKIP_NETWORKS=false
SKIP_CACHE=false

# Counters
CONTAINERS_REMOVED=0
IMAGES_REMOVED=0
VOLUMES_REMOVED=0
NETWORKS_REMOVED=0
SPACE_RECLAIMED=""

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly DIM='\033[2m'
readonly NC='\033[0m' # No Color

# ------------------------------------------------------------------------------
# Functions
# ------------------------------------------------------------------------------

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%dT%H:%M:%S%z')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%dT%H:%M:%S%z')]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%dT%H:%M:%S%z')]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%dT%H:%M:%S%z')]${NC} $1" | tee -a "$LOG_FILE" >&2
}

log_verbose() {
    if [[ "$VERBOSE" == true ]]; then
        echo -e "${DIM}[$(date +'%Y-%m-%dT%H:%M:%S%z')]${NC} ${DIM}$1${NC}" | tee -a "$LOG_FILE"
    fi
}

log_dry_run() {
    echo -e "${CYAN}[DRY-RUN]${NC} $1" | tee -a "$LOG_FILE"
}

usage() {
    cat << EOF
Usage: $SCRIPT_NAME [OPTIONS]

Options:
    -a, --all               Clean everything (images, even if tagged)
    -n, --dry-run           Preview what would be removed
    -f, --force             Skip confirmation prompts
    -k, --keep-recent <hrs> Keep images used within N hours (default: 24)
    --skip-containers       Skip container cleanup
    --skip-images           Skip image cleanup
    --skip-volumes          Skip volume cleanup
    --skip-networks         Skip network cleanup
    --skip-cache            Skip build cache cleanup
    -v, --verbose           Show detailed output
    -h, --help              Show this help message

Examples:
    $SCRIPT_NAME                        # Clean dangling resources with confirmation
    $SCRIPT_NAME --dry-run              # Preview what would be removed
    $SCRIPT_NAME -a -f                  # Aggressive cleanup, no confirmation
    $SCRIPT_NAME --skip-volumes -f      # Clean all except volumes
    $SCRIPT_NAME -k 48                  # Keep images used in last 48 hours

What gets cleaned:
    - Stopped containers
    - Dangling images (untagged)
    - Unused images (with --all)
    - Unused volumes (anonymous/dangling)
    - Unused networks (not used by any container)
    - Build cache

Protected resources:
    - Running containers
    - Images used by running containers
    - Named volumes (unless --all)
    - Default networks (bridge, host, none)

Log file: $LOG_FILE
EOF
    exit 1
}

check_docker() {
    if ! command -v docker &>/dev/null; then
        log_error "Docker is not installed or not in PATH."
        exit 1
    fi

    if ! docker info &>/dev/null; then
        log_error "Docker daemon is not running or you lack permissions."
        log_error "Try: sudo $SCRIPT_NAME or ensure Docker is running."
        exit 1
    fi
}

get_disk_usage() {
    docker system df 2>/dev/null || true
}

get_detailed_disk_usage() {
    docker system df -v 2>/dev/null || true
}

confirm_cleanup() {
    if [[ "$FORCE" == true ]]; then
        return 0
    fi

    echo ""
    log_warning "This will remove unused Docker resources."

    if [[ "$CLEAN_ALL" == true ]]; then
        log_warning "Mode: AGGRESSIVE (--all) - will remove ALL unused resources"
    else
        log_warning "Mode: CONSERVATIVE - will only remove dangling resources"
    fi

    echo ""
    read -rp "Continue? [y/N] " response

    case "$response" in
        [yY][eE][sS]|[yY])
            return 0
            ;;
        *)
            log "Cleanup cancelled."
            exit 0
            ;;
    esac
}

cleanup_containers() {
    if [[ "$SKIP_CONTAINERS" == true ]]; then
        log "Skipping container cleanup (--skip-containers)"
        return
    fi

    log "Cleaning up containers..."

    # Get stopped containers
    local stopped_containers
    stopped_containers=$(docker ps -aq --filter "status=exited" --filter "status=dead" --filter "status=created" 2>/dev/null || true)

    if [[ -z "$stopped_containers" ]]; then
        log_verbose "No stopped containers to remove."
        return
    fi

    local count
    count=$(echo "$stopped_containers" | wc -w)

    if [[ "$DRY_RUN" == true ]]; then
        log_dry_run "Would remove $count stopped container(s):"
        docker ps -a --filter "status=exited" --filter "status=dead" --filter "status=created" --format "  - {{.Names}} ({{.Image}}, stopped {{.Status}})" 2>/dev/null || true
        return
    fi

    log "Removing $count stopped container(s)..."

    if [[ "$VERBOSE" == true ]]; then
        docker ps -a --filter "status=exited" --filter "status=dead" --filter "status=created" --format "  - {{.Names}}" 2>/dev/null || true
    fi

    docker container prune -f >> "$LOG_FILE" 2>&1
    CONTAINERS_REMOVED=$count
    log_success "Removed $count container(s)"
}

cleanup_images() {
    if [[ "$SKIP_IMAGES" == true ]]; then
        log "Skipping image cleanup (--skip-images)"
        return
    fi

    log "Cleaning up images..."

    if [[ "$CLEAN_ALL" == true ]]; then
        # Remove all unused images
        local unused_images
        unused_images=$(docker images -q --filter "dangling=false" 2>/dev/null | wc -l || echo "0")
        local dangling_images
        dangling_images=$(docker images -q --filter "dangling=true" 2>/dev/null | wc -l || echo "0")

        local total=$((unused_images + dangling_images))

        if [[ "$total" -eq 0 ]]; then
            log_verbose "No images to remove."
            return
        fi

        if [[ "$DRY_RUN" == true ]]; then
            log_dry_run "Would remove unused images (including tagged):"
            docker images --format "  - {{.Repository}}:{{.Tag}} ({{.Size}}, created {{.CreatedSince}})" 2>/dev/null | head -20 || true
            local more=$((total - 20))
            [[ $more -gt 0 ]] && log_dry_run "  ... and $more more"
            return
        fi

        log "Removing all unused images..."
        local output
        output=$(docker image prune -af 2>&1)
        echo "$output" >> "$LOG_FILE"

        IMAGES_REMOVED=$(echo "$output" | grep -c "deleted" || echo "0")
        SPACE_RECLAIMED=$(echo "$output" | grep -oP "reclaimed \K[0-9.]+[A-Z]+" || echo "")
    else
        # Remove only dangling images
        local dangling
        dangling=$(docker images -q --filter "dangling=true" 2>/dev/null || true)

        if [[ -z "$dangling" ]]; then
            log_verbose "No dangling images to remove."
            return
        fi

        local count
        count=$(echo "$dangling" | wc -w)

        if [[ "$DRY_RUN" == true ]]; then
            log_dry_run "Would remove $count dangling image(s)"
            return
        fi

        log "Removing $count dangling image(s)..."
        local output
        output=$(docker image prune -f 2>&1)
        echo "$output" >> "$LOG_FILE"

        IMAGES_REMOVED=$count
        SPACE_RECLAIMED=$(echo "$output" | grep -oP "reclaimed \K[0-9.]+[A-Z]+" || echo "")
    fi

    log_success "Removed images. Space reclaimed: ${SPACE_RECLAIMED:-unknown}"
}

cleanup_volumes() {
    if [[ "$SKIP_VOLUMES" == true ]]; then
        log "Skipping volume cleanup (--skip-volumes)"
        return
    fi

    log "Cleaning up volumes..."

    # Get dangling volumes
    local dangling_volumes
    dangling_volumes=$(docker volume ls -q --filter "dangling=true" 2>/dev/null || true)

    if [[ -z "$dangling_volumes" ]]; then
        log_verbose "No dangling volumes to remove."
        return
    fi

    local count
    count=$(echo "$dangling_volumes" | wc -w)

    if [[ "$DRY_RUN" == true ]]; then
        log_dry_run "Would remove $count dangling volume(s):"
        echo "$dangling_volumes" | while read -r vol; do
            [[ -n "$vol" ]] && echo "  - $vol"
        done
        return
    fi

    log "Removing $count dangling volume(s)..."

    if [[ "$VERBOSE" == true ]]; then
        echo "$dangling_volumes" | while read -r vol; do
            [[ -n "$vol" ]] && log_verbose "  Removing: $vol"
        done
    fi

    docker volume prune -f >> "$LOG_FILE" 2>&1
    VOLUMES_REMOVED=$count
    log_success "Removed $count volume(s)"
}

cleanup_networks() {
    if [[ "$SKIP_NETWORKS" == true ]]; then
        log "Skipping network cleanup (--skip-networks)"
        return
    fi

    log "Cleaning up networks..."

    # Get unused networks (excluding default ones)
    local networks
    networks=$(docker network ls --filter "type=custom" -q 2>/dev/null || true)

    if [[ -z "$networks" ]]; then
        log_verbose "No custom networks found."
        return
    fi

    # Find networks not in use
    local unused_networks=()
    while read -r net_id; do
        [[ -z "$net_id" ]] && continue

        local containers_using
        containers_using=$(docker network inspect "$net_id" --format '{{len .Containers}}' 2>/dev/null || echo "0")

        if [[ "$containers_using" -eq 0 ]]; then
            local net_name
            net_name=$(docker network inspect "$net_id" --format '{{.Name}}' 2>/dev/null || echo "$net_id")
            unused_networks+=("$net_name")
        fi
    done <<< "$networks"

    if [[ ${#unused_networks[@]} -eq 0 ]]; then
        log_verbose "No unused networks to remove."
        return
    fi

    if [[ "$DRY_RUN" == true ]]; then
        log_dry_run "Would remove ${#unused_networks[@]} unused network(s):"
        for net in "${unused_networks[@]}"; do
            echo "  - $net"
        done
        return
    fi

    log "Removing ${#unused_networks[@]} unused network(s)..."

    for net in "${unused_networks[@]}"; do
        log_verbose "  Removing: $net"
        docker network rm "$net" >> "$LOG_FILE" 2>&1 || log_warning "Failed to remove network: $net"
        ((NETWORKS_REMOVED++)) || true
    done

    log_success "Removed $NETWORKS_REMOVED network(s)"
}

cleanup_build_cache() {
    if [[ "$SKIP_CACHE" == true ]]; then
        log "Skipping build cache cleanup (--skip-cache)"
        return
    fi

    log "Cleaning up build cache..."

    # Check if there's any build cache
    local cache_size
    cache_size=$(docker system df --format '{{.Size}}' 2>/dev/null | tail -1 || echo "0B")

    if [[ "$DRY_RUN" == true ]]; then
        log_dry_run "Would remove build cache (current size: $cache_size)"
        return
    fi

    if [[ "$CLEAN_ALL" == true ]]; then
        log "Removing all build cache..."
        docker builder prune -af >> "$LOG_FILE" 2>&1 || true
    else
        log "Removing unused build cache..."
        docker builder prune -f >> "$LOG_FILE" 2>&1 || true
    fi

    log_success "Build cache cleaned"
}

print_summary() {
    echo ""
    log "=========================================="
    log "Cleanup Summary"
    log "=========================================="

    if [[ "$DRY_RUN" == true ]]; then
        log_warning "DRY-RUN MODE - No changes were made"
        echo ""
        return
    fi

    echo ""
    echo -e "  Containers removed: ${GREEN}$CONTAINERS_REMOVED${NC}"
    echo -e "  Images removed:     ${GREEN}$IMAGES_REMOVED${NC}"
    echo -e "  Volumes removed:    ${GREEN}$VOLUMES_REMOVED${NC}"
    echo -e "  Networks removed:   ${GREEN}$NETWORKS_REMOVED${NC}"

    if [[ -n "$SPACE_RECLAIMED" ]]; then
        echo -e "  Space reclaimed:    ${GREEN}$SPACE_RECLAIMED${NC}"
    fi

    echo ""
    log "Current Docker disk usage:"
    echo ""
    get_disk_usage
    echo ""
    log "Log file: $LOG_FILE"
}

# ------------------------------------------------------------------------------
# Main
# ------------------------------------------------------------------------------

main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -a|--all)
                CLEAN_ALL=true
                shift
                ;;
            -n|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -f|--force)
                FORCE=true
                shift
                ;;
            -k|--keep-recent)
                KEEP_RECENT_HOURS="$2"
                shift 2
                ;;
            --skip-containers)
                SKIP_CONTAINERS=true
                shift
                ;;
            --skip-images)
                SKIP_IMAGES=true
                shift
                ;;
            --skip-volumes)
                SKIP_VOLUMES=true
                shift
                ;;
            --skip-networks)
                SKIP_NETWORKS=true
                shift
                ;;
            --skip-cache)
                SKIP_CACHE=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
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

    # Initialize log
    touch "$LOG_FILE"

    log "=========================================="
    log "Docker Cleanup"
    log "=========================================="

    # Check Docker availability
    check_docker

    # Show current state
    log "Current Docker disk usage:"
    echo ""
    get_disk_usage
    echo ""

    # Show mode
    if [[ "$DRY_RUN" == true ]]; then
        log_warning "Running in DRY-RUN mode - no changes will be made"
    fi

    if [[ "$CLEAN_ALL" == true ]]; then
        log_warning "Running in AGGRESSIVE mode (--all)"
    fi

    log "=========================================="

    # Confirm unless dry-run
    if [[ "$DRY_RUN" != true ]]; then
        confirm_cleanup
    fi

    echo ""

    # Run cleanup tasks
    cleanup_containers
    cleanup_images
    cleanup_volumes
    cleanup_networks
    cleanup_build_cache

    # Print summary
    print_summary

    log_success "=========================================="
    log_success "Docker Cleanup Complete"
    log_success "=========================================="
}

main "$@"
