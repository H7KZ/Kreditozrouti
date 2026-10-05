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
# Stops containers directly with `docker stop`/`docker start` by name, not
# `docker compose`, since compose here needs DOMAIN/PROJECT/etc. exported and
# -f networks.yml -f volumes.yml alongside the main file (see deploy.sh) - easy
# to get wrong and silently no-op ("invalid compose project").
#
# ALWAYS run 'diagnose' first and read its output before doing anything else.
# Wiping real analytics data is unrecoverable; there is no cost to double-checking.
#
# Usage:
#   ./migrate-umami-pg18.sh diagnose   # inspect the volume, decide real-data vs empty
#   ./migrate-umami-pg18.sh migrate    # case A: dump old cluster, rebuild, restore
#   ./migrate-umami-pg18.sh clean      # case B: confirmed no real data, wipe + fresh init
set -euo pipefail

VOLUME=kreditozrouti-umami-postgres-volume
UMAMI_CONTAINER=kreditozrouti-monitoring-umami-1
UMAMI_DB_CONTAINER=kreditozrouti-monitoring-umami-db-1
OLD_MAJOR=${OLD_MAJOR:-16}   # the major version the volume's flat data was written under
DUMP_DIR="$(pwd)/pg-migration"

cmd="${1:-}"

stop_containers() {
  echo "==> Stopping $UMAMI_CONTAINER and $UMAMI_DB_CONTAINER (if running)..."
  docker stop "$UMAMI_CONTAINER" "$UMAMI_DB_CONTAINER" 2>/dev/null || true
  # Belt and suspenders: bail if anything is still using the volume.
  using=$(docker ps -q --filter "volume=$VOLUME")
  if [[ -n "$using" ]]; then
    echo "ERROR: containers are still attached to $VOLUME:" >&2
    docker ps --filter "volume=$VOLUME" >&2
    exit 1
  fi
}

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
  : "${UMAMI_DB_USER:?set UMAMI_DB_USER (source your .env first: set -a; source .env; set +a)}"
  : "${UMAMI_DB_PASSWORD:?set UMAMI_DB_PASSWORD}"
  : "${UMAMI_DB_NAME:?set UMAMI_DB_NAME}"
}

# Dumps the OLD cluster (mounted flat at /var/lib/postgresql/data) via the local
# Unix socket - not -h 127.0.0.1 - so it hits pg_hba's "local ... trust" rule
# instead of needing password auth over TCP (POSTGRES_PASSWORD is only consulted
# by initdb on first run, never by psql/pg_dumpall - that reads $PGPASSWORD, which
# this deliberately does not set, relying on trust instead).
dump_old_cluster() {
  local name=umami-pg-dump-tmp
  docker rm -f "$name" >/dev/null 2>&1 || true

  echo "==> Starting old cluster (postgres:${OLD_MAJOR}-alpine) read-only for dumping..."
  docker run -d --name "$name" \
    -v "$VOLUME":/var/lib/postgresql/data \
    -e POSTGRES_USER="$UMAMI_DB_USER" -e POSTGRES_PASSWORD="$UMAMI_DB_PASSWORD" -e POSTGRES_DB="$UMAMI_DB_NAME" \
    "postgres:${OLD_MAJOR}-alpine" >/dev/null

  echo "==> Waiting for it to accept connections..."
  ready=0
  for _ in $(seq 1 30); do
    if docker exec "$name" pg_isready -U "$UMAMI_DB_USER" >/dev/null 2>&1; then
      ready=1
      break
    fi
    sleep 1
  done
  if [[ "$ready" -ne 1 ]]; then
    echo "ERROR: old cluster never became ready. Logs:" >&2
    docker logs "$name" >&2
    docker rm -f "$name" >/dev/null 2>&1 || true
    exit 1
  fi

  echo "==> Running pg_dumpall over the local socket..."
  mkdir -p "$DUMP_DIR"
  if ! docker exec -u postgres "$name" pg_dumpall -U "$UMAMI_DB_USER" > "$DUMP_DIR/dumpall.sql"; then
    echo "ERROR: pg_dumpall failed. Container logs:" >&2
    docker logs "$name" >&2
    docker rm -f "$name" >/dev/null 2>&1 || true
    exit 1
  fi

  docker rm -f "$name" >/dev/null 2>&1 || true

  size=$(wc -c < "$DUMP_DIR/dumpall.sql")
  lines=$(wc -l < "$DUMP_DIR/dumpall.sql")
  echo "==> Dump written to $DUMP_DIR/dumpall.sql ($size bytes, $lines lines)."
  if [[ "$size" -lt 1000 ]]; then
    echo "ERROR: dump looks empty/too small - refusing to continue. Inspect $DUMP_DIR/dumpall.sql by hand." >&2
    exit 1
  fi
  if ! grep -q "^COPY\|^INSERT" "$DUMP_DIR/dumpall.sql"; then
    echo "WARNING: dump has no COPY/INSERT lines - it may only contain schema/role boilerplate, no rows." >&2
    echo "Inspect $DUMP_DIR/dumpall.sql before continuing. Press Enter to proceed anyway, or Ctrl+C to abort."
    read -r _
  fi
}

migrate() {
  require_env
  stop_containers
  dump_old_cluster

  echo "==> Dump validated. Press Enter to back up the volume and proceed with the wipe + restore,"
  echo "    or Ctrl+C to abort (nothing destructive has happened yet)."
  read -r _

  echo "==> Backing up the volume as-is (rollback point)..."
  docker volume rm "${VOLUME}-pg-old" >/dev/null 2>&1 || true
  docker volume create "${VOLUME}-pg-old" >/dev/null
  docker run --rm -v "$VOLUME":/from -v "${VOLUME}-pg-old":/to alpine sh -c 'cp -a /from/. /to/'

  echo "==> Wiping volume to init a fresh pg${OLD_MAJOR}->18 cluster..."
  docker run --rm -v "$VOLUME":/v alpine sh -c 'rm -rf /v/*'

  echo "==> Initializing fresh pg18 cluster at the new layout..."
  local name=umami-pg-restore-tmp
  docker rm -f "$name" >/dev/null 2>&1 || true
  docker run -d --name "$name" \
    -v "$VOLUME":/var/lib/postgresql \
    -e POSTGRES_USER="$UMAMI_DB_USER" -e POSTGRES_PASSWORD="$UMAMI_DB_PASSWORD" -e POSTGRES_DB="$UMAMI_DB_NAME" \
    postgres:18-alpine >/dev/null

  ready=0
  for _ in $(seq 1 30); do
    if docker exec "$name" pg_isready -U "$UMAMI_DB_USER" >/dev/null 2>&1; then
      ready=1
      break
    fi
    sleep 1
  done
  if [[ "$ready" -ne 1 ]]; then
    echo "ERROR: new pg18 cluster never became ready. Logs:" >&2
    docker logs "$name" >&2
    exit 1
  fi

  echo "==> Restoring dump..."
  if ! docker exec -i -u postgres "$name" psql -U "$UMAMI_DB_USER" -d postgres -v ON_ERROR_STOP=1 < "$DUMP_DIR/dumpall.sql"; then
    echo "ERROR: restore failed. The volume backup is still at ${VOLUME}-pg-old." >&2
    docker logs "$name" >&2
    exit 1
  fi

  docker stop "$name" >/dev/null
  docker rm "$name" >/dev/null

  echo "==> Done. Redeploy the monitoring stack and verify Umami shows historical data:"
  echo "    (from deployment/monitoring/) bash deploy.sh --env-file <path-to-.env>"
  echo "==> Only after verifying, remove the rollback volume:"
  echo "    docker volume rm ${VOLUME}-pg-old"
}

clean() {
  echo "==> This wipes $VOLUME. Only run this after 'diagnose' confirmed no real data."
  echo "    Press Enter to proceed, or Ctrl+C to abort."
  read -r _
  stop_containers
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
