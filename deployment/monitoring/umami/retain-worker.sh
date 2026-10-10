#!/usr/bin/env bash
set -euo pipefail
[[ $EUID == 0 && $# == 2 && "$1" == --home && "$2" == /* ]] || { echo 'usage: root-installed retain-worker.sh --home <deploy-home> (service worker)' >&2; exit 2; }
root="$2/kreditozrouti/versions/monitoring"
[[ -L "$root/current" ]] || { echo 'ERROR: monitoring current snapshot missing; stage a snapshot first' >&2; exit 1; }
release="$(realpath -e "$root/current")"
[[ "$(dirname -- "$release")" == "$root" && -f "$release/.toolkit-release.json" && ! -L "$release/.toolkit-release.json" && -f "$release/.toolkit-inventory.json" ]] || { echo 'ERROR: legacy or corrupt monitoring snapshot; stage a new snapshot' >&2; exit 1; }
expected="$(awk -F= '$1 == "TOOLKIT_VERSION" { if (seen++) exit 2; print $2 } END { if (!seen) exit 1 }' "$release/toolkit.lock")"
actual="$(/usr/local/bin/toolkit version | awk -F'[= ]' '/^toolkit_version=/ {print $2}')"
[[ "$actual" == "$expected" ]] || { echo 'ERROR: monitoring toolkit pin mismatch' >&2; exit 1; }
python3 - "$release" <<'PY'
import hashlib, json, sys
from pathlib import Path
release=Path(sys.argv[1])
document=json.loads((release/'.toolkit-release.json').read_text())
if document.get('schema_version') != 1 or document.get('repository') != 'kreditozrouti' or document.get('environment') != 'monitoring' or document.get('project') != 'kreditozrouti-monitoring' or document.get('release_id') != release.name or not document.get('resolved_images'):
    raise SystemExit('ERROR: invalid monitoring snapshot metadata')
inventory=json.loads((release/'.toolkit-inventory.json').read_text())
for name in ['.toolkit-release.json','monitoring/umami/retention.sql']:
    path=release/name
    if path.is_symlink() or inventory.get(name) != {'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}:
        raise SystemExit('ERROR: monitoring snapshot inventory mismatch')
PY
docker exec -i kreditozrouti-monitoring-umami-db-1 sh -c 'exec psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "$release/monitoring/umami/retention.sql"
