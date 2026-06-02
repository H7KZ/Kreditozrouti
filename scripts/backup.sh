#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script Name: backup.sh
# Description: Creates a gzip-compressed MySQL dump via docker exec.
#              Designed to run as a cron job (installed by bootstrap.sh).
#              Does not require MySQL credentials in server.conf — the container
#              already has them as environment variables.
#
# Usage:       bash ./backup.sh
# Cron:        0 2 * * * bash /path/to/scripts/backup.sh >> ~/logs/backup.log 2>&1
#
# Required variables (server.conf):
#   MYSQL_CONTAINER         Running container name (docker ps --format '{{.Names}}')
#   BACKUP_DIR              Directory to store .sql.gz files
#   BACKUP_RETENTION_DAYS   Delete backups older than this many days
# ==============================================================================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_NAME="$(basename "$0")"
readonly TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"

source "$SCRIPT_DIR/lib.sh"

main() {
    readonly CONFIG_FILE="$SCRIPT_DIR/server.conf"
    if [[ -f "$CONFIG_FILE" ]]; then
        # shellcheck source=/dev/null
        source "$CONFIG_FILE"
    fi

    [[ -z "${MYSQL_CONTAINER:-}" ]]        && { log_error "MYSQL_CONTAINER not set — add to server.conf";        exit 1; }
    [[ -z "${BACKUP_DIR:-}" ]]             && { log_error "BACKUP_DIR not set — add to server.conf";             exit 1; }
    [[ -z "${BACKUP_RETENTION_DAYS:-}" ]]  && { log_error "BACKUP_RETENTION_DAYS not set — add to server.conf";  exit 1; }

    mkdir -p "$BACKUP_DIR"

    local backup_file="$BACKUP_DIR/$TIMESTAMP.sql.gz"

    log "Starting MySQL backup..."
    log "Container: $MYSQL_CONTAINER"
    log "Output:    $backup_file"

    if ! docker ps --format '{{.Names}}' | grep -q "^${MYSQL_CONTAINER}$"; then
        log_error "Container '$MYSQL_CONTAINER' is not running."
        exit 1
    fi

    docker exec "$MYSQL_CONTAINER" sh -c \
        'exec mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' \
        | gzip > "$backup_file"

    local size
    size=$(du -sh "$backup_file" | cut -f1)
    log_success "Backup complete: $backup_file ($size)"

    log "Removing backups older than $BACKUP_RETENTION_DAYS days..."
    find "$BACKUP_DIR" -name "*.sql.gz" -mtime +"$BACKUP_RETENTION_DAYS" -delete
    log "Retention cleanup done."
}

main
