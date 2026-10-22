#!/usr/bin/env bash
# Shared utilities for Kreditozrouti deployment and maintenance scripts.
# Source this file near the top of each script:
#   source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

# ------------------------------------------------------------------------------
# Logging: the pinned toolkit's log.sh (log_info, log_ok, log_warn, log_error, die). The short names
# below are kept for the existing callers. LOG_TAG defaults to the sourcing script's name.
# ------------------------------------------------------------------------------

LOG_TAG="${LOG_TAG:-$(basename -- "${BASH_SOURCE[1]:-$0}")}"
# shellcheck source=/dev/null
source "$(dirname "${BASH_SOURCE[0]}")/../deployment/vendor/toolkit/log.sh"

log() { log_info "$1"; }
log_success() { log_ok "$1"; }
log_warning() { log_warn "$1"; }

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
