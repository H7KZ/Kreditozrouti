#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# migrate-naming.sh — one-time data migration for the cross-repo naming refactor.
#
# Renaming an `external` Docker volume makes Compose create a NEW EMPTY volume and
# orphan the old (populated) one. This copies each renamed volume's data from its
# old name to its new name BEFORE you redeploy with the new config.
#
# Idempotent and guarded: skips volumes whose old name is gone or whose new name
# already has data; never deletes anything unless --prune-old is passed.
#
# Run on the VPS, from deployment/, BEFORE deploying the renamed stacks:
#   bash migrate-naming.sh            # migrate volume data (all stacks)
#   bash migrate-naming.sh --dry-run  # print what it would do
#   bash migrate-naming.sh --prune-old   # remove OLD nets+vols (after verify)
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"

DRY_RUN=0
PRUNE_OLD=0
for arg in "$@"; do
    case "$arg" in
        --dry-run)   DRY_RUN=1 ;;
        --prune-old) PRUNE_OLD=1 ;;
        *) log_error "Unknown arg: $arg (use --dry-run | --prune-old)"; exit 1 ;;
    esac
done

# old_volume_name  new_volume_name
VOLUME_RENAMES=(
    "mysql-data-volume        kreditozrouti-mysql-volume-prod"
    "redis-data-volume        kreditozrouti-redis-volume-prod"
    "mysql-data-dev-volume    kreditozrouti-mysql-volume-dev"
    "redis-data-dev-volume    kreditozrouti-redis-volume-dev"
    "prometheus-data          kreditozrouti-prometheus-volume"
    "grafana-data             kreditozrouti-grafana-volume"
    "loki-data                kreditozrouti-loki-volume"
    "alloy-data               kreditozrouti-alloy-volume"
    "umami-postgres-data      kreditozrouti-umami-postgres-volume"
)

# old_network_name  new_network_name  (data-less; recreated by deploy. Listed so
# --prune-old can remove the stale old ones after cutover.)
NETWORK_RENAMES=(
    "mysql-network        kreditozrouti-mysql-network-prod"
    "redis-network        kreditozrouti-redis-network-prod"
    "mysql-dev-network    kreditozrouti-mysql-network-dev"
    "redis-dev-network    kreditozrouti-redis-network-dev"
    "alloy-network        kreditozrouti-monitoring-network"
    "monitoring-network   kreditozrouti-monitoring-internal-network"
)

vol_exists()   { docker volume inspect "$1" >/dev/null 2>&1; }
vol_has_data() { [[ -n "$(docker run --rm -v "$1":/v alpine sh -c 'ls -A /v 2>/dev/null' || true)" ]]; }

migrate_volume() {
    local old="$1" new="$2"
    if ! vol_exists "$old"; then log "  skip (no old volume): $old"; return 0; fi
    if vol_exists "$new" && vol_has_data "$new"; then
        log "  skip (new already populated): $new"; return 0
    fi
    if [[ $DRY_RUN -eq 1 ]]; then log "  would migrate: $old -> $new"; return 0; fi
    log "  migrating: $old -> $new"
    docker volume create "$new" >/dev/null
    docker run --rm -v "$old":/from:ro -v "$new":/to alpine sh -c 'cp -a /from/. /to/' >/dev/null
    if vol_has_data "$new"; then
        log_success "  migrated:  $old -> $new"
    else
        log_error "  MIGRATION FAILED (new volume empty): $new"; exit 1
    fi
}

prune_old() {
    local pair old
    log "Pruning OLD volumes (rollback point — only after verifying the new stacks)…"
    for pair in "${VOLUME_RENAMES[@]}"; do
        read -r old _ <<<"$pair"
        vol_exists "$old" || continue
        if [[ $DRY_RUN -eq 1 ]]; then log "  would rm volume: $old"; continue; fi
        docker volume rm "$old" >/dev/null && log "  removed volume: $old" || \
            log_warning"  could not remove volume (in use?): $old"
    done
    log "Pruning OLD networks…"
    for pair in "${NETWORK_RENAMES[@]}"; do
        read -r old _ <<<"$pair"
        docker network inspect "$old" >/dev/null 2>&1 || continue
        if [[ $DRY_RUN -eq 1 ]]; then log "  would rm network: $old"; continue; fi
        docker network rm "$old" >/dev/null && log "  removed network: $old" || \
            log_warning"  could not remove network (in use?): $old"
    done
}

main() {
    if [[ $PRUNE_OLD -eq 1 ]]; then
        prune_old; log_success "Old-resource prune done."; return 0
    fi
    log "── Volume data migration (naming refactor) ──────────────────"
    local pair old new
    for pair in "${VOLUME_RENAMES[@]}"; do
        read -r old new <<<"$pair"
        migrate_volume "$old" "$new"
    done
    log_success "Volume migration done. Deploy the renamed stacks, verify, then:"
    log "  bash migrate-naming.sh --prune-old   # after ~7 days / once happy"
}

main
