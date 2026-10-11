#!/usr/bin/env bash
set -euo pipefail

# Restore drill: fetch the newest backup of every component, import each database into a throwaway
# container of the same image as production and run sanity queries. No application container is
# started, so nothing can send mail, call Stripe or fire webhooks.
#
# Needs: docker, rclone, age, zstd, TOOLKIT_BIN (the pinned toolkit) and BACKUP_* settings in the
# environment (reader key and age identity). Pings BACKUP_HC_DRILL_URL with the result when set.

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd -P)"
toolkit="${TOOLKIT_BIN:?TOOLKIT_BIN must point at the pinned toolkit/bin/toolkit}"
work="$(mktemp -d)"
containers=()

cleanup() {
  local status=$?
  trap - EXIT
  ((${#containers[@]} == 0)) || docker rm -f "${containers[@]}" >/dev/null 2>&1 || true
  rm -rf -- "$work"
  if [[ -n "${BACKUP_HC_DRILL_URL:-}" ]]; then
    curl -fsS -m 10 --retry 3 -o /dev/null "${BACKUP_HC_DRILL_URL}/$status" >/dev/null 2>&1 || echo 'healthcheck ping failed' >&2
  fi
  exit "$status"
}
trap cleanup EXIT

log() { printf 'drill: %s\n' "$*"; }
fail() {
  printf 'drill FAILED: %s\n' "$*" >&2
  exit 1
}

fetch() {
  "$toolkit" backup fetch "${BACKUP_REPOSITORY:-kreditozrouti}" "$1" -o "$2" >/dev/null || fail "cannot fetch $1"
}

image_from() {
  local file="$1" prefix="$2" image
  image="$(grep -rhoE "image: *${prefix}[^ ]+" "$repo_root/$file" | head -1 | awk '{print $2}')"
  [[ -n "$image" ]] || fail "no $prefix image in $file"
  printf '%s\n' "$image"
}

wait_for() {
  local name="$1"
  shift
  for _ in $(seq 1 60); do
    docker exec "$name" "$@" >/dev/null 2>&1 && return 0
    sleep 2
  done
  fail "$name did not become ready"
}

drill_mysql() {
  local image name tables rows
  image="$(image_from deployment/production/docker-compose.production.yml 'mysql:')"
  name="drill-mysql-$$"
  fetch mysql "$work/mysql.sql"
  [[ -s "$work/mysql.sql" ]] || fail 'mysql: empty dump'
  docker run -d --name "$name" --network none -e MYSQL_ROOT_PASSWORD=drill "$image" >/dev/null
  containers+=("$name")
  # Probe over TCP: the init-time throwaway server only listens on a socket.
  wait_for "$name" sh -c 'MYSQL_PWD=drill mysql -h127.0.0.1 -uroot -e "SELECT 1"'
  # The dump is taken with --databases, so it creates and selects its own database.
  docker exec -i "$name" sh -c 'MYSQL_PWD=drill exec mysql -uroot' <"$work/mysql.sql" || fail 'mysql: import failed'
  tables="$(docker exec "$name" sh -c "MYSQL_PWD=drill mysql -uroot -N -e \"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema NOT IN ('mysql','information_schema','performance_schema','sys')\"")"
  rows="$(docker exec "$name" sh -c "MYSQL_PWD=drill mysql -uroot -N -e \"SELECT COALESCE(SUM(table_rows),0) FROM information_schema.tables WHERE table_schema NOT IN ('mysql','information_schema','performance_schema','sys')\"")"
  ((tables > 0 && rows > 0)) || fail "mysql: restored database looks empty (tables=$tables rows=$rows)"
  log "mysql ok tables=$tables rows=$rows"
}

drill_umami() {
  local image name tables rows
  image="$(image_from deployment/monitoring/docker-compose.monitoring.yml 'postgres:')"
  name="drill-umami-$$"
  fetch umami-postgres "$work/umami.dump"
  [[ -s "$work/umami.dump" ]] || fail 'umami-postgres: empty dump'
  docker run -d --name "$name" --network none -e POSTGRES_PASSWORD=drill "$image" >/dev/null
  containers+=("$name")
  wait_for "$name" pg_isready -U postgres
  docker cp "$work/umami.dump" "$name:/tmp/umami.dump"
  docker exec "$name" createdb -U postgres restored
  docker exec "$name" pg_restore --exit-on-error --no-owner --no-privileges -U postgres -d restored /tmp/umami.dump || fail 'umami-postgres: pg_restore failed'
  docker exec "$name" psql -U postgres -d restored -X -q -c 'ANALYZE' >/dev/null
  tables="$(docker exec "$name" psql -U postgres -d restored -XAtc "SELECT count(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema')")"
  rows="$(docker exec "$name" psql -U postgres -d restored -XAtc 'SELECT coalesce(sum(n_live_tup),0)::bigint FROM pg_stat_user_tables')"
  ((tables > 0 && rows > 0)) || fail "umami-postgres: restored database looks empty (tables=$tables rows=$rows)"
  log "umami-postgres ok tables=$tables rows=$rows"
}

# Loads the RDB into a scratch Redis exactly as a restore would, then counts the keys the product keeps.
drill_redis() {
  local image name keys durable
  image="$(image_from deployment/production/docker-compose.production.yml 'redis:')"
  name="drill-redis-$$"
  fetch redis "$work/dump.rdb"
  [[ "$(head -c 5 "$work/dump.rdb")" == REDIS ]] || fail 'redis: not an RDB file'
  docker create --name "$name" --network none "$image" redis-server --appendonly no --dir /data --dbfilename dump.rdb >/dev/null
  containers+=("$name")
  docker cp "$work/dump.rdb" "$name:/data/dump.rdb"
  docker start "$name" >/dev/null
  wait_for "$name" redis-cli ping
  keys="$(docker exec "$name" redis-cli DBSIZE | awk '{print $NF}')"
  durable="$(docker exec "$name" sh -c "redis-cli --scan --pattern 'share:*'; redis-cli --scan --pattern 'ical:*'" | wc -l)"
  ((keys > 0)) || fail 'redis: restored database is empty'
  log "redis ok keys=$keys durable_keys=$durable"
}

drill_mysql
drill_umami
drill_redis
log 'all components restored'
