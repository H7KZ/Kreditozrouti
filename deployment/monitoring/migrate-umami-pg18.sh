#!/usr/bin/env bash
# One-time migration for kreditozrouti-umami-postgres-volume onto the postgres 18+
# data layout (docker-library/postgres#1259). Run this on the host BEFORE deploying
# a docker-compose.monitoring.yml that mounts the volume at /var/lib/postgresql
# (rather than /var/lib/postgresql/data).
#
# Background: postgres 18+ images default PGDATA to /var/lib/postgresql/<major>/docker
# and refuse to start if they find a PG_VERSION file at a legacy location instead
# (by design - they never silently reinitialize over data they don't recognize).
# kreditozrouti-umami-postgres-volume was initialized under an older image at the
# flat pre-18 layout, so it needs an actual migration, not just a mount-path change.
#
# This uses pg_dumpall + restore rather than pg_upgrade: the Alpine postgres images
# ship only one major version's binaries each, so pg_upgrade isn't available without
# a third-party dual-version image. Dump/restore has no such dependency.
#
# ALWAYS run step 1 (diagnose) first and read its output before doing anything else.
# Wiping real analytics data is unrecoverable; there is no cost to double-checking.
#
# Usage:
#   ./migrate-umami-pg18.sh diagnose   # inspect the volume, decide real-data vs empty
#   ./migrate-umami-pg18.sh migrate    # case A: dump old cluster, rebuild, restore
#   ./migrate-umami-pg18.sh clean      # case B: confirmed no real data, wipe + fresh init
set -euo pipefail

VOLUME=kreditozrouti-umami-postgres-volume
PROJECT=kreditozrouti-monitoring
OLD_MAJOR=${OLD_MAJOR:-16}   # the major version the volume's flat data was written under
DUMP_DIR="$(pwd)/pg-migration"

cmd="${1:-}"

diagnose() {
  echo "==> Listing volume root:"
  docker run --rm -v "$VOLUME":/v alpine ls -la /v
  echo
  echo "==> If PG_VERSION/base/pg_wal are listed directly above (no version subdir),"
  echo "    this is a real flat pre-18 cluster -> run '$0 migrate'."
  echo "==> If it's empty, or only has version-numbered subdirs with tiny/no content,"
  echo "    confirm size with: docker run --rm -v $VOLUME:/v alpine du -sh /v/* 2>/dev/null"
  echo "    A genuine cluster is tens of MB; an empty dir is a few KB. Then run '$0 clean'."
  echo "==> If still unsure, STOP and ask - do not guess."
}

require_env() {
  : "${UMAMI_DB_USER:?set UMAMI_DB_USER}"
  : "${UMAMI_DB_PASSWORD:?set UMAMI_DB_PASSWORD}"
  : "${UMAMI_DB_NAME:?set UMAMI_DB_NAME}"
}

migrate() {
  require_env
  mkdir -p "$DUMP_DIR"

  echo "==> Stopping umami + umami-db..."
  docker compose -p "$PROJECT" -f docker-compose.monitoring.yml stop umami umami-db || true

  echo "==> Dumping old cluster (postgres:${OLD_MAJOR}-alpine, flat layout at .../data)..."
  docker run --rm \
    -v "$VOLUME":/var/lib/postgresql/data \
    -v "$DUMP_DIR":/dump \
    -e POSTGRES_USER="$UMAMI_DB_USER" -e POSTGRES_PASSWORD="$UMAMI_DB_PASSWORD" -e POSTGRES_DB="$UMAMI_DB_NAME" \
    --entrypoint sh "postgres:${OLD_MAJOR}-alpine" -c '
      docker-entrypoint.sh postgres &
      pid=$!
      until pg_isready -U "$POSTGRES_USER" -h 127.0.0.1 >/dev/null 2>&1; do sleep 1; done
      pg_dumpall -U "$POSTGRES_USER" -h 127.0.0.1 > /dump/dumpall.sql
      kill "$pid"; wait "$pid" 2>/dev/null || true
    '

  size=$(wc -c < "$DUMP_DIR/dumpall.sql")
  echo "==> Dump written to $DUMP_DIR/dumpall.sql ($size bytes)."
  echo "==> STOP: confirm this file has real Umami data (not just schema boilerplate)"
  echo "    before continuing. Press Enter to proceed, or Ctrl+C to abort."
  read -r _

  echo "==> Backing up the volume as-is (rollback point)..."
  docker volume create "${VOLUME}-pg-old" >/dev/null
  docker run --rm -v "$VOLUME":/from -v "${VOLUME}-pg-old":/to alpine sh -c 'cp -a /from/. /to/'

  echo "==> Wiping volume to init a fresh pg18 cluster..."
  docker run --rm -v "$VOLUME":/v alpine sh -c 'rm -rf /v/*'

  echo "==> Initializing fresh pg18 cluster at the new layout, then restoring dump..."
  docker run --rm \
    -v "$VOLUME":/var/lib/postgresql \
    -v "$DUMP_DIR":/dump:ro \
    -e POSTGRES_USER="$UMAMI_DB_USER" -e POSTGRES_PASSWORD="$UMAMI_DB_PASSWORD" -e POSTGRES_DB="$UMAMI_DB_NAME" \
    --entrypoint sh postgres:18-alpine -c '
      docker-entrypoint.sh postgres &
      pid=$!
      until pg_isready -U "$POSTGRES_USER" -h 127.0.0.1 >/dev/null 2>&1; do sleep 1; done
      psql -U "$POSTGRES_USER" -h 127.0.0.1 -d postgres -v ON_ERROR_STOP=1 -f /dump/dumpall.sql
      kill "$pid"; wait "$pid" 2>/dev/null || true
    '

  echo "==> Done. Bring the stack up and verify Umami shows historical data:"
  echo "    docker compose -p $PROJECT -f docker-compose.monitoring.yml up -d umami-db umami"
  echo "==> Only after verifying, remove the rollback volume:"
  echo "    docker volume rm ${VOLUME}-pg-old"
}

clean() {
  echo "==> This wipes $VOLUME. Only run this after 'diagnose' confirmed no real data."
  echo "    Press Enter to proceed, or Ctrl+C to abort."
  read -r _
  docker compose -p "$PROJECT" -f docker-compose.monitoring.yml stop umami umami-db || true
  docker run --rm -v "$VOLUME":/v alpine sh -c 'rm -rf /v/*'
  docker run --rm -v "$VOLUME":/v alpine ls -la /v
  echo "==> Volume emptied. Redeploy - postgres 18 will init a clean cluster at the new layout."
}

case "$cmd" in
  diagnose) diagnose ;;
  migrate) migrate ;;
  clean) clean ;;
  *) echo "Usage: $0 {diagnose|migrate|clean}"; exit 1 ;;
esac
