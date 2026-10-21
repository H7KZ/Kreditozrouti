#!/usr/bin/env bash
# Shared utilities for deployment scripts.
# Logging and file validation only; deployment mutation belongs to toolkit.
# Previously shared with scripts/lib.sh — update both when changing shared logic.

# ------------------------------------------------------------------------------
# Logging: the pinned toolkit's log.sh (log_info, log_ok, log_warn, log_error, die). The short names
# below are kept for the existing callers. LOG_TAG defaults to the sourcing script's name.
# ------------------------------------------------------------------------------

LOG_TAG="${LOG_TAG:-$(basename -- "${BASH_SOURCE[1]:-$0}")}"
# shellcheck source=/dev/null
source "$(dirname "${BASH_SOURCE[0]}")/vendor/toolkit/log.sh"

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
