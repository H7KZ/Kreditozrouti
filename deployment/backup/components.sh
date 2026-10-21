#!/usr/bin/env bash
# Kreditozrouti backup component list, sourced by `deployment/toolkit backup` (declared as
# BACKUP_COMPONENTS in deployment/toolkit.conf; `toolkit install` copies it for the root units).
#
# Each component is one file: produce_<name with _> writes the plaintext to stdout, the toolkit
# pipes it through zstd and age and uploads it. A producer must exit non-zero on any failure.
# BACKUP_DRILL says how `toolkit backup drill` restores a component; drill_check_<name with _>
# adds a repository-specific check. See https://github.com/H7KZ/Toolkit/tree/main/docs/backups.md
# shellcheck disable=SC2034 # arrays are read by the toolkit

declare -gA BACKUP_CADENCE BACKUP_EXT BACKUP_PAUSE BACKUP_MIN_BYTES BACKUP_DRILL

BACKUP_COMPONENTS=(mysql umami-postgres redis)
BACKUP_DEFAULT_MIN_BYTES=300
for _component in "${BACKUP_COMPONENTS[@]}"; do
  BACKUP_CADENCE[$_component]=4h
done
unset _component
BACKUP_EXT["mysql"]=sql
BACKUP_EXT["umami-postgres"]=pgdump
BACKUP_EXT["redis"]=rdb
BACKUP_MIN_BYTES["mysql"]=800
BACKUP_MIN_BYTES["umami-postgres"]=600
# <kind> <Compose file whose image the drill restores into>
BACKUP_DRILL["mysql"]="mysql deployment/production/docker-compose.production.yml"
BACKUP_DRILL["umami-postgres"]="postgres deployment/monitoring/docker-compose.monitoring.yml"
BACKUP_DRILL["redis"]="redis deployment/production/docker-compose.production.yml"

# Exactly one running container for a Compose project/service, found by label (names are not fixed).
_container() {
  local ids
  ids="$(docker ps --filter "label=com.docker.compose.project=$1" --filter "label=com.docker.compose.service=$2" --format '{{.ID}}')"
  [[ -n "$ids" && "$ids" != *$'\n'* ]] || {
    echo "expected exactly one running container for $1/$2" >&2
    return 1
  }
  printf '%s\n' "$ids"
}

# The root password is read from the container's own environment, never passed on a command line.
produce_mysql() {
  local id
  id="$(_container kreditozrouti mysql)" || return 1
  docker exec "$id" sh -ceu 'export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"; exec mysqldump --user=root --single-transaction --routines --events --triggers --hex-blob --no-tablespaces --default-character-set=utf8mb4 --databases "$MYSQL_DATABASE"'
}

produce_umami_postgres() {
  local id
  id="$(_container kreditozrouti-monitoring umami-db)" || return 1
  docker exec "$id" sh -ceu 'export PGPASSWORD="$POSTGRES_PASSWORD"; exec pg_dump --format=custom --compress=0 --no-owner --no-privileges --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"'
}

# Whole RDB over the replication protocol. Redis rewrites its process title, so the password is read
# from the container's start command (Compose passes --requirepass) and handed over by environment,
# not argv. Restore copies only share:* and ical:* into a fresh Redis (see RESTORE.md).
produce_redis() {
  local id password
  id="$(_container kreditozrouti redis)" || return 1
  password="$(docker inspect --format '{{range .Config.Cmd}}{{.}}{{"\n"}}{{end}}' "$id" | sed -n '/^--requirepass$/{n;p}')"
  [[ -n "$password" ]] || {
    echo 'cannot find the Redis password in the container command' >&2
    return 1
  }
  REDISCLI_AUTH="$password" docker exec -e REDISCLI_AUTH "$id" redis-cli --rdb -
}

# Drill: the product keeps share:* and ical:* only; report how many came back (the default check already
# requires a non-empty database). Gets the throwaway container name.
drill_check_redis() {
  local durable
  durable="$(docker exec "$1" sh -c "redis-cli --scan --pattern 'share:*'; redis-cli --scan --pattern 'ical:*'" | wc -l)"
  printf 'drill: redis durable_keys=%s\n' "$durable" >&2
}
