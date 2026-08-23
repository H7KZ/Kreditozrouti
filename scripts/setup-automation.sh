#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script Name: setup-automation.sh
# Description: Installs systemd services + timers that run the maintenance and
#              docker-cleanup scripts on a schedule. This keeps disk usage,
#              stale images/logs, package updates and health checks under
#              control automatically - which in turn stops the host from
#              filling up or running out of memory (the usual cause of the
#              Prometheus "DatasourceNoData" / container-down alert cascade).
#
#              Two timers are installed:
#                - docker-cleanup : daily, reclaims images/volumes/build cache
#                                   and truncates container logs
#                - maintenance    : weekly, apt updates + system cleanup +
#                                   security audit + health check (+ docker
#                                   cleanup), optional auto-reboot
#
# Usage:       sudo ./setup-automation.sh [OPTIONS]
#
# Options:
#   -r, --auto-reboot           Let the weekly maintenance timer reboot the
#                               host when the kernel/packages require it
#   --swap-size <GB>            Swap file size to ensure exists (default: 4)
#   --skip-swap                 Do not ensure a swap file exists
#   --cleanup-time <HH:MM>      Daily docker-cleanup time (default: 03:30)
#   --maintenance-time <spec>   Weekly maintenance OnCalendar (default: Sun 04:00)
#   --keep-recent <hrs>         Keep images newer than N hours in daily cleanup
#                               (default: 48)
#   -u, --uninstall             Remove the installed timers and units
#   -s, --status                Show status of the installed timers and exit
#   -h, --help                  Show help message
#
# Requirements:
#   - Must be run as root (sudo)
#   - systemd-based host (Ubuntu/Debian)
#   - Docker installed
# ==============================================================================

readonly SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Unit naming
readonly PREFIX="kreditozrouti"
readonly SYSTEMD_DIR="/etc/systemd/system"

# Defaults
AUTO_REBOOT=false
SWAP_SIZE_GB=4
SKIP_SWAP=false
CLEANUP_TIME="03:30"
MAINTENANCE_TIME="Sun *-*-* 04:00:00"
KEEP_RECENT_HOURS=48
UNINSTALL=false
STATUS_ONLY=false

source "$SCRIPT_DIR/lib.sh"

# ------------------------------------------------------------------------------
# Functions
# ------------------------------------------------------------------------------

usage() {
    cat << EOF
Usage: sudo $SCRIPT_NAME [OPTIONS]

Installs systemd timers that run maintenance.sh and docker-cleanup.sh on a
schedule (daily cleanup + weekly full maintenance).

Options:
    -r, --auto-reboot           Allow weekly maintenance to auto-reboot the host
    --swap-size <GB>            Swap file size to ensure exists (default: 4)
    --skip-swap                 Do not ensure a swap file exists
    --cleanup-time <HH:MM>      Daily docker-cleanup time (default: 03:30)
    --maintenance-time <spec>   Weekly maintenance OnCalendar (default: "Sun *-*-* 04:00:00")
    --keep-recent <hrs>         Keep images newer than N hours in daily cleanup (default: 48)
    -u, --uninstall             Remove installed timers and units
    -s, --status                Show timer status and exit
    -h, --help                  Show this help message

Examples:
    sudo $SCRIPT_NAME                          # install with defaults
    sudo $SCRIPT_NAME --auto-reboot            # weekly maintenance may reboot
    sudo $SCRIPT_NAME --cleanup-time 02:00     # run daily cleanup at 02:00
    sudo $SCRIPT_NAME --status                 # inspect installed timers
    sudo $SCRIPT_NAME --uninstall              # remove everything

Installed units:
    ${PREFIX}-docker-cleanup.service / .timer   (daily)
    ${PREFIX}-maintenance.service    / .timer   (weekly)
EOF
    exit 1
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root. Use: sudo $SCRIPT_NAME"
        exit 1
    fi
}

require_scripts() {
    validate_files \
        "$SCRIPT_DIR/docker-cleanup.sh" \
        "$SCRIPT_DIR/maintenance.sh"
    chmod +x "$SCRIPT_DIR/docker-cleanup.sh" "$SCRIPT_DIR/maintenance.sh"
}

ensure_swap() {
    if [[ "$SKIP_SWAP" == true ]]; then
        log "Skipping swap check (--skip-swap)"
        return
    fi

    if swapon --show 2>/dev/null | grep -q .; then
        log "Swap already active - skipping swap setup."
        return
    fi

    if [[ ! -f "$SCRIPT_DIR/setup-swap.sh" ]]; then
        log_warning "setup-swap.sh not found - skipping swap setup."
        return
    fi

    log "No active swap found. Creating ${SWAP_SIZE_GB}G swap file..."
    chmod +x "$SCRIPT_DIR/setup-swap.sh"
    if "$SCRIPT_DIR/setup-swap.sh" "$SWAP_SIZE_GB"; then
        log_success "Swap enabled."
    else
        log_warning "Swap setup failed (continuing without it)."
    fi
}

unit_paths() {
    echo \
        "$SYSTEMD_DIR/${PREFIX}-docker-cleanup.service" \
        "$SYSTEMD_DIR/${PREFIX}-docker-cleanup.timer" \
        "$SYSTEMD_DIR/${PREFIX}-maintenance.service" \
        "$SYSTEMD_DIR/${PREFIX}-maintenance.timer"
}

write_units() {
    log "Writing systemd units to $SYSTEMD_DIR..."

    local maintenance_args="--docker-cleanup"
    [[ "$AUTO_REBOOT" == true ]] && maintenance_args="$maintenance_args --auto-reboot"

    # --- Daily docker cleanup -------------------------------------------------
    cat > "$SYSTEMD_DIR/${PREFIX}-docker-cleanup.service" << EOF
[Unit]
Description=Kreditozrouti daily Docker cleanup (images, volumes, cache, logs)
Documentation=file://$SCRIPT_DIR/docker-cleanup.sh
After=docker.service
Wants=docker.service

[Service]
Type=oneshot
Nice=10
IOSchedulingClass=idle
ExecStart=$SCRIPT_DIR/docker-cleanup.sh --all --force --keep-recent $KEEP_RECENT_HOURS
EOF

    cat > "$SYSTEMD_DIR/${PREFIX}-docker-cleanup.timer" << EOF
[Unit]
Description=Run Kreditozrouti Docker cleanup daily

[Timer]
OnCalendar=*-*-* ${CLEANUP_TIME}:00
RandomizedDelaySec=300
Persistent=true

[Install]
WantedBy=timers.target
EOF

    # --- Weekly full maintenance ----------------------------------------------
    cat > "$SYSTEMD_DIR/${PREFIX}-maintenance.service" << EOF
[Unit]
Description=Kreditozrouti weekly system maintenance (updates, cleanup, security, health)
Documentation=file://$SCRIPT_DIR/maintenance.sh
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
Nice=10
ExecStart=$SCRIPT_DIR/maintenance.sh $maintenance_args
EOF

    cat > "$SYSTEMD_DIR/${PREFIX}-maintenance.timer" << EOF
[Unit]
Description=Run Kreditozrouti system maintenance weekly

[Timer]
OnCalendar=${MAINTENANCE_TIME}
RandomizedDelaySec=900
Persistent=true

[Install]
WantedBy=timers.target
EOF
}

enable_timers() {
    log "Reloading systemd and enabling timers..."
    systemctl daemon-reload
    systemctl enable --now "${PREFIX}-docker-cleanup.timer"
    systemctl enable --now "${PREFIX}-maintenance.timer"
    log_success "Timers enabled."
}

show_status() {
    echo ""
    log "Installed timers:"
    systemctl list-timers "${PREFIX}-*" --all --no-pager 2>/dev/null || true
    echo ""
    log "Next runs and last results:"
    local t
    for t in "${PREFIX}-docker-cleanup" "${PREFIX}-maintenance"; do
        echo -e "  ${CYAN}${t}${NC}"
        systemctl status "${t}.timer" --no-pager -n 0 2>/dev/null | grep -E "Active:|Trigger:" || true
        systemctl show "${t}.service" -p ExecMainStatus -p Result 2>/dev/null | sed 's/^/    /' || true
    done
    echo ""
}

do_install() {
    require_scripts
    ensure_swap
    write_units
    enable_timers
    show_status

    log_success "=========================================="
    log_success "Automation installed"
    log_success "=========================================="
    log "Swap ensured:         $([[ "$SKIP_SWAP" == true ]] && echo "skipped" || echo "${SWAP_SIZE_GB}G")"
    log "Daily docker cleanup: ${CLEANUP_TIME} (keep images < ${KEEP_RECENT_HOURS}h)"
    log "Weekly maintenance:   ${MAINTENANCE_TIME} (auto-reboot: ${AUTO_REBOOT})"
    echo ""
    log "Run one now to verify:"
    log "  sudo systemctl start ${PREFIX}-docker-cleanup.service"
    log "  journalctl -u ${PREFIX}-docker-cleanup.service -f"
}

do_uninstall() {
    log "Removing Kreditozrouti automation timers..."
    local unit
    for unit in "${PREFIX}-docker-cleanup" "${PREFIX}-maintenance"; do
        systemctl disable --now "${unit}.timer" 2>/dev/null || true
    done

    local removed=0
    for path in $(unit_paths); do
        if [[ -f "$path" ]]; then
            rm -f "$path"
            log_verbose_rm "$path"
            ((removed++)) || true
        fi
    done

    systemctl daemon-reload
    systemctl reset-failed 2>/dev/null || true
    log_success "Removed $removed unit file(s). Automation uninstalled."
}

log_verbose_rm() { log "  Removed: $1"; }

# ------------------------------------------------------------------------------
# Main
# ------------------------------------------------------------------------------

main() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -r|--auto-reboot)      AUTO_REBOOT=true; shift ;;
            --swap-size)           SWAP_SIZE_GB="$2"; shift 2 ;;
            --skip-swap)           SKIP_SWAP=true; shift ;;
            --cleanup-time)        CLEANUP_TIME="$2"; shift 2 ;;
            --maintenance-time)    MAINTENANCE_TIME="$2"; shift 2 ;;
            --keep-recent)         KEEP_RECENT_HOURS="$2"; shift 2 ;;
            -u|--uninstall)        UNINSTALL=true; shift ;;
            -s|--status)           STATUS_ONLY=true; shift ;;
            -h|--help)             usage ;;
            *)                     log_error "Unknown parameter: $1"; usage ;;
        esac
    done

    check_root

    if [[ "$STATUS_ONLY" == true ]]; then
        show_status
        exit 0
    fi

    log "=========================================="
    log "Kreditozrouti Automation Setup"
    log "=========================================="

    if [[ "$UNINSTALL" == true ]]; then
        do_uninstall
    else
        do_install
    fi
}

main "$@"
