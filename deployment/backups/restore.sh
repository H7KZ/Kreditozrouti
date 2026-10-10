#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

readonly STATE_ROOT='/var/lib/kreditozrouti-backup'
readonly RESTORE_ROOT="$STATE_ROOT/restores"
readonly KOPIA_BIN="${KOPIA_BIN:-/usr/local/bin/kopia}"
readonly KOPIA_CONFIG_FILE="${KOPIA_CONFIG_FILE:-/etc/kreditozrouti-backup/repository.config}"
readonly TOOLKIT_BIN="${TOOLKIT_BIN:-/usr/local/bin/toolkit}"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPERATION_ID=''

fail() { printf '[restore] ERROR: %s\n' "$*" >&2; exit 1; }

start_operation() {
	local output
	[[ -x "$TOOLKIT_BIN" ]] || fail "Infrastructure toolkit missing: $TOOLKIT_BIN"
	local expected actual
	expected="$(awk -F= '$1 == "TOOLKIT_VERSION" { if (seen++) exit 2; print substr($0, index($0, "=") + 1) } END { if (!seen) exit 1 }' "$SCRIPT_DIR/../toolkit.lock")" || fail 'toolkit pin is missing or malformed'
	actual="$("$TOOLKIT_BIN" version | sed -n 's/^toolkit_version=\([^ ]*\).*/\1/p')"
	[[ "$actual" == "$expected" ]] || fail "host toolkit $actual does not match pinned version $expected"
	output="$("$TOOLKIT_BIN" operation start --repository kreditozrouti --environment production --action backup_restore)"
	OPERATION_ID="${output#operation_id=}"
	trap finish_operation EXIT
	[[ "$OPERATION_ID" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$ ]] || fail 'toolkit returned an invalid operation id'
}

finish_operation() {
	local status=$? state=succeeded
	local -a finish_args=()
	trap - EXIT
	if ((status != 0)); then
		state=failed
		if ((status >= 128)); then state=interrupted; fi
	fi
	finish_args+=(--repository kreditozrouti --environment production --operation-id "$OPERATION_ID" --state "$state")
	if [[ "$state" != succeeded ]]; then finish_args+=(--failure-phase restore_staging); fi
	"$TOOLKIT_BIN" operation finish "${finish_args[@]}" || printf '[restore] could not publish terminal operation status\n' >&2
	exit "$status"
}

main() {
	[[ "$(id -u)" == 0 ]] || fail 'must run as root'
	if [[ $# != 1 ]] && [[ $# != 3 || "${2:-}" != --restore-redis-to-api ]]; then
		fail 'usage: restore.sh <snapshot-id> [--restore-redis-to-api <container>]'
	fi
	[[ "$1" =~ ^[A-Za-z0-9_-]{8,128}$ ]] || fail 'invalid snapshot id'
	[[ -x "$KOPIA_BIN" ]] || fail "Kopia executable missing: $KOPIA_BIN"
	local kopia_version
	kopia_version="$("$KOPIA_BIN" --version 2>&1)" || fail 'cannot read Kopia version'
	[[ "$kopia_version" =~ (^|[^0-9])0\.23\.1([^0-9]|$) ]] || fail "Kopia 0.23.1 is required; found: $kopia_version"
	[[ -f "$KOPIA_CONFIG_FILE" && ! -L "$KOPIA_CONFIG_FILE" ]] || fail "Kopia config missing or unsafe: $KOPIA_CONFIG_FILE"
	[[ "$(stat -c '%u' "$KOPIA_CONFIG_FILE")" == 0 ]] || fail 'Kopia config must be root-owned'
	(( (8#$(stat -c '%a' "$KOPIA_CONFIG_FILE") & 077) == 0 )) || fail 'Kopia config must not be group/world accessible'
	[[ -n "${KOPIA_PASSWORD:-}" ]] || fail 'KOPIA_PASSWORD must be supplied by a root-only environment'
	start_operation
	[[ ! -L "$STATE_ROOT" && ! -L "$RESTORE_ROOT" ]] || fail 'restore directories must not be symlinks'
	install -d -o root -g root -m 0700 "$STATE_ROOT" "$RESTORE_ROOT"
	[[ "$(stat -c '%u' "$STATE_ROOT")" == 0 && "$(stat -c '%a' "$STATE_ROOT")" == 700 && "$(stat -c '%u' "$RESTORE_ROOT")" == 0 && "$(stat -c '%a' "$RESTORE_ROOT")" == 700 ]] || fail 'restore directories must be root-only'
	local snapshot_id="$1" destination="$RESTORE_ROOT/$1"
	[[ ! -e "$destination" && ! -L "$destination" ]] || fail "restore destination already exists: $destination"
	mkdir -m 0700 -- "$destination"
	if ! "$KOPIA_BIN" --config-file "$KOPIA_CONFIG_FILE" snapshot restore "$snapshot_id" "$destination"; then
		fail "Kopia restore failed; partial data retained for inspection at $destination"
	fi
	python3 - "$destination" <<'PY'
import os
import sys
from pathlib import Path

root = Path(sys.argv[1])
expected = {".complete", "SHA256SUMS", "manifest.json", "mysql.sql", "redis.json", "umami.dump"}
items = list(os.scandir(root))
if {item.name for item in items} != expected:
    raise SystemExit("snapshot file set mismatch")
if any(not item.is_file(follow_symlinks=False) for item in items):
    raise SystemExit("snapshot contains a non-regular entry")
if (root / ".complete").read_text(encoding="ascii") != "complete\n":
    raise SystemExit("snapshot completion marker is invalid")
checksum_lines = (root / "SHA256SUMS").read_text(encoding="ascii").splitlines()
if len(checksum_lines) != 4:
    raise SystemExit("snapshot checksum list is malformed")
names = set()
for line in checksum_lines:
    if len(line) < 67 or line[64:66] != "  " or any(character not in "0123456789abcdef" for character in line[:64]):
        raise SystemExit("snapshot checksum entry is malformed")
    name = line[66:]
    if name not in {"mysql.sql", "umami.dump", "redis.json", "manifest.json"}:
        raise SystemExit("snapshot checksum path is unexpected")
    names.add(name)
if names != {"mysql.sql", "umami.dump", "redis.json", "manifest.json"}:
    raise SystemExit("snapshot checksum list is incomplete")
PY
	(
		cd "$destination"
		sha256sum --check SHA256SUMS
	)
	python3 - "$destination/manifest.json" <<'PY'
import json
import sys
from pathlib import Path

manifest = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
if manifest.get("schemaVersion") != 1:
    raise SystemExit("unsupported backup manifest schema")
if manifest.get("repository") != "kreditozrouti" or manifest.get("environment") != "production":
    raise SystemExit("backup manifest identity mismatch")
required = {"mysql.sql", "umami.dump", "redis.json"}
if set(manifest.get("files", {})) != required:
    raise SystemExit("backup manifest file set mismatch")
sources = manifest.get("sources", {})
for name in ("mysql", "umamiPostgresql", "redis"):
    image = sources.get(name, {}).get("image")
    if not isinstance(image, dict) or not any(isinstance(value, str) and "@sha256:" in value for value in image.get("registryDigests", [])):
        raise SystemExit(f"{name} recovery image is missing its immutable registry digest")
applications = sources.get("applicationImages")
if not isinstance(applications, list) or not applications:
    raise SystemExit("backup manifest has no application image references")
services = set()
for image in applications:
    if not isinstance(image, dict) or not any(isinstance(value, str) and "@sha256:" in value for value in image.get("registryDigests", [])):
        raise SystemExit("application recovery image is missing its immutable registry digest")
    revision = image.get("revision")
    service = image.get("service")
    if not isinstance(revision, str) or not __import__("re").fullmatch(r"[0-9a-f]{7,64}", revision) or not isinstance(service, str):
        raise SystemExit("application image source revision or service is missing")
    services.add(service)
if not {"api", "web", "scraper", "mcp"}.issubset(services):
    raise SystemExit("backup manifest is missing a required application service image")
import hashlib
for name in required:
    record = manifest["files"][name]
    if not isinstance(record, dict) or not isinstance(record.get("sha256"), str) or not isinstance(record.get("bytes"), int):
        raise SystemExit("backup manifest file record is malformed")
    path = Path(sys.argv[1]).parent / name
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    if record["sha256"] != digest.hexdigest() or record["bytes"] != path.stat().st_size:
        raise SystemExit("backup manifest file digest mismatch")
PY
	if [[ $# == 3 ]]; then
		local target_api="$3" target_project target_service recovery_redis recovery_redis_count allowed_ips
		[[ "$target_api" =~ ^[a-f0-9]{12,64}$ ]] || fail 'recovery API target must be a Docker container id'
		target_project="$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' "$target_api")"
		target_service="$(docker inspect --format '{{index .Config.Labels "com.docker.compose.service"}}' "$target_api")"
		local target_status
		target_status="$(docker inspect --format '{{.State.Status}}' "$target_api")"
		[[ "$target_project" == kreditozrouti-recovery && "$target_service" == api && "$target_status" == running ]] || fail 'Redis restore target must be a running API container in Compose project kreditozrouti-recovery'
		local -a recovery_redis_ids=()
		mapfile -t recovery_redis_ids < <(docker ps --filter 'label=com.docker.compose.project=kreditozrouti-recovery' --filter 'label=com.docker.compose.service=redis' --format '{{.ID}}')
		((${#recovery_redis_ids[@]} == 1)) || fail "expected one running recovery Redis container, found ${#recovery_redis_ids[@]}"
		recovery_redis="${recovery_redis_ids[0]}"
		allowed_ips="$(python3 - "$target_api" "$recovery_redis" <<'PY'
import json
import subprocess
import sys

api_id, redis_id = sys.argv[1:]
inspected = json.loads(subprocess.check_output(["docker", "inspect", api_id, redis_id], text=True))
api, redis = inspected

def require(condition, message):
    if not condition:
        raise SystemExit(message)

def labels(container):
    return container.get("Config", {}).get("Labels") or {}

require(api.get("State", {}).get("Status") == "running", "recovery API is not running")
require(labels(api).get("com.docker.compose.project") == "kreditozrouti-recovery", "recovery API project label mismatch")
require(labels(api).get("com.docker.compose.service") == "api", "recovery API service label mismatch")
require(redis.get("State", {}).get("Status") == "running", "recovery Redis is not running")
require(labels(redis).get("com.docker.compose.project") == "kreditozrouti-recovery", "recovery Redis project label mismatch")
require(labels(redis).get("com.docker.compose.service") == "redis", "recovery Redis service label mismatch")

api_networks = api.get("NetworkSettings", {}).get("Networks") or {}
redis_networks = redis.get("NetworkSettings", {}).get("Networks") or {}
shared = api_networks.keys() & redis_networks.keys()
addresses = set()
for network_name in shared:
    network = redis_networks[network_name]
    addresses.update(value for value in (network.get("IPAddress"), network.get("GlobalIPv6Address")) if value)
require(addresses, "recovery API and Redis do not share a Docker network with an address")

mounts = redis.get("Mounts") or []
require(mounts and all(mount.get("Type") == "volume" for mount in mounts), "recovery Redis must use Compose-managed Docker volumes only")
for mount in mounts:
    volume = json.loads(subprocess.check_output(["docker", "volume", "inspect", mount["Name"]], text=True))[0]
    volume_labels = volume.get("Labels") or {}
    require(volume_labels.get("com.docker.compose.project") == "kreditozrouti-recovery", "recovery Redis volume is not owned by the recovery Compose project")

print(json.dumps(sorted(addresses), separators=(",", ":")))
PY
		)" || fail 'cannot prove Redis restore destination is isolated'
		[[ -f "$destination/redis.json" && ! -L "$destination/redis.json" ]] || fail 'Redis backup file missing or unsafe'
		printf '[restore] restoring Redis durable links into isolated recovery project\n' >&2
		docker exec -i -e "RECOVERY_REDIS_ALLOWED_IPS=$allowed_ips" "$target_api" node -e "$(cat "$SCRIPT_DIR/redis-restore.js")" <"$destination/redis.json"
	fi
	printf '[restore] staged and verified snapshot %s at %s\n' "$snapshot_id" "$destination"
	if [[ $# == 1 ]]; then printf '[restore] no database or Redis service was changed\n'; else printf '[restore] database services were not changed\n'; fi
}

main "$@"
