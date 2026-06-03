#!/usr/bin/env bash
# Shared utilities for deployment scripts.
# Kept in sync with scripts/lib.sh — update both when changing shared logic.

# ------------------------------------------------------------------------------
# Colors
# ------------------------------------------------------------------------------

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
DIM='\033[2m'
NC='\033[0m'

# ------------------------------------------------------------------------------
# Logging
# If LOG_FILE is set before sourcing this file (or before first log call),
# all log output is tee'd to that file in addition to stdout/stderr.
# ------------------------------------------------------------------------------

_log_line() {
    local color="$1" text="$2"
    local line="${color}[$(date +'%Y-%m-%dT%H:%M:%S%z')]${NC} ${text}"
    if [[ -n "${LOG_FILE:-}" ]]; then
        echo -e "$line" | tee -a "$LOG_FILE"
    else
        echo -e "$line"
    fi
}

log()         { _log_line "$BLUE"   "$1"; }
log_success() { _log_line "$GREEN"  "$1"; }
log_warning() { _log_line "$YELLOW" "$1"; }

log_error() {
    local line="${RED}[$(date +'%Y-%m-%dT%H:%M:%S%z')]${NC} $1"
    if [[ -n "${LOG_FILE:-}" ]]; then
        echo -e "$line" | tee -a "$LOG_FILE" >&2
    else
        echo -e "$line" >&2
    fi
}

# ------------------------------------------------------------------------------
# File validation
# ------------------------------------------------------------------------------

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
# Docker infrastructure helpers
# Both functions parse `name: <value>` lines from a docker compose YAML
# and create the named network/volume if it does not already exist.
# ------------------------------------------------------------------------------

create_networks() {
    local config_file="$1"

    log "Setting up Docker networks..."

    grep -E '^\s+name:\s+' "$config_file" | awk '{print $2}' | while read -r network; do
        if ! docker network inspect "$network" &>/dev/null; then
            log "Creating network: $network"
            docker network create "$network"
        else
            log "Network exists: $network"
        fi
    done
}

create_volumes() {
    local config_file="$1"

    log "Setting up Docker volumes..."

    grep -E '^\s+name:\s+' "$config_file" | awk '{print $2}' | while read -r volume; do
        if ! docker volume inspect "$volume" &>/dev/null; then
            log "Creating volume: $volume"
            docker volume create "$volume"
        else
            log "Volume exists: $volume"
        fi
    done
}
