#!/usr/bin/env bash
# Umami retention: applies retention.sql from the current monitoring snapshot to the Umami database.
#
# Toolkit job `umami-retention` (deployment/toolkit.conf). It runs as root from the toolkit control copy
# under the kreditozrouti/monitoring repository lock, with TOOLKIT_REPOSITORY, TOOLKIT_DEPLOY_USER,
# TOOLKIT_DEPLOY_HOME and TOOLKIT_REPO_ROOT set. Run it by hand with:
#
#   deployment/toolkit job umami-retention
#
# Exit codes: 0 success, 1 failure, 2 not run as a toolkit job.
set -Eeuo pipefail

here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=../../vendor/toolkit/log.sh
source "$here/../../vendor/toolkit/log.sh"
[[ $EUID == 0 && -n "${TOOLKIT_REPOSITORY:-}" && -n "${TOOLKIT_DEPLOY_HOME:-}" ]] || die 2 'run through deployment/toolkit job umami-retention'

root="$TOOLKIT_DEPLOY_HOME/$TOOLKIT_REPOSITORY/versions/monitoring"
[[ -L "$root/current" ]] || die 'monitoring current snapshot missing; stage a snapshot first'
release="$(realpath -e "$root/current")"
[[ "$(dirname -- "$release")" == "$root" && -f "$release/.toolkit-release.json" && ! -L "$release/.toolkit-release.json" && -f "$release/.toolkit-inventory.json" ]] ||
  die 'legacy or corrupt monitoring snapshot; stage a new snapshot'

python3 - "$release" "$TOOLKIT_REPOSITORY" <<'PY' || die 'monitoring snapshot failed verification'
import hashlib, json, sys
from pathlib import Path
release=Path(sys.argv[1])
repository=sys.argv[2]
document=json.loads((release/'.toolkit-release.json').read_text())
if document.get('schema_version') != 1 or document.get('repository') != repository or document.get('environment') != 'monitoring' or document.get('project') != repository + '-monitoring' or document.get('release_id') != release.name or not document.get('resolved_images'):
    raise SystemExit('invalid monitoring snapshot metadata')
inventory=json.loads((release/'.toolkit-inventory.json').read_text())
for name in ['.toolkit-release.json','monitoring/umami/retention.sql']:
    path=release/name
    if path.is_symlink() or inventory.get(name) != {'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}:
        raise SystemExit('monitoring snapshot inventory mismatch')
PY

log_info "applying retention from $(basename -- "$release")"
docker exec -i "$TOOLKIT_REPOSITORY-monitoring-umami-db-1" sh -c 'exec psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <"$release/monitoring/umami/retention.sql" ||
  die 'retention.sql failed'
log_ok 'umami retention applied'
