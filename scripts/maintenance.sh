#!/bin/bash
set -euo pipefail

# ==============================================================================
# Script Name: maintenance.sh
# Description: Performs system maintenance: updates, cleanup, and security checks.
#
# Usage:       sudo ./maintenance.sh
# Config:      AUTO_REBOOT (default: false)
# Log File:    /var/log/ubuntu_maintenance.log
# ==============================================================================

AUTO_REBOOT=false
LOG_FILE="/var/log/ubuntu_maintenance.log"

log() {
    local msg="[$(date +'%Y-%m-%dT%H:%M:%S%z')] $1"
    echo "$msg" | tee -a "$LOG_FILE"
}

if [[ $EUID -ne 0 ]]; then
   echo "Error: This script must be run as root."
   exit 1
fi

# Initialize Log
touch "$LOG_FILE"
chmod 644 "$LOG_FILE"
log "Starting system maintenance..."

# 1. Updates
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

# 2. System Cleanup
log "Vacuuming system journal (retention: 2 days)..."
journalctl --vacuum-time=2d

if [ -d "$HOME/.cache/thumbnails" ]; then
    log "Cleaning thumbnail cache..."
    rm -rf "$HOME/.cache/thumbnails/*"
fi

# 3. Security Checks
log "Checking for security updates (dry-run)..."
if command -v unattended-upgrades &> /dev/null; then
    unattended-upgrades --dry-run -d
else
    log "Skipping unattended-upgrades (not installed)."
fi

log "Running Lynis security audit (quiet)..."
if ! command -v lynis &> /dev/null; then
    log "Installing Lynis..."
    DEBIAN_FRONTEND=noninteractive apt-get install lynis -y -q
fi
lynis audit system --quiet

# 4. Health Check
log "Checking failed systemd services..."
SYSTEMD_FAILURES=$(systemctl --failed --no-legend)
if [ -n "$SYSTEMD_FAILURES" ]; then
    log "Warning: Failed services detected:"
    log "$SYSTEMD_FAILURES"
else
    log "No failed services found."
fi

log "Disk Usage:"
df -h | grep '^/dev/' | tee -a "$LOG_FILE"

log "Memory Usage:"
free -h | tee -a "$LOG_FILE"

# 5. Reboot Logic
if [ -f /var/run/reboot-required ]; then
    log "Reboot is required."
    if [ "$AUTO_REBOOT" = true ]; then
        log "Auto-reboot enabled. Rebooting now..."
        reboot
    else
        log "Auto-reboot disabled. Please reboot manually."
    fi
else
    log "No reboot required."
fi

log "Maintenance complete."
