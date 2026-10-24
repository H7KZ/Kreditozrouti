#!/usr/bin/env bash
set -Eeuo pipefail

# ==============================================================================
# Script Name: migrate-infrastructure.sh
# Description: One-off copy of every Infrastructure service's state from the old
#              VPS to the new one. Standalone: needs only this file and docker.
#
#              dump    (old VPS): stops the app containers, dumps the MariaDB and
#                                 PostgreSQL databases, tars the file volumes,
#                                 starts the apps again.
#              restore (new VPS): stops the app containers, loads the dumps and
#                                 replaces the file volumes, starts the apps.
#
# Usage:       sudo ./migrate-infrastructure.sh dump    <dir>
#              sudo ./migrate-infrastructure.sh restore <dir>
#
# Covered: kmk, jirikominek, client-showcase (MariaDB + WordPress files),
#          n8n and wakapi (PostgreSQL), n8n data, trek, uptime-kuma, stash,
#          cli-proxy-api.
# Not covered (on purpose): Traefik certificates (re-issued), CrowdSec state
#          (rebuilt), Stash cache and generated files (regenerable), images.
#
# Secrets are NOT copied. Before restore, GitHub must hold the ORIGINAL values
# and the apps must be redeployed with them, because the restored data depends on:
#          N8N_ENCRYPTION_KEY (n8n credentials), WAKAPI_PASSWORD_SALT (wakapi logins).
#
# Order:   1. Set those secrets in GitHub, deploy the apps on the new host
#             (containers and empty volumes must exist).
#          2. dump on the old host, copy the dump directory to the new host.
#          3. restore on the new host.
#
# Downtime: the Infrastructure apps are stopped for the dump and the restore.
#           Each DB dump and volume tar is taken while the apps are stopped.
#
# Log File: none (stdout only)
# ==============================================================================

SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_NAME
readonly MODE="${1:-}"
DIR="${2:-}"
readonly HELPER_IMAGE="alpine:3.22"

# Compose container_name values from apps/ and apps/wordpress/.
readonly APP_CONTAINERS=(kmk jirikominek client-showcase wakapi n8n n8n-runners trek uptime-kuma stash cli-proxy-api)
readonly MYSQL_CONTAINERS=(kmk-mysql jirikominek-mysql client-showcase-mysql)
readonly POSTGRES_CONTAINERS=(n8n-postgres wakapi-postgres)
# Database volumes are covered by the dumps above, so they are not tarred.
readonly FILE_VOLUMES=(
    kmk-data-volume
    jirikominek-data-volume
    client-showcase-data-volume
    n8n-data-volume
    trek-data-volume
    trek-uploads-volume
    uptime-kuma-data-volume
    cli-proxy-api-config-volume
    cli-proxy-api-data-volume
    stash-config-volume
    stash-data-volume
    stash-metadata-volume
    stash-blobs-volume
)

log() { echo "[$SCRIPT_NAME] $*"; }
log_success() { echo "[$SCRIPT_NAME] OK: $*"; }
log_warning() { echo "[$SCRIPT_NAME] WARNING: $*" >&2; }
log_error() { echo "[$SCRIPT_NAME] ERROR: $*" >&2; }

usage() {
    cat << EOF
Usage: sudo $SCRIPT_NAME dump <dir>
       sudo $SCRIPT_NAME restore <dir>
EOF
    exit 1
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root. Use: sudo $SCRIPT_NAME"
        exit 1
    fi
}

check_args() {
    [[ "$MODE" == dump || "$MODE" == restore ]] || usage
    [[ -n "$DIR" ]] || usage
    DIR="$(realpath -m -- "$DIR")"
}

check_containers() {
    local name
    for name in "${APP_CONTAINERS[@]}" "${MYSQL_CONTAINERS[@]}" "${POSTGRES_CONTAINERS[@]}"; do
        if ! docker container inspect "$name" >/dev/null 2>&1; then
            log_error "Container '$name' does not exist here. Deploy the Infrastructure apps on this host first."
            exit 1
        fi
    done
}

check_volumes() {
    local name
    for name in "${FILE_VOLUMES[@]}"; do
        if ! docker volume inspect "$name" >/dev/null 2>&1; then
            log_error "Volume '$name' does not exist here. Deploy the Infrastructure apps on this host first."
            exit 1
        fi
    done
}

confirm() {
    local word="$1" typed=""
    [[ -t 0 ]] || {
        log_error "Confirmation requires an interactive terminal (stdin is not a TTY). Aborting."
        exit 1
    }
    read -r -p "Type '$word' to continue: " typed || typed=""
    if [[ "$typed" != "$word" ]]; then
        log "Not confirmed. Nothing changed."
        exit 0
    fi
}

stop_apps() {
    log "Stopping app containers ..."
    docker stop "${APP_CONTAINERS[@]}" >/dev/null
}

start_apps() {
    docker start "${APP_CONTAINERS[@]}" >/dev/null || log_warning "Some app containers did not start: check docker ps"
}

# ------------------------------------------------------------------------------
# dump (old host)
# ------------------------------------------------------------------------------

dump_mysql() {
    local name="$1"
    log "MariaDB dump: $name ..."
    # shellcheck disable=SC2016 # expands inside the container, not on the host
    docker exec "$name" sh -c 'export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"; exec mariadb-dump --user=root --databases "$MYSQL_DATABASE" --single-transaction --routines --triggers' > "$DIR/$name.sql"
}

dump_postgres() {
    local name="$1"
    log "PostgreSQL dump: $name ..."
    # shellcheck disable=SC2016 # expands inside the container, not on the host
    docker exec "$name" sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" exec pg_dump --format=custom --username="$POSTGRES_USER" "$POSTGRES_DB"' > "$DIR/$name.dump"
}

dump_volume() {
    local volume="$1"
    log "Volume tar: $volume ..."
    docker run --rm -v "$volume:/src:ro" -v "$DIR:/out" "$HELPER_IMAGE" tar -C /src -czf "/out/$volume.tar.gz" .
}

do_dump() {
    check_containers
    check_volumes
    mkdir -p "$DIR"
    chmod 700 "$DIR"
    confirm dump

    log "Stops the app containers for the copy; they are started again on exit."
    trap start_apps EXIT
    stop_apps

    local name volume
    for name in "${MYSQL_CONTAINERS[@]}"; do
        dump_mysql "$name"
    done
    for name in "${POSTGRES_CONTAINERS[@]}"; do
        dump_postgres "$name"
    done
    for volume in "${FILE_VOLUMES[@]}"; do
        dump_volume "$volume"
    done

    (cd "$DIR" && sha256sum -- * > SHA256SUMS)
    log "Dump sizes:"
    du -h "$DIR"/* | sed 's/^/  /'
    log_success "Dump written to $DIR. Copy the whole directory to the new host, then run restore."
}

# ------------------------------------------------------------------------------
# restore (new host)
# ------------------------------------------------------------------------------

verify_dump() {
    local name volume
    [[ -f "$DIR/SHA256SUMS" ]] || {
        log_error "No SHA256SUMS in $DIR. Copy the complete dump directory from the old host first."
        exit 1
    }
    (cd "$DIR" && sha256sum -c --quiet SHA256SUMS) || {
        log_error "Checksum mismatch in $DIR. Aborting before anything is stopped."
        exit 1
    }
    for name in "${MYSQL_CONTAINERS[@]}"; do
        [[ -s "$DIR/$name.sql" ]] || { log_error "Missing dump: $DIR/$name.sql"; exit 1; }
    done
    for name in "${POSTGRES_CONTAINERS[@]}"; do
        [[ -s "$DIR/$name.dump" ]] || { log_error "Missing dump: $DIR/$name.dump"; exit 1; }
    done
    for volume in "${FILE_VOLUMES[@]}"; do
        [[ -s "$DIR/$volume.tar.gz" ]] || { log_error "Missing volume tar: $DIR/$volume.tar.gz"; exit 1; }
    done
}

ensure_databases_running() {
    docker start "${MYSQL_CONTAINERS[@]}" "${POSTGRES_CONTAINERS[@]}" >/dev/null
}

restore_mysql() {
    local name="$1"
    log "Loading MariaDB: $name ..."
    # The old server's GTID position cannot be replayed on the new one, so drop that statement.
    # shellcheck disable=SC2016 # expands inside the container, not on the host
    sed '/GTID_PURGED/d' "$DIR/$name.sql" |
        docker exec -i "$name" sh -c 'export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"; exec mariadb --user=root'
}

restore_postgres() {
    local name="$1"
    log "Loading PostgreSQL: $name ..."
    # Empty the schema first: the new deploy's first start already ran the app migrations.
    # shellcheck disable=SC2016 # expands inside the container, not on the host
    docker exec "$name" sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" exec psql --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" -v ON_ERROR_STOP=1 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"'
    # shellcheck disable=SC2016 # expands inside the container, not on the host
    docker exec -i "$name" sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" exec pg_restore --no-owner --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' < "$DIR/$name.dump"
}

restore_volume() {
    local volume="$1"
    log "Volume restore: $volume ..."
    # Clears the volume first, so the result is exactly the dumped contents.
    # shellcheck disable=SC2016 # runs inside the helper container
    docker run --rm -v "$volume:/dst" -v "$DIR:/in:ro" "$HELPER_IMAGE" \
        sh -c 'find /dst -mindepth 1 -delete && tar -C /dst -xzf "/in/$1.tar.gz"' sh "$volume"
}

do_restore() {
    check_containers
    check_volumes
    verify_dump
    confirm restore

    trap 'log_error "Restore failed. App containers are left STOPPED. Fix the error and rerun, or start them with: docker start ${APP_CONTAINERS[*]}"' ERR

    local name volume
    ensure_databases_running
    stop_apps
    for name in "${MYSQL_CONTAINERS[@]}"; do
        restore_mysql "$name"
    done
    for name in "${POSTGRES_CONTAINERS[@]}"; do
        restore_postgres "$name"
    done
    for volume in "${FILE_VOLUMES[@]}"; do
        restore_volume "$volume"
    done
    start_apps
    trap - ERR

    log "=========================================="
    log_success "Restore done. Apps are started."
    log "Next:"
    log "  1. Check each hostname in a browser (jankominek.com, jirikominek.cz, showcase, kmk, wakapi, trek, vault, n8n, ai, status)."
    log "  2. docker logs traefik 2>&1 | grep -i acme   (certificates re-issue on first request)."
    log "  3. Shred the dump directory on both hosts: find $DIR -type f -exec shred -u {} +"
    log "=========================================="
}

check_root
check_args

case "$MODE" in
    dump) do_dump ;;
    restore) do_restore ;;
esac
