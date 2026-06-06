#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script Name: clone-db.sh
# Description: Clones the MySQL database from one Kreditozrouti environment
#              (dev/prod) to the other, on the same VPS. Used to seed an
#              environment from another's already-scraped data without
#              re-running InSIS scrapes.
#
# Usage:       sudo ./clone-db.sh <dev-to-prod|prod-to-dev>
#
# Safety:
#   - Backs up the target DB (gzipped dump) before any destructive action
#   - Requires the operator to type the target environment's project name
#     to confirm before proceeding
#
# Requirements:
#   - Must be run on the VPS where both `dev` and `prod` Compose stacks run
#   - Both stacks' `.env` files must exist at
#     $HOME/versions/<environment>/current/.env  (same convention as deploy.sh)
#
# Log File: none (stdout only; redirect to a file yourself if needed)
# ==============================================================================

readonly SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly BACKUP_DIR="$HOME/backups/db-clones"

source "$SCRIPT_DIR/lib.sh"

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root."
        log_error "Use: sudo $SCRIPT_NAME"
        exit 1
    fi
}

DIRECTION="${1:-}"

usage() {
    cat << EOF
Usage: sudo $SCRIPT_NAME <dev-to-prod|prod-to-dev>

Clones the MySQL database from one environment to the other on this VPS.

Arguments:
    dev-to-prod   Clone dev's database into prod (overwrites prod)
    prod-to-dev   Clone prod's database into dev (overwrites dev)

Examples:
    sudo $SCRIPT_NAME dev-to-prod
    sudo $SCRIPT_NAME prod-to-dev
EOF
    exit 1
}

load_credentials() {
    local env_name="$1"
    local env_file="$HOME/versions/$env_name/current/.env"

    [[ -f "$env_file" ]] || {
        log_error "Missing .env for '$env_name' at: $env_file"
        exit 1
    }

    # Extract just the two vars we need without sourcing the whole file
    # (the deployed .env also carries image tags, registry creds, etc.)
    # Strip a single layer of surrounding quotes in case the .env uses KEY="value" or KEY='value'
    local strip_quotes='s/^"(.*)"$/\1/; s/^'"'"'(.*)'"'"'$/\1/'
    local root_pw db_name
    root_pw="$(grep -E '^MYSQL_ROOT_PASSWORD=' "$env_file" | head -n1 | cut -d'=' -f2- | sed -E "$strip_quotes")"
    db_name="$(grep -E '^MYSQL_DATABASE=' "$env_file" | head -n1 | cut -d'=' -f2- | sed -E "$strip_quotes")"

    [[ -n "$root_pw" && -n "$db_name" ]] || {
        log_error "Could not read MYSQL_ROOT_PASSWORD / MYSQL_DATABASE from: $env_file"
        exit 1
    }

    printf '%s\t%s' "$root_pw" "$db_name"
}

confirm_clone() {
    log_warning "=========================================="
    log_warning "  DESTRUCTIVE OPERATION"
    log_warning "=========================================="
    log_warning "This will WIPE the '$TARGET_PROJECT' database ($TARGET_DB)"
    log_warning "and replace it with a copy of '$SOURCE_PROJECT' ($SOURCE_DB)."
    log_warning ""
    log_warning "A backup of '$TARGET_PROJECT' will be taken first, but this"
    log_warning "is still a destructive, hard-to-fully-undo operation."
    log_warning "=========================================="

    local typed=""
    read -r -p "Type the target environment name ('$TARGET_PROJECT') to continue: " typed

    if [[ "$typed" != "$TARGET_PROJECT" ]]; then
        log_error "Confirmation did not match '$TARGET_PROJECT'. Aborting."
        exit 1
    fi

    log_success "Confirmed — proceeding with clone into '$TARGET_PROJECT'"
}

resolve_projects() {
    case "$DIRECTION" in
        dev-to-prod)
            SOURCE_PROJECT="dev"
            SOURCE_ENV="development"
            TARGET_PROJECT="prod"
            TARGET_ENV="production"
            ;;
        prod-to-dev)
            SOURCE_PROJECT="prod"
            SOURCE_ENV="production"
            TARGET_PROJECT="dev"
            TARGET_ENV="development"
            ;;
        *)
            log_error "Unknown direction: '$DIRECTION'"
            usage
            ;;
    esac

    # Docker Compose auto-names containers as <project>-<service>-<replica>
    SOURCE_CONTAINER="${SOURCE_PROJECT}-mysql-1"
    TARGET_CONTAINER="${TARGET_PROJECT}-mysql-1"
}

check_root

[[ -z "$DIRECTION" ]] && usage

resolve_projects

log "=========================================="
log "Kreditozrouti DB Clone"
log "=========================================="
log "Direction: $DIRECTION"
log "Source:    $SOURCE_PROJECT ($SOURCE_CONTAINER)"
log "Target:    $TARGET_PROJECT ($TARGET_CONTAINER)"
log "=========================================="

log "Loading credentials..."

IFS=$'\t' read -r SOURCE_ROOT_PW SOURCE_DB <<< "$(load_credentials "$SOURCE_ENV")"
IFS=$'\t' read -r TARGET_ROOT_PW TARGET_DB <<< "$(load_credentials "$TARGET_ENV")"

log_success "Credentials loaded for both environments"
log "Source DB: $SOURCE_DB ($SOURCE_ENV)"
log "Target DB: $TARGET_DB ($TARGET_ENV)"

confirm_clone
