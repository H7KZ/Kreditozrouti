#!/usr/bin/env bash
# One-off migration: upgrade the umami-db volume in place from the old
# pre-18 Postgres layout (data at the volume root, e.g. postgres:16-alpine
# mounted at /var/lib/postgresql/data) to the postgres:18+ layout (data at
# /var/lib/postgresql/<major>/docker, per docker-library/postgres#1259).
#
# Uses tianon/postgres-upgrade (https://github.com/tianon/docker-postgres-upgrade),
# the pg_upgrade reference image for Docker.
#
# Run this ONCE on the host, with the monitoring stack stopped, before deploying
# a docker-compose.monitoring.yml that mounts kreditozrouti-umami-postgres-volume
# at /var/lib/postgresql (instead of /var/lib/postgresql/data).
#
# Usage: ./migrate-umami-pg18.sh
set -euo pipefail

VOLUME=kreditozrouti-umami-postgres-volume
PROJECT=kreditozrouti-monitoring
OLD=16
NEW=18

echo "==> Stopping umami + umami-db (if running)..."
docker compose -p "$PROJECT" -f docker-compose.monitoring.yml stop umami umami-db || true

echo "==> Backing up volume $VOLUME to ./umami-db-backup-$(date +%Y%m%d%H%M%S).tar.gz"
docker run --rm \
  -v "$VOLUME":/from \
  -v "$(pwd)":/backup \
  alpine \
  tar czf "/backup/umami-db-backup-$(date +%Y%m%d%H%M%S).tar.gz" -C /from .

echo "==> Relocating existing pg$OLD data to the versioned layout ($OLD/docker)..."
# The old image mounted this volume straight at /var/lib/postgresql/data, so
# the volume root currently holds the data files directly (PG_VERSION, base/,
# etc). Move everything into "$OLD/docker" and make an empty "$NEW/docker" for
# pg_upgrade to initialize.
docker run --rm -v "$VOLUME":/var/lib/postgresql alpine sh -c "
  set -e
  cd /var/lib/postgresql
  if [ -f PG_VERSION ] && [ ! -d '$OLD/docker' ]; then
    mkdir -p /tmp/movein
    mv * /tmp/movein/
    mkdir -p '$OLD'
    mv /tmp/movein '$OLD/docker'
  fi
  mkdir -p '$NEW/docker'
"

echo "==> Running pg_upgrade ($OLD -> $NEW) via tianon/postgres-upgrade..."
docker run --rm \
  --mount "type=volume,src=$VOLUME,dst=/var/lib/postgresql" \
  --env "PGDATAOLD=/var/lib/postgresql/$OLD/docker" \
  --env "PGDATANEW=/var/lib/postgresql/$NEW/docker" \
  "tianon/postgres-upgrade:$OLD-to-$NEW" \
  --link

echo "==> Upgrade complete. New data lives at /var/lib/postgresql/$NEW/docker inside the volume."
echo "==> You can now redeploy the monitoring stack (postgres:$NEW-alpine will pick up"
echo "    /var/lib/postgresql/$NEW/docker as its default PGDATA when the volume is mounted at /var/lib/postgresql)."
echo "==> Once you've confirmed umami is healthy, the old data can be removed:"
echo "    docker run --rm -v $VOLUME:/var/lib/postgresql alpine rm -rf /var/lib/postgresql/$OLD"
