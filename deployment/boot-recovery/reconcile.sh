#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# reconcile.sh - boot recovery for kreditozrouti's immutable releases.
#
# Usage: reconcile.sh [--dry-run]
#
# For each deployment target that has a current release pointer
#   $HOME/kreditozrouti/versions/<target>/current
# validate the pointer, then start the project's containers that are stopped
# but declare a restart policy (`unless-stopped`, `always`, `on-failure`):
# data services (mysql, redis, umami-db) first and wait for their healthchecks,
# then everything else. It never pulls, builds, recreates, removes or
# redeploys: a container that no longer exists needs the Deploy workflow, and
# one-shot containers (restart policy `no`) are left alone.
#
# Targets with no pointer are skipped. A malformed pointer fails the run after
# the other targets were handled. Runs as the deploy user under
# `toolkit with-lock` (see kreditozrouti-reconcile.service); install with
# deployment/boot-recovery/install.sh.
# ==============================================================================

readonly APP="kreditozrouti"
# <versions subdirectory>:<compose project>. Services are deployed per environment, monitoring
# separately; the project names mirror deploy-all.yml and monitoring/docker-compose.monitoring.yml.
readonly -a TARGETS=("production:kreditozrouti" "development:kreditozrouti-dev" "monitoring:kreditozrouti-monitoring")
readonly -a DATA_SERVICES=("mysql" "redis" "umami-db")
readonly HEALTH_ATTEMPTS="${RECONCILE_HEALTH_ATTEMPTS:-30}"

dry_run=0
case "${1:-}" in
  '') ;;
  --dry-run) dry_run=1 ;;
  *) echo 'usage: reconcile.sh [--dry-run]' >&2; exit 2 ;;
esac
(($# <= 1)) || { echo 'usage: reconcile.sh [--dry-run]' >&2; exit 2; }

versions_root="${HOME:?}/$APP/versions"
failures=0

log() { printf '[reconcile] %s\n' "$*"; }
fail() { printf '[reconcile] ERROR: %s\n' "$*" >&2; failures=$((failures + 1)); }

is_data_service() {
  local service="$1" data
  for data in "${DATA_SERVICES[@]}"; do [[ "$service" == "$data" ]] && return 0; done
  return 1
}

wait_healthy() { # wait_healthy <container-id> <service>
  local id="$1" service="$2" attempt status
  for ((attempt = 0; attempt < HEALTH_ATTEMPTS; attempt++)); do
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$id" 2>/dev/null || echo unknown)"
    case "$status" in
      healthy | none) return 0 ;;
      unhealthy) log "$service is unhealthy; continuing"; return 0 ;;
    esac
    sleep 2
  done
  log "$service did not report healthy in time; continuing"
}

start_container() { # start_container <id> <service> <project>
  local id="$1" service="$2" project="$3"
  if ((dry_run)); then
    log "$project: would start $service"
    return 0
  fi
  if docker start "$id" >/dev/null; then
    log "$project: started $service"
  else
    fail "$project: could not start $service"
    return 1
  fi
}

reconcile_target() { # reconcile_target <subdirectory> <project>
  local target="$1" project="$2" base link resolved id service policy state
  base="$versions_root/$target"
  link="$base/current"
  if [[ ! -e "$link" && ! -L "$link" ]]; then
    log "$target: no current release; skipping"
    return 0
  fi
  [[ -L "$link" ]] || { fail "$target: current is not a symlink"; return 0; }
  resolved="$(realpath -e -- "$link" 2>/dev/null)" || { fail "$target: current points at a missing release"; return 0; }
  [[ "$(dirname -- "$resolved")" == "$(realpath -e -- "$base")" ]] || { fail "$target: current release is outside $base"; return 0; }
  [[ -d "$resolved" ]] || { fail "$target: current release is not a directory"; return 0; }

  local -a data_rows=() other_rows=()
  while IFS=$'\t' read -r id service state; do
    [[ -n "$id" ]] || continue
    [[ "$state" == running || "$state" == restarting ]] && continue
    policy="$(docker inspect --format '{{.HostConfig.RestartPolicy.Name}}' "$id" 2>/dev/null || echo no)"
    [[ "$policy" == unless-stopped || "$policy" == always || "$policy" == on-failure ]] || continue
    if is_data_service "$service"; then data_rows+=("$id"$'\t'"$service"); else other_rows+=("$id"$'\t'"$service"); fi
  done < <(docker ps -a --filter "label=com.docker.compose.project=$project" --format '{{.ID}}{{"\t"}}{{.Label "com.docker.compose.service"}}{{"\t"}}{{.State}}')

  if ((${#data_rows[@]} + ${#other_rows[@]} == 0)); then
    log "$target: nothing to start in project $project (release $(basename -- "$resolved"))"
    return 0
  fi
  local row
  for row in "${data_rows[@]}"; do
    IFS=$'\t' read -r id service <<<"$row"
    start_container "$id" "$service" "$project" && { ((dry_run)) || wait_healthy "$id" "$service"; }
  done
  for row in "${other_rows[@]}"; do
    IFS=$'\t' read -r id service <<<"$row"
    start_container "$id" "$service" "$project" || true
  done
}

for entry in "${TARGETS[@]}"; do
  reconcile_target "${entry%%:*}" "${entry#*:}"
done

if ((failures > 0)); then
  log "finished with $failures failure(s)"
  exit 1
fi
log 'finished'
