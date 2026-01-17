#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script Name: maintenance.sh
# Description: Performs system maintenance including package updates, cleanup,
#              security checks, and health monitoring.
#
# Usage:       sudo ./maintenance.sh [OPTIONS]
#
# Options:
#   -r, --auto-reboot       Automatically reboot if required
#   -s, --skip-security     Skip security audit (Lynis)
#   -d, --docker-cleanup    Also clean up Docker resources
#   -q, --quiet             Minimal output
#   -h, --help              Show help message
#
# Requirements:
#   - Must be run as root (sudo)
#   - Ubuntu/Debian based system
#
# Log File: /var/log/system-maintenance.log
# ==============================================================================

# ------------------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------------------

readonly SCRIPT_NAME="$(basename "$0")"
readonly LOG_FILE="/var/log/system-maintenance.log"
readonly JOURNAL_RETENTION="7d"

# Flags
AUTO_REBOOT=false
SKIP_SECURITY=false
DOCKER_CLEANUP=false
QUIET=false

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
    local msg="[$(date +'%Y-%m-%dT%H:%M:%S%z')] $1"
    echo -e "${BLUE}${msg}${NC}" | tee -a "$LOG_FILE"
}

log_success() {
    local msg="[$(date +'%Y-%m-%dT%H:%M:%S%z')] $1"
    echo -e "${GREEN}${msg}${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    local msg="[$(date +'%Y-%m-%dT%H:%M:%S%z')] $1"
    echo -e "${YELLOW}${msg}${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    local msg="[$(date +'%Y-%m-%dT%H:%M:%S%z')] $1"
    echo -e "${RED}${msg}${NC}" | tee -a "$LOG_FILE" >&2
}

log_quiet() {
    local msg="[$(date +'%Y-%m-%dT%H:%M:%S%z')] $1"
    echo "$msg" >> "$LOG_FILE"
    if [[ "$QUIET" != true ]]; then
        echo -e "${BLUE}${msg}${NC}"
    fi
}

usage() {
    cat << EOF
Usage: sudo $SCRIPT_NAME [OPTIONS]

Options:
    -r, --auto-reboot       Automatically reboot if required
    -s, --skip-security     Skip security audit (Lynis)
    -d, --docker-cleanup    Also clean up Docker resources
    -q, --quiet             Minimal output
    -h, --help              Show this help message

Examples:
    sudo $SCRIPT_NAME
    sudo $SCRIPT_NAME --auto-reboot --docker-cleanup
    sudo $SCRIPT_NAME -q -s

Log file: $LOG_FILE
EOF
    exit 1
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root."
        log_error "Use: sudo $SCRIPT_NAME"
        exit 1
    fi
}

update_packages() {
    log "Updating package lists..."
    apt-get update -q

    log "Upgrading installed packages..."
    DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -q

    log "Performing distribution upgrade..."
    DEBIAN_FRONTEND=noninteractive apt-get dist-upgrade -y -q

    log "Removing unused dependencies..."
    apt-get autoremove -y -q

    log "Cleaning APT cache..."
    apt-get clean
}

cleanup_system() {
    log "Cleaning system logs (retention: $JOURNAL_RETENTION)..."
    journalctl --vacuum-time="$JOURNAL_RETENTION"

    # Clean thumbnail cache if exists
    local thumbnail_cache="$HOME/.cache/thumbnails"
    if [[ -d "$thumbnail_cache" ]]; then
        log "Cleaning thumbnail cache..."
        rm -rf "${thumbnail_cache:?}/"* 2>/dev/null || true
    fi

    # Clean temporary files older than 7 days
    log "Cleaning old temporary files..."
    find /tmp -type f -atime +7 -delete 2>/dev/null || true
    find /var/tmp -type f -atime +7 -delete 2>/dev/null || true
}

cleanup_docker() {
    if ! command -v docker &>/dev/null; then
        log_warning "Docker not installed, skipping Docker cleanup."
        return
    fi

    log "Cleaning Docker resources..."

    # Remove stopped containers
    docker container prune -f || true

    # Remove unused images
    docker image prune -af || true

    # Remove unused volumes
    docker volume prune -f || true

    # Remove unused networks
    docker network prune -f || true

    # Remove build cache
    docker builder prune -af || true

    log "Docker disk usage:"
    docker system df | tee -a "$LOG_FILE"
}

security_audit() {
    if [[ "$SKIP_SECURITY" == true ]]; then
        log "Skipping security audit (--skip-security flag set)."
        return
    fi

    log "Running security checks..."

    # Check for security updates
    if command -v unattended-upgrades &>/dev/null; then
        log "Checking for security updates..."
        unattended-upgrades --dry-run -d 2>&1 | grep -E "(Packages|packages)" | head -5 | tee -a "$LOG_FILE" || true
    fi

    # Run Lynis if available
    if command -v lynis &>/dev/null; then
        log "Running Lynis security audit..."
        lynis audit system --quiet --no-colors 2>&1 | tail -20 | tee -a "$LOG_FILE" || true
    else
        log_warning "Lynis not installed. Install with: apt install lynis"
    fi
}

health_check() {
    log "Performing health check..."

    # Check for failed services
    log "Checking systemd services..."
    local failed_services
    failed_services=$(systemctl --failed --no-legend 2>/dev/null || true)

    if [[ -n "$failed_services" ]]; then
        log_warning "Failed services detected:"
        echo "$failed_services" | tee -a "$LOG_FILE"
    else
        log_success "No failed services."
    fi

    # Disk usage
    log "Disk usage:"
    df -h | grep -E '^/dev/' | tee -a "$LOG_FILE"

    # Memory usage
    log "Memory usage:"
    free -h | tee -a "$LOG_FILE"

    # Load average
    log "System load:"
    uptime | tee -a "$LOG_FILE"

    # Check for zombie processes
    local zombies
    zombies=$(ps aux | awk '$8 ~ /Z/ { print }' | wc -l)
    if [[ "$zombies" -gt 0 ]]; then
        log_warning "Zombie processes detected: $zombies"
    fi
}

handle_reboot() {
    if [[ -f /var/run/reboot-required ]]; then
        log_warning "System reboot is required."

        if [[ -f /var/run/reboot-required.pkgs ]]; then
            log "Packages requiring reboot:"
            cat /var/run/reboot-required.pkgs | tee -a "$LOG_FILE"
        fi

        if [[ "$AUTO_REBOOT" == true ]]; then
            log_warning "Auto-reboot enabled. Rebooting in 60 seconds..."
            log_warning "Press Ctrl+C to cancel."
            sleep 60
            reboot
        else
            log "Auto-reboot disabled. Please reboot manually when convenient."
        fi
    else
        log_success "No reboot required."
    fi
}

# ------------------------------------------------------------------------------
# Main
# ------------------------------------------------------------------------------

main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -r|--auto-reboot)
                AUTO_REBOOT=true
                shift
                ;;
            -s|--skip-security)
                SKIP_SECURITY=true
                shift
                ;;
            -d|--docker-cleanup)
                DOCKER_CLEANUP=true
                shift
                ;;
            -q|--quiet)
                QUIET=true
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

    # Check root
    check_root

    # Initialize log
    touch "$LOG_FILE"
    chmod 644 "$LOG_FILE"

    log "=========================================="
    log "System Maintenance Started"
    log "=========================================="
    log "Hostname: $(hostname)"
    log "Date:     $(date)"
    log "=========================================="

    # Run maintenance tasks
    update_packages
    cleanup_system

    if [[ "$DOCKER_CLEANUP" == true ]]; then
        cleanup_docker
    fi

    security_audit
    health_check
    handle_reboot

    log_success "=========================================="
    log_success "System Maintenance Complete"
    log_success "=========================================="
    log "Log file: $LOG_FILE"
}

main "$@"
