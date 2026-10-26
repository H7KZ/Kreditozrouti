#!/usr/bin/env bash
set -Eeuo pipefail

# ==============================================================================
# Script Name: clone-db.sh
# Description: Clones the MySQL database from one Kreditozrouti environment
#              (dev/prod) to the other, on the same VPS. Used to seed an
#              environment from another's already-scraped data without
#              re-running InSIS scrapes.
#
# Usage:       sudo ./clone-db.sh <dev-to-prod|prod-to-dev>
#
# Standalone: no toolkit lock and no repo files needed. Do not start a GitHub
#             deploy while it runs.
#
# Safety:
#   - Backs up the target DB (gzipped dump) before any destructive action
#   - Requires the operator to type the target environment's project name
#     to confirm before proceeding
#
# Requirements:
#   - Must be run on the VPS where both Compose projects run: `kreditozrouti-dev`
#     (development) and `kreditozrouti` (production)
#   - Both stacks' MySQL containers must be running: credentials are read from them
#
# Log File: none (stdout only; redirect to a file yourself if needed)
# ==============================================================================

SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_NAME
DEPLOY_HOME="${DEPLOY_HOME:-/home/deploy}"
readonly DEPLOY_HOME
readonly BACKUP_DIR="$DEPLOY_HOME/backups/db-clones"

log() { echo "[$SCRIPT_NAME] $*"; }
log_success() { echo "[$SCRIPT_NAME] OK: $*"; }
log_warning() { echo "[$SCRIPT_NAME] WARNING: $*" >&2; }
log_error() { echo "[$SCRIPT_NAME] ERROR: $*" >&2; }

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
    # Reads the running MySQL container's env, so it does not depend on release files on disk.
    local container="$1" root_pw db_name
    root_pw="$(docker exec "$container" printenv MYSQL_ROOT_PASSWORD 2>/dev/null)" || root_pw=""
    db_name="$(docker exec "$container" printenv MYSQL_DATABASE 2>/dev/null)" || db_name=""

    [[ -n "$root_pw" && -n "$db_name" ]] || {
        log_error "Could not read MYSQL_ROOT_PASSWORD / MYSQL_DATABASE from container '$container' (is it running?)"
        exit 1
    }

    printf '%s\t%s' "$root_pw" "$db_name"
}

confirm_clone() {
    # Requires an interactive terminal - this is a manual, operator-run safety gate,
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

    log_success "Confirmed - proceeding with clone into '$TARGET_PROJECT'"
}

backup_target() {
    # Dumps hold the full DB, including password hashes: owner-only dir and files.
    umask 077
    install -d -m 0700 "$BACKUP_DIR"

    local timestamp backup_file
    timestamp="$(date -u +'%Y%m%dT%H%M%SZ')"
    backup_file="$BACKUP_DIR/${TARGET_PROJECT}-pre-clone-${timestamp}.sql.gz"

    log "Backing up '$TARGET_PROJECT' ($TARGET_DB) to $backup_file ..."

    # gzip exits 0 even on empty/truncated input, so `pipefail`'s combined exit code
    # alone can't be trusted - check mysqldump's own exit code via PIPESTATUS, and
    # clean up the partial file on any failure so the backup dir stays trustworthy.
    set +e
    docker exec "$TARGET_CONTAINER" \
        mysqldump --single-transaction --set-gtid-purged=OFF --routines --triggers \
            -u root -p"$TARGET_ROOT_PW" "$TARGET_DB" \
        | gzip > "$backup_file"
    local dump_status="${PIPESTATUS[0]}"
    set -e

    if [[ "$dump_status" -ne 0 ]]; then
        rm -f "$backup_file"
        log_error "mysqldump failed (exit $dump_status) - aborting before touching '$TARGET_PROJECT'"
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
    log "This may take a while depending on database size - please wait."

    # Both mysqldump (source) and mysql (target restore) must succeed - check each
    # stage's exit code explicitly via PIPESTATUS, since the pipeline's combined
    # exit code alone can mask a source-side failure if the target client exits 0.
    set +e
    docker exec "$SOURCE_CONTAINER" \
        mysqldump --single-transaction --set-gtid-purged=OFF --routines --triggers --add-drop-table \
            -u root -p"$SOURCE_ROOT_PW" "$SOURCE_DB" \
        | docker exec -i "$TARGET_CONTAINER" \
            mysql -u root -p"$TARGET_ROOT_PW" "$TARGET_DB"
    local -a pipe_status=("${PIPESTATUS[@]}")
    local dump_status="${pipe_status[0]}"
    local restore_status="${pipe_status[1]}"
    set -e

    if [[ "$dump_status" -ne 0 || "$restore_status" -ne 0 ]]; then
        log_error "Clone failed (mysqldump exit $dump_status, mysql restore exit $restore_status)"
        log_error "'$TARGET_PROJECT' may be left in a partially-restored state - restore from the pre-clone backup in $BACKUP_DIR if needed."
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

    log "Verification - '$table' row count:"
    log "  $SOURCE_PROJECT (source): $source_count"
    log "  $TARGET_PROJECT (target): $target_count"

    if [[ "$source_count" == "$target_count" ]]; then
        log_success "Row counts match - clone looks correct."
    else
        log_warning "Row counts differ! Investigate before trusting '$TARGET_PROJECT'."
        log_warning "A pre-clone backup is available at: $BACKUP_DIR"
    fi
}

resolve_projects() {
    case "$DIRECTION" in
        dev-to-prod)
            SOURCE_PROJECT="kreditozrouti-dev"
            SOURCE_ENV="development"
            TARGET_PROJECT="kreditozrouti"
            TARGET_ENV="production"
            ;;
        prod-to-dev)
            SOURCE_PROJECT="kreditozrouti"
            SOURCE_ENV="production"
            TARGET_PROJECT="kreditozrouti-dev"
            TARGET_ENV="development"
            ;;
        *)
            log_error "Unknown direction: '$DIRECTION'"
            usage
            ;;
    esac

    # Docker Compose auto-names containers as <project>-<service>-<replica>
    # (Compose project names: kreditozrouti / kreditozrouti-dev)
    SOURCE_CONTAINER="${SOURCE_PROJECT}-mysql-1"
    TARGET_CONTAINER="${TARGET_PROJECT}-mysql-1"
}

main() {
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

SOURCE_CREDS="$(load_credentials "$SOURCE_CONTAINER")"
TARGET_CREDS="$(load_credentials "$TARGET_CONTAINER")"
IFS=$'\t' read -r SOURCE_ROOT_PW SOURCE_DB <<< "$SOURCE_CREDS"
IFS=$'\t' read -r TARGET_ROOT_PW TARGET_DB <<< "$TARGET_CREDS"

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
log "Note: Redis/BullMQ queue data was NOT cloned (by design - see script header)."
log "=========================================="

}

main "$@"
