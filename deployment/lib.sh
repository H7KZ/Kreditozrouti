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

# ------------------------------------------------------------------------------
# Version directory cleanup
# Removes version dirs under $HOME/kreditozrouti/versions/<stream>/ older than
# 7 days that aren't the "current" symlink target. A minimum of 3 is kept.
# ------------------------------------------------------------------------------

cleanup_old_versions() {
    local stream="$1"
    local versions_dir="$HOME/kreditozrouti/versions/$stream"
    local current_link="$versions_dir/current"

    [[ -d "$versions_dir" ]] || return 0

    local current_target
    current_target=$(readlink -f "$current_link" 2>/dev/null || echo "")

    local all_versions=()
    while IFS= read -r -d '' dir; do
        all_versions+=("$dir")
    done < <(find "$versions_dir" -maxdepth 1 -mindepth 1 -type d -printf '%T@\t%p\0' | sort -z | cut -z -f2-)

    local total=${#all_versions[@]}
    local kept=0
    local deleted=0

    for dir in "${all_versions[@]}"; do
        [[ "$dir" == "$current_target" ]] && { ((kept++)); continue; }

        local age_days
        age_days=$(( ($(date +%s) - $(stat -c %Y "$dir")) / 86400 ))

        if [[ $age_days -gt 7 ]] && [[ $((total - deleted)) -gt 3 ]]; then
            log "Removing old version: $(basename "$dir") (${age_days}d old)"
            rm -rf "$dir"
            ((deleted++))
        else
            ((kept++))
        fi
    done

    [[ $deleted -gt 0 ]] && log_success "Cleaned up $deleted old version(s), kept $kept"
    [[ $deleted -eq 0 ]] && log "Version cleanup: $kept version(s) kept, nothing removed"
}
