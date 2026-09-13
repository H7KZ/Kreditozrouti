#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script Name: setup-automation.sh
# Description: Installs a systemd timer that runs backup-mysql.sh daily. VPS-wide
#              concerns (docker-cleanup, maintenance, swap) moved to Infrastructure's
#              scripts/setup-automation.sh — this box shares one Docker daemon and
#              one disk across repos, so those run once for the whole VPS, not once
#              per app. Run that one too if it isn't installed yet.
#
# Usage:       sudo ./setup-automation.sh [OPTIONS]
#
# Options:
#   --backup-time <HH:MM>       Daily MySQL backup time (default: 02:00)
#   --backup-env <name>         Environment to back up (default: production)
#   --backup-user <name>        User the backup runs as (default: owner of this
#                               script's directory)
#   -u, --uninstall             Remove the installed timer and unit
#   -s, --status                Show status of the installed timer and exit
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
# Idempotent: re-run any time to change a schedule or flag — it rewrites the unit
# files and re-enables the timer, so edits take effect without any manual
# systemctl work. --uninstall removes everything it installed.
#
# Requirements:
#   - Must be run as root (sudo)
#   - systemd-based host (Ubuntu/Debian)
#   - Docker installed
# ==============================================================================

readonly SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

readonly PREFIX="kreditozrouti"
readonly SYSTEMD_DIR="/etc/systemd/system"

readonly BACKUP_DEFAULTS_FILE="/etc/default/${PREFIX}-backup"
readonly TEXTFILE_DIR="/var/lib/${PREFIX}/textfile-collector"

BACKUP_TIME="02:00"
BACKUP_ENVIRONMENT="production"
BACKUP_USER=""
BACKUP_HOME=""
UNINSTALL=false
STATUS_ONLY=false

source "$SCRIPT_DIR/lib.sh"

usage() {
    cat << EOF
Usage: sudo $SCRIPT_NAME [OPTIONS]

Installs a systemd timer that runs backup-mysql.sh daily.

Options:
    --backup-time <HH:MM>       Daily MySQL backup time (default: 02:00)
    --backup-env <name>         Environment to back up (default: production)
    --backup-user <name>        User the backup runs as (default: owner of $SCRIPT_DIR)
    -u, --uninstall             Remove installed timer and unit
    -s, --status                Show timer status and exit
    -h, --help                  Show this help message

Examples:
    sudo $SCRIPT_NAME
    sudo $SCRIPT_NAME --backup-time 01:15
    sudo $SCRIPT_NAME --status
    sudo $SCRIPT_NAME --uninstall

Installed unit:
    ${PREFIX}-mysql-backup.service / .timer   (daily)

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
    validate_files "$SCRIPT_DIR/backup-mysql.sh"
    chmod +x "$SCRIPT_DIR/backup-mysql.sh"
}

# The backup reads the deployed stack from ~/kreditozrouti/versions/<env>/current
# and writes dumps to ~/kreditozrouti/backups/<env>, both under the DEPLOYING
# user's home - not root's. scripts/ is synced to that user's ~/kreditozrouti/scripts
# by .github/workflows/sync-scripts.yml, so its owner is the right account to run as.
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

unit_paths() {
    echo \
        "$SYSTEMD_DIR/${PREFIX}-mysql-backup.service" \
        "$SYSTEMD_DIR/${PREFIX}-mysql-backup.timer"
}

write_units() {
    log "Writing systemd units to $SYSTEMD_DIR..."

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
}

enable_timers() {
    log "Reloading systemd and enabling timer..."
    systemctl daemon-reload
    systemctl enable --now "${PREFIX}-mysql-backup.timer"
    log_success "Timer enabled."
}

show_status() {
    echo ""
    log "Installed timer:"
    systemctl list-timers "${PREFIX}-mysql-backup*" --all --no-pager 2>/dev/null || true
    echo ""
    echo -e "  ${CYAN}${PREFIX}-mysql-backup${NC}"
    systemctl status "${PREFIX}-mysql-backup.timer" --no-pager -n 0 2>/dev/null | grep -E "Active:|Trigger:" || true
    systemctl show "${PREFIX}-mysql-backup.service" -p ExecMainStatus -p Result 2>/dev/null | sed 's/^/    /' || true
    echo ""
}

do_install() {
    require_scripts
    resolve_backup_user
    ensure_backup_paths
    write_units
    enable_timers
    show_status

    log_success "=========================================="
    log_success "Backup automation installed"
    log_success "=========================================="
    log "Daily MySQL backup:   ${BACKUP_TIME} (env: ${BACKUP_ENVIRONMENT}, user: ${BACKUP_USER})"
    log "Backup settings:      $BACKUP_DEFAULTS_FILE"
    log "Backup metrics:       $TEXTFILE_DIR/mysql-backup.prom"
    echo ""
    log "Run now to verify:"
    log "  sudo systemctl start ${PREFIX}-mysql-backup.service"
    log "  journalctl -u ${PREFIX}-mysql-backup.service -f"
    echo ""
    log "VPS-wide docker-cleanup/maintenance timers live in Infrastructure's"
    log "scripts/setup-automation.sh — run that once per VPS, not per repo."
}

do_uninstall() {
    log "Removing Kreditozrouti backup automation timer..."
    systemctl disable --now "${PREFIX}-mysql-backup.timer" 2>/dev/null || true

    local removed=0
    for path in $(unit_paths); do
        if [[ -f "$path" ]]; then
            rm -f "$path"
            log "  Removed: $path"
            ((removed++)) || true
        fi
    done

    systemctl daemon-reload
    systemctl reset-failed 2>/dev/null || true
    log_success "Removed $removed unit file(s). Backup automation uninstalled."
    log "Left in place on purpose: existing dumps, $BACKUP_DEFAULTS_FILE and $TEXTFILE_DIR."
}

main() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
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
    log "Kreditozrouti Backup Automation Setup"
    log "=========================================="

    if [[ "$UNINSTALL" == true ]]; then
        do_uninstall
    else
        do_install
    fi
}

main "$@"
