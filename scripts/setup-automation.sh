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
#              Three timers are installed:
#                - docker-cleanup : daily, reclaims images/volumes/build cache
#                                   and truncates container logs
#                - mysql-backup   : daily, gzip'd mysqldump into
#                                   ~/kreditozrouti/backups/<env>, optional
#                                   off-site copy, Prometheus textfile metrics
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
#   --backup-time <HH:MM>       Daily MySQL backup time (default: 02:00)
#   --backup-env <name>         Environment to back up (default: production)
#   --backup-user <name>        User the backup runs as (default: owner of this
#                               script's directory)
#   -u, --uninstall             Remove the installed timers and units
#   -s, --status                Show status of the installed timers and exit
#   -h, --help                  Show help message
#
# Backup configuration:
#   The mysql-backup unit reads optional settings from
#   /etc/default/kreditozrouti-backup (BACKUP_REMOTE, BACKUP_RETENTION_DAYS,
#   BACKUP_MIN_KEEP, BACKUP_TEXTFILE_DIR). See backup-mysql.sh for the full list.
#   The unit runs as the deploying user, not root, because the dumps and the
#   deployed version directory live under that user's home; that user must be in
#   the docker group.
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

# Backup-specific paths. TEXTFILE_DIR must match backup-mysql.sh's default and
# the directory the Alloy/Prometheus textfile collector scrapes.
readonly BACKUP_DEFAULTS_FILE="/etc/default/${PREFIX}-backup"
readonly TEXTFILE_DIR="/var/lib/${PREFIX}/textfile-collector"

# Defaults
AUTO_REBOOT=false
SWAP_SIZE_GB=4
SKIP_SWAP=false
CLEANUP_TIME="03:30"
MAINTENANCE_TIME="Sun *-*-* 04:00:00"
KEEP_RECENT_HOURS=48
BACKUP_TIME="02:00"
BACKUP_ENVIRONMENT="production"
BACKUP_USER=""
BACKUP_HOME=""
UNINSTALL=false
STATUS_ONLY=false

source "$SCRIPT_DIR/lib.sh"

# ------------------------------------------------------------------------------
# Functions
# ------------------------------------------------------------------------------

usage() {
    cat << EOF
Usage: sudo $SCRIPT_NAME [OPTIONS]

Installs systemd timers that run maintenance.sh, docker-cleanup.sh and
backup-mysql.sh on a schedule (daily cleanup + daily MySQL backup + weekly full
maintenance).

Options:
    -r, --auto-reboot           Allow weekly maintenance to auto-reboot the host
    --swap-size <GB>            Swap file size to ensure exists (default: 4)
    --skip-swap                 Do not ensure a swap file exists
    --cleanup-time <HH:MM>      Daily docker-cleanup time (default: 03:30)
    --maintenance-time <spec>   Weekly maintenance OnCalendar (default: "Sun *-*-* 04:00:00")
    --keep-recent <hrs>         Keep images newer than N hours in daily cleanup (default: 48)
    --backup-time <HH:MM>       Daily MySQL backup time (default: 02:00)
    --backup-env <name>         Environment to back up (default: production)
    --backup-user <name>        User the backup runs as (default: owner of $SCRIPT_DIR)
    -u, --uninstall             Remove installed timers and units
    -s, --status                Show timer status and exit
    -h, --help                  Show this help message

Examples:
    sudo $SCRIPT_NAME                          # install with defaults
    sudo $SCRIPT_NAME --auto-reboot            # weekly maintenance may reboot
    sudo $SCRIPT_NAME --cleanup-time 02:00     # run daily cleanup at 02:00
    sudo $SCRIPT_NAME --backup-time 01:15      # run the MySQL backup at 01:15
    sudo $SCRIPT_NAME --status                 # inspect installed timers
    sudo $SCRIPT_NAME --uninstall              # remove everything

Installed units:
    ${PREFIX}-docker-cleanup.service / .timer   (daily)
    ${PREFIX}-mysql-backup.service   / .timer   (daily)
    ${PREFIX}-maintenance.service    / .timer   (weekly)

Backup settings (BACKUP_REMOTE, BACKUP_RETENTION_DAYS, BACKUP_MIN_KEEP,
BACKUP_TEXTFILE_DIR) go in $BACKUP_DEFAULTS_FILE.
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
        "$SCRIPT_DIR/maintenance.sh" \
        "$SCRIPT_DIR/backup-mysql.sh"
    chmod +x "$SCRIPT_DIR/docker-cleanup.sh" "$SCRIPT_DIR/maintenance.sh" "$SCRIPT_DIR/backup-mysql.sh"
}

# The backup reads the deployed stack from ~/kreditozrouti/versions/<env>/current
# and writes dumps to ~/kreditozrouti/backups/<env>, both under the DEPLOYING
# user's home - not root's. scripts/ is synced to that user's ~/scripts by
# .github/workflows/sync-scripts.yml, so its owner is the right account to run as.
resolve_backup_user() {
    if [[ -z "$BACKUP_USER" ]]; then
        BACKUP_USER="$(stat -c %U "$SCRIPT_DIR")"
    fi

    if ! id "$BACKUP_USER" >/dev/null 2>&1; then
        log_error "Backup user '$BACKUP_USER' does not exist. Pass --backup-user <name>."
        exit 1
    fi

    BACKUP_HOME="$(getent passwd "$BACKUP_USER" | cut -d: -f6)"
    if [[ -z "$BACKUP_HOME" ]]; then
        log_error "Could not determine the home directory of '$BACKUP_USER'."
        exit 1
    fi

    if [[ "$BACKUP_USER" == "root" ]]; then
        log_warning "Backup will run as root, so it looks for deployments under /root."
        log_warning "Pass --backup-user <deploy user> if the stack was deployed elsewhere."
    fi

    if ! id -nG "$BACKUP_USER" 2>/dev/null | tr ' ' '\n' | grep -qx docker && [[ "$BACKUP_USER" != "root" ]]; then
        log_warning "'$BACKUP_USER' is not in the docker group - the backup cannot reach the mysql container."
    fi
}

# Prometheus textfile collector directory. backup-mysql.sh creates it too, but
# creating it here means it exists with the right owner before the first run.
ensure_backup_paths() {
    mkdir -p "$TEXTFILE_DIR"
    chown "$BACKUP_USER" "$TEXTFILE_DIR"

    if [[ ! -f "$BACKUP_DEFAULTS_FILE" ]]; then
        log "Writing backup defaults template to $BACKUP_DEFAULTS_FILE"
        cat > "$BACKUP_DEFAULTS_FILE" << 'EOF'
# Optional settings for kreditozrouti-mysql-backup.service.
# See scripts/backup-mysql.sh for the full list.
#
# rclone remote path for off-site replication. Unset means the dump exists only
# on this VPS. rclone reads its own credentials from ~/.config/rclone/rclone.conf,
# so no secret belongs in this file.
#BACKUP_REMOTE=storagebox:kreditozrouti/production
#BACKUP_RETENTION_DAYS=14
#BACKUP_MIN_KEEP=5
EOF
        chmod 0644 "$BACKUP_DEFAULTS_FILE"
    else
        log "Backup defaults file already present: $BACKUP_DEFAULTS_FILE"
    fi
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
        "$SYSTEMD_DIR/${PREFIX}-mysql-backup.service" \
        "$SYSTEMD_DIR/${PREFIX}-mysql-backup.timer" \
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

    # --- Daily MySQL backup ---------------------------------------------------
    cat > "$SYSTEMD_DIR/${PREFIX}-mysql-backup.service" << EOF
[Unit]
Description=Kreditozrouti daily MySQL backup ($BACKUP_ENVIRONMENT)
Documentation=file://$SCRIPT_DIR/backup-mysql.sh
After=docker.service network-online.target
Wants=docker.service network-online.target

[Service]
Type=oneshot
Nice=10
User=$BACKUP_USER
Environment=HOME=$BACKUP_HOME
EnvironmentFile=-$BACKUP_DEFAULTS_FILE
ExecStart=$SCRIPT_DIR/backup-mysql.sh $BACKUP_ENVIRONMENT
EOF

    cat > "$SYSTEMD_DIR/${PREFIX}-mysql-backup.timer" << EOF
[Unit]
Description=Run Kreditozrouti MySQL backup daily

[Timer]
OnCalendar=*-*-* ${BACKUP_TIME}:00
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
    systemctl enable --now "${PREFIX}-mysql-backup.timer"
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
    for t in "${PREFIX}-docker-cleanup" "${PREFIX}-mysql-backup" "${PREFIX}-maintenance"; do
        echo -e "  ${CYAN}${t}${NC}"
        systemctl status "${t}.timer" --no-pager -n 0 2>/dev/null | grep -E "Active:|Trigger:" || true
        systemctl show "${t}.service" -p ExecMainStatus -p Result 2>/dev/null | sed 's/^/    /' || true
    done
    echo ""
}

do_install() {
    require_scripts
    resolve_backup_user
    ensure_swap
    ensure_backup_paths
    write_units
    enable_timers
    show_status

    log_success "=========================================="
    log_success "Automation installed"
    log_success "=========================================="
    log "Swap ensured:         $([[ "$SKIP_SWAP" == true ]] && echo "skipped" || echo "${SWAP_SIZE_GB}G")"
    log "Daily docker cleanup: ${CLEANUP_TIME} (keep images < ${KEEP_RECENT_HOURS}h)"
    log "Daily MySQL backup:   ${BACKUP_TIME} (env: ${BACKUP_ENVIRONMENT}, user: ${BACKUP_USER})"
    log "Weekly maintenance:   ${MAINTENANCE_TIME} (auto-reboot: ${AUTO_REBOOT})"
    log "Backup settings:      $BACKUP_DEFAULTS_FILE"
    log "Backup metrics:       $TEXTFILE_DIR/mysql-backup.prom"
    echo ""
    log "Run one now to verify:"
    log "  sudo systemctl start ${PREFIX}-docker-cleanup.service"
    log "  journalctl -u ${PREFIX}-docker-cleanup.service -f"
    log "  sudo systemctl start ${PREFIX}-mysql-backup.service"
    log "  journalctl -u ${PREFIX}-mysql-backup.service -f"
}

do_uninstall() {
    log "Removing Kreditozrouti automation timers..."
    local unit
    for unit in "${PREFIX}-docker-cleanup" "${PREFIX}-mysql-backup" "${PREFIX}-maintenance"; do
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
    log "Left in place on purpose: existing dumps, $BACKUP_DEFAULTS_FILE and $TEXTFILE_DIR."
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
            --backup-time)         BACKUP_TIME="$2"; shift 2 ;;
            --backup-env)          BACKUP_ENVIRONMENT="$2"; shift 2 ;;
            --backup-user)         BACKUP_USER="$2"; shift 2 ;;
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
