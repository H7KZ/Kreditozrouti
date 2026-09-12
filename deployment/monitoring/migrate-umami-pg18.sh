#!/usr/bin/env bash
# One-off migration: upgrade the umami-db volume in place from the old
# pre-18 Postgres layout (data at /var/lib/postgresql/data, e.g. postgres:16-alpine)
# to the postgres:18+ layout (data at /var/lib/postgresql/<major>/docker).
#
# Run this ONCE on the host, with the monitoring stack stopped, before deploying
# a docker-compose.monitoring.yml that mounts kreditozrouti-umami-postgres-volume
# at /var/lib/postgresql (instead of /var/lib/postgresql/data).
#
# Usage: ./migrate-umami-pg18.sh
set -euo pipefail

VOLUME=kreditozrouti-umami-postgres-volume
PROJECT=kreditozrouti-monitoring

echo "==> Stopping umami + umami-db (if running)..."
docker compose -p "$PROJECT" -f docker-compose.monitoring.yml stop umami umami-db || true

echo "==> Backing up volume $VOLUME to ./umami-db-backup-$(date +%Y%m%d%H%M%S).tar.gz"
docker run --rm \
  -v "$VOLUME":/from \
  -v "$(pwd)":/backup \
  alpine \
  tar czf "/backup/umami-db-backup-$(date +%Y%m%d%H%M%S).tar.gz" -C /from .

echo "==> Running pg_upgrade (pg16 -> pg18) via pgautoupgrade..."
# pgautoupgrade auto-detects the old single-directory (pre-18) layout at
# /var/lib/postgresql and upgrades it in place to the versioned layout
# the postgres:18+ image expects.
docker run --rm \
  -v "$VOLUME":/var/lib/postgresql \
  pgautoupgrade/pgautoupgrade:16-to-18-alpine

echo "==> Done. Verify with:"
echo "    docker run --rm -v $VOLUME:/var/lib/postgresql postgres:18-alpine ls /var/lib/postgresql"
echo "Then redeploy the monitoring stack normally (deploy.sh / deploy-monitoring.yml)."
