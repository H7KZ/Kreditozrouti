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

    SOURCE_CONTAINER="${SOURCE_PROJECT}-mysql-1"
    TARGET_CONTAINER="${TARGET_PROJECT}-mysql-1"
}

[[ -z "$DIRECTION" ]] && usage

resolve_projects

log "=========================================="
log "Kreditozrouti DB Clone"
log "=========================================="
log "Direction: $DIRECTION"
log "Source:    $SOURCE_PROJECT ($SOURCE_CONTAINER)"
log "Target:    $TARGET_PROJECT ($TARGET_CONTAINER)"
log "=========================================="
