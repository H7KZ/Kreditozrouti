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
    # Requires an interactive terminal — this is a manual, operator-run safety gate,
    # not something that should ever run unattended (CI, cron, piped stdin, etc.)
    [[ -t 0 ]] || {
        log_error "Confirmation requires an interactive terminal (stdin is not a TTY). Aborting."
        exit 1
    }

    log_warning "=========================================="
    log_warning "  DESTRUCTIVE OPERATION"
    log_warning "=========================================="
    log_warning "This will WIPE the '$TARGET_PROJECT' database ($TARGET_DB)"
    log_warning "and replace it with a copy of '$SOURCE_PROJECT' ($SOURCE_DB)."
    echo
    log_warning "A backup of '$TARGET_PROJECT' will be taken first, but this"
    log_warning "is still a destructive, hard-to-fully-undo operation."
    log_warning "=========================================="

    local typed=""
    read -r -p "Type the target environment name ('$TARGET_PROJECT') to continue: " typed || {
        log_error "No input received. Aborting."
        exit 1
    }

    if [[ "$typed" != "$TARGET_PROJECT" ]]; then
        log_error "Confirmation did not match '$TARGET_PROJECT'. Aborting."
        exit 1
    fi

    log_success "Confirmed — proceeding with clone into '$TARGET_PROJECT'"
}

backup_target() {
    mkdir -p "$BACKUP_DIR"

    local timestamp backup_file
    timestamp="$(date -u +'%Y%m%dT%H%M%SZ')"
    backup_file="$BACKUP_DIR/${TARGET_PROJECT}-pre-clone-${timestamp}.sql.gz"

    log "Backing up '$TARGET_PROJECT' ($TARGET_DB) to $backup_file ..."

    # gzip exits 0 even on empty/truncated input, so `pipefail`'s combined exit code
    # alone can't be trusted — check mysqldump's own exit code via PIPESTATUS, and
    # clean up the partial file on any failure so the backup dir stays trustworthy.
    set +e
    docker exec "$TARGET_CONTAINER" \
        mysqldump --single-transaction --routines --triggers \
            -u root -p"$TARGET_ROOT_PW" "$TARGET_DB" \
        | gzip > "$backup_file"
    local dump_status="${PIPESTATUS[0]}"
    set -e

    if [[ "$dump_status" -ne 0 ]]; then
        rm -f "$backup_file"
        log_error "mysqldump failed (exit $dump_status) — aborting before touching '$TARGET_PROJECT'"
        exit 1
    fi

    if [[ ! -s "$backup_file" ]]; then
        rm -f "$backup_file"
        log_error "Backup file is empty or missing: $backup_file"
        exit 1
    fi

    log_success "Backup written: $backup_file ($(du -h "$backup_file" | cut -f1))"
}

clone_database() {
    log "Cloning '$SOURCE_PROJECT' ($SOURCE_DB) -> '$TARGET_PROJECT' ($TARGET_DB) ..."
    log "This may take a while depending on database size — please wait."

    # Both mysqldump (source) and mysql (target restore) must succeed — check each
    # stage's exit code explicitly via PIPESTATUS, since the pipeline's combined
    # exit code alone can mask a source-side failure if the target client exits 0.
    set +e
    docker exec "$SOURCE_CONTAINER" \
        mysqldump --single-transaction --routines --triggers --add-drop-table \
            -u root -p"$SOURCE_ROOT_PW" "$SOURCE_DB" \
        | docker exec -i "$TARGET_CONTAINER" \
            mysql -u root -p"$TARGET_ROOT_PW" "$TARGET_DB"
    local -a pipe_status=("${PIPESTATUS[@]}")
    local dump_status="${pipe_status[0]}"
    local restore_status="${pipe_status[1]}"
    set -e

    if [[ "$dump_status" -ne 0 || "$restore_status" -ne 0 ]]; then
        log_error "Clone failed (mysqldump exit $dump_status, mysql restore exit $restore_status)"
        log_error "'$TARGET_PROJECT' may be left in a partially-restored state — restore from the pre-clone backup in $BACKUP_DIR if needed."
        exit 1
    fi

    log_success "Clone complete: '$SOURCE_PROJECT' -> '$TARGET_PROJECT'"
}

verify_clone() {
    local table="insis_courses"
    local source_count target_count

    source_count="$(docker exec "$SOURCE_CONTAINER" \
        mysql -u root -p"$SOURCE_ROOT_PW" -N -e "SELECT COUNT(*) FROM $SOURCE_DB.$table")"
    target_count="$(docker exec "$TARGET_CONTAINER" \
        mysql -u root -p"$TARGET_ROOT_PW" -N -e "SELECT COUNT(*) FROM $TARGET_DB.$table")"

    log "Verification — '$table' row count:"
    log "  $SOURCE_PROJECT (source): $source_count"
    log "  $TARGET_PROJECT (target): $target_count"

    if [[ "$source_count" == "$target_count" ]]; then
        log_success "Row counts match — clone looks correct."
    else
        log_warning "Row counts differ! Investigate before trusting '$TARGET_PROJECT'."
        log_warning "A pre-clone backup is available at: $BACKUP_DIR"
    fi
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

backup_target

clone_database

verify_clone

log "=========================================="
log_success "Done. '$TARGET_PROJECT' now mirrors '$SOURCE_PROJECT'."
log "Pre-clone backup kept at: $BACKUP_DIR"
log "Note: Redis/BullMQ queue data was NOT cloned (by design — see script header)."
log "=========================================="
