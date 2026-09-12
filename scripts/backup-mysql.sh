#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script Name: backup-mysql.sh
# Description: Dumps the deployed MySQL database (mysqldump, gzip'd) to a local
#              backup directory, optionally replicates it off-site, prunes old
#              dumps, and writes Prometheus textfile metrics describing the run.
#              Installed as a daily systemd timer by setup-automation.sh
#              (kreditozrouti-mysql-backup.timer); can also be run by hand.
#
#              Every course, schedule and user row only exists in that one MySQL
#              volume. This script is the only thing standing between a disk
#              failure and losing all of it.
#
# Usage:       ./backup-mysql.sh [environment]
#              environment defaults to "production".
#
# Location:    lives in scripts/, not deployment/. scripts/** is synced to
#              ~/scripts on every push by .github/workflows/sync-scripts.yml, so
#              the absolute path baked into the systemd unit stays stable.
#              deployment/ lands in per-version directories that deploy.sh prunes
#              after 7 days, which would break the unit.
#
# Credentials: never touch the host environment. MYSQL_ROOT_PASSWORD and
#              MYSQL_DATABASE are read INSIDE the mysql container from its own
#              env (the same vars docker-compose.<env>.yml already sets), via
#              `docker compose exec -T`.
#
# Environment variables (all optional):
#   BACKUP_RETENTION_DAYS   Delete dumps older than this many days (default: 14)
#   BACKUP_MIN_KEEP         Never prune below this many dumps (default: 5)
#   BACKUP_REMOTE           rclone remote path for off-site replication, e.g.
#                           "storagebox:kreditozrouti/production". Unset means
#                           off-site replication is SKIPPED and the script says so
#                           on every run. rclone reads its own credentials from
#                           ~/.config/rclone/rclone.conf, so no secret ever passes
#                           through this script or its environment.
#   BACKUP_COMPOSE_PROJECT  Compose project name (-p). Defaults to
#                           "kreditozrouti" for production and
#                           "kreditozrouti-dev" otherwise, matching the values
#                           .github/workflows/ passes to deploy.sh.
#   BACKUP_TEXTFILE_DIR     Prometheus textfile collector directory
#                           (default: /var/lib/kreditozrouti/textfile-collector)
#
# Off-site:    a local dump protects against dump corruption and accidental
#              deletion. It does NOT protect against losing the VPS, which is the
#              failure this database cannot survive - one server, one volume.
#              BACKUP_REMOTE set but rclone missing, or the copy failing, is an
#              ERROR and not a skip: "off-site backups are configured" and
#              "off-site backups are happening" must never be able to disagree
#              quietly.
#
# Metrics:     written atomically (temp file + mv) to
#              $BACKUP_TEXTFILE_DIR/mysql-backup.prom on EVERY run, failures
#              included, so the collector never reads a half-written file:
#
#                kreditozrouti_backup_last_success_timestamp_seconds{environment}
#                    gauge, unix seconds, updated ONLY on a fully successful run.
#                    A failed run carries the previous value forward (0 if none
#                    has ever succeeded) so success-staleness alerts still fire.
#                kreditozrouti_backup_last_attempt_timestamp_seconds{environment}
#                    gauge, unix seconds, updated on every run.
#                kreditozrouti_backup_last_duration_seconds{environment}
#                    gauge, wall-clock seconds of this run.
#                kreditozrouti_backup_size_bytes{environment}
#                    gauge, size of the dump written by this run (0 if none was).
#                kreditozrouti_backup_offsite_replicated{environment}
#                    gauge, 1 if the dump was replicated and verified off-site
#                    this run, 0 if BACKUP_REMOTE is unset or replication failed.
#
#              Samples carrying a different `environment` label are preserved
#              from the existing file, so production and development runs sharing
#              one collector directory do not clobber each other.
#
# Requirements:
#   - Docker with the compose plugin, and the stack already deployed
#   - Write access to $BACKUP_TEXTFILE_DIR (the systemd unit runs as root)
#   - rclone, only when BACKUP_REMOTE is set
# ==============================================================================

# ------------------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------------------

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly ENVIRONMENT="${1:-production}"
readonly VERSION_DIR="$HOME/kreditozrouti/versions/$ENVIRONMENT/current"
readonly BACKUP_DIR="$HOME/kreditozrouti/backups/$ENVIRONMENT"
readonly RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
readonly MIN_KEEP="${BACKUP_MIN_KEEP:-5}"
readonly REMOTE="${BACKUP_REMOTE:-}"
readonly TEXTFILE_DIR="${BACKUP_TEXTFILE_DIR:-/var/lib/kreditozrouti/textfile-collector}"
readonly METRICS_FILE="$TEXTFILE_DIR/mysql-backup.prom"

# deploy.sh is invoked as `deploy.sh <project_name> <environment>`, and its
# callers in .github/workflows/ pass "kreditozrouti" for production and
# "kreditozrouti-dev" for everything else. `docker compose exec` only finds the
# containers when -p matches, so mirror that default here.
if [[ "$ENVIRONMENT" == "production" ]]; then
    readonly COMPOSE_PROJECT="${BACKUP_COMPOSE_PROJECT:-kreditozrouti}"
else
    readonly COMPOSE_PROJECT="${BACKUP_COMPOSE_PROJECT:-kreditozrouti-dev}"
fi

# Mutable run state, read back by write_metrics() from the exit trap.
START_TS="$(date +%s)"
RUN_SUCCEEDED=false
BACKUP_SIZE=0
OFFSITE_REPLICATED=0

source "$SCRIPT_DIR/lib.sh"

# ------------------------------------------------------------------------------
# Metrics
# ------------------------------------------------------------------------------

# Reads the last success timestamp for THIS environment out of the existing
# metrics file. A failing run must carry it forward unchanged: if a failure reset
# it to "now", the staleness alert this whole block exists for would never fire.
previous_success_ts() {
    local value=""

    if [[ -f "$METRICS_FILE" ]]; then
        value="$(grep -F "kreditozrouti_backup_last_success_timestamp_seconds{environment=\"$ENVIRONMENT\"}" \
            "$METRICS_FILE" 2>/dev/null | tail -n 1 | awk '{print $NF}')" || true
    fi

    if [[ "$value" =~ ^[0-9]+$ ]]; then
        echo "$value"
    else
        echo 0
    fi
}

# Samples of one metric belonging to some OTHER environment, echoed back verbatim
# so a development run does not erase production's series (and vice versa).
foreign_samples() {
    local metric="$1"

    [[ -f "$METRICS_FILE" ]] || return 0

    grep -F "${metric}{" "$METRICS_FILE" 2>/dev/null \
        | grep -v -F "environment=\"$ENVIRONMENT\"" || true
}

emit_metric() {
    local name="$1" help="$2" value="$3"

    echo "# HELP $name $help"
    echo "# TYPE $name gauge"
    echo "${name}{environment=\"$ENVIRONMENT\"} $value"
    foreign_samples "$name"
}

# Writes the whole metrics file atomically: a temp file in the same directory,
# then mv, so the textfile collector can never read a partial scrape.
write_metrics() {
    local end_ts duration success_ts tmp_file
    end_ts="$(date +%s)"
    duration=$(( end_ts - START_TS ))
    tmp_file="$METRICS_FILE.tmp"

    if [[ "$RUN_SUCCEEDED" == true ]]; then
        success_ts="$end_ts"
    else
        success_ts="$(previous_success_ts)"
    fi

    if ! {
        emit_metric kreditozrouti_backup_last_success_timestamp_seconds \
            "Unix timestamp of the last fully successful Kreditozrouti MySQL backup run." \
            "$success_ts"
        emit_metric kreditozrouti_backup_last_attempt_timestamp_seconds \
            "Unix timestamp of the last Kreditozrouti MySQL backup attempt, successful or not." \
            "$end_ts"
        emit_metric kreditozrouti_backup_last_duration_seconds \
            "Wall-clock duration in seconds of the last Kreditozrouti MySQL backup run." \
            "$duration"
        emit_metric kreditozrouti_backup_size_bytes \
            "Size in bytes of the dump written by the last Kreditozrouti MySQL backup run." \
            "$BACKUP_SIZE"
        emit_metric kreditozrouti_backup_offsite_replicated \
            "1 if the last Kreditozrouti MySQL backup run replicated its dump off-site, 0 otherwise." \
            "$OFFSITE_REPLICATED"
    } > "$tmp_file"; then
        log_error "Could not write backup metrics to $tmp_file - Prometheus will keep serving stale values."
        rm -f "$tmp_file"
        return 0
    fi

    chmod 0644 "$tmp_file" 2>/dev/null || true

    if ! mv -f "$tmp_file" "$METRICS_FILE"; then
        log_error "Could not move backup metrics into place at $METRICS_FILE."
        rm -f "$tmp_file"
        return 0
    fi

    return 0
}

# Every exit path writes metrics, then re-raises the original status so systemd
# still records the failure.
on_exit() {
    local rc=$?
    write_metrics
    exit "$rc"
}

# ------------------------------------------------------------------------------
# Backup
# ------------------------------------------------------------------------------

main() {
    if [[ ! -d "$VERSION_DIR" ]]; then
        log_error "No deployed version found at $VERSION_DIR - has $ENVIRONMENT ever been deployed?"
        exit 1
    fi

    # Layout inside a version directory mirrors deployment/ (see deploy.sh): the
    # compose files live under <environment>/, the generated .env at the root.
    local compose_file="$VERSION_DIR/$ENVIRONMENT/docker-compose.$ENVIRONMENT.yml"
    local networks_config="$VERSION_DIR/$ENVIRONMENT/networks.yml"
    local volumes_config="$VERSION_DIR/$ENVIRONMENT/volumes.yml"
    local env_file="$VERSION_DIR/.env"
    validate_files "$compose_file" "$networks_config" "$volumes_config" "$env_file"

    mkdir -p "$BACKUP_DIR"

    local stamp
    stamp="$(date +'%Y%m%dT%H%M%S')"
    local out_file="$BACKUP_DIR/kreditozrouti-$ENVIRONMENT-$stamp.sql.gz"
    local tmp_file="$out_file.part"

    log "Dumping $ENVIRONMENT MySQL (compose project $COMPOSE_PROJECT) to $out_file ..."
    if ! docker compose \
        -p "$COMPOSE_PROJECT" \
        --env-file "$env_file" \
        -f "$networks_config" \
        -f "$volumes_config" \
        -f "$compose_file" \
        exec -T mysql sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers "$MYSQL_DATABASE"' \
        | gzip > "$tmp_file"; then
        log_error "mysqldump failed - leaving no partial backup behind."
        rm -f "$tmp_file"
        exit 1
    fi

    mv "$tmp_file" "$out_file"
    BACKUP_SIZE="$(stat -c %s "$out_file")"
    log_success "Backup written: $out_file ($(du -h "$out_file" | cut -f1))"

    replicate_offsite "$out_file"
    prune_old_backups

    RUN_SUCCEEDED=true
    log_success "Backup run complete for $ENVIRONMENT."
}

# Copies one dump to the configured rclone remote and confirms it arrived.
#
# A missing rclone with BACKUP_REMOTE set is an ERROR, not a skip. The local dump
# is already safe on disk by this point, so failing here loses nothing, but it
# does stop the success timestamp from advancing.
replicate_offsite() {
    local file="$1"
    local name
    name="$(basename "$file")"

    if [[ -z "$REMOTE" ]]; then
        log "Off-site replication: not configured (BACKUP_REMOTE unset) - this dump exists ONLY on this VPS."
        OFFSITE_REPLICATED=0
        return 0
    fi

    if ! command -v rclone >/dev/null 2>&1; then
        log_error "BACKUP_REMOTE is set to '$REMOTE' but rclone is not installed - nothing was replicated off-site."
        exit 1
    fi

    log "Replicating $name to $REMOTE ..."
    if ! rclone copyto "$file" "$REMOTE/$name"; then
        log_error "rclone copy to $REMOTE failed - the local dump is intact, but there is no off-site copy of it."
        exit 1
    fi

    # Presence check: `rclone copyto` verifies the transfer, but this also catches
    # a remote path that silently resolves somewhere other than intended.
    if ! rclone lsf "$REMOTE/$name" >/dev/null 2>&1; then
        log_error "Replicated $name but it is not listable at $REMOTE/$name - check the remote path."
        exit 1
    fi

    OFFSITE_REPLICATED=1
    log_success "Off-site copy verified: $REMOTE/$name"
}

# Deletes dumps older than RETENTION_DAYS, but never drops below MIN_KEEP files -
# mirrors deploy.sh's cleanup_old_versions so a retention bug cannot empty the
# backup directory outright.
prune_old_backups() {
    local all_backups=()
    while IFS= read -r -d '' file; do
        all_backups+=("$file")
    done < <(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'kreditozrouti-*.sql.gz' -printf '%T@\t%p\0' | sort -z | cut -z -f2-)

    local total=${#all_backups[@]}
    local deleted=0

    for file in "${all_backups[@]}"; do
        local age_days
        age_days=$(( ($(date +%s) - $(stat -c %Y "$file")) / 86400 ))

        if [[ $age_days -gt $RETENTION_DAYS ]] && [[ $((total - deleted)) -gt $MIN_KEEP ]]; then
            log "Removing old backup: $(basename "$file") (${age_days}d old)"
            rm -f "$file"
            ((deleted++)) || true
        fi
    done

    if [[ $deleted -gt 0 ]]; then
        log "Pruned $deleted old backup(s), kept $((total - deleted))"
    else
        log "Backup retention: $total kept, nothing pruned"
    fi
}

# ------------------------------------------------------------------------------
# Entry point
# ------------------------------------------------------------------------------

if ! mkdir -p "$TEXTFILE_DIR"; then
    log_error "Cannot create textfile collector directory $TEXTFILE_DIR."
    log_error "Run as root, or point BACKUP_TEXTFILE_DIR at a writable directory."
    exit 1
fi

trap on_exit EXIT

main "$@"
