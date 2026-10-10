#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly STATE_ROOT='/var/lib/kreditozrouti-backup'
readonly STAGING_ROOT="$STATE_ROOT/staging"
readonly RESULT_ROOT="$STATE_ROOT/results"
readonly RESTORE_ROOT="$STATE_ROOT/restores"
readonly KOPIA_BIN="${KOPIA_BIN:-/usr/local/bin/kopia}"
readonly KOPIA_CONFIG_FILE="${KOPIA_CONFIG_FILE:-/etc/kreditozrouti-backup/repository.config}"
readonly TOOLKIT_BIN="${TOOLKIT_BIN:-/usr/local/bin/toolkit}"
readonly SOURCE_ID='root@kreditozrouti-prod:/var/lib/kreditozrouti-backup/source'
readonly REPOSITORY='kreditozrouti'
readonly ENVIRONMENT='production'

log() { printf '[backup] %s\n' "$*" >&2; }
fail() { log "ERROR: $*"; exit 1; }
INCOMPLETE_STAGE=''
CAPTURE_COMPLETE=0
OPERATION_ID=''

require_root() {
	[[ "$(id -u)" == 0 ]] || fail 'must run as root'
}

require_toolkit_pin() {
	[[ -x "$TOOLKIT_BIN" ]] || fail "Infrastructure toolkit missing: $TOOLKIT_BIN"
	local expected actual
	expected="$(awk -F= '$1 == "TOOLKIT_VERSION" { if (seen++) exit 2; print substr($0, index($0, "=") + 1) } END { if (!seen) exit 1 }' "$SCRIPT_DIR/../toolkit.lock")" || fail 'toolkit pin is missing or malformed'
	actual="$("$TOOLKIT_BIN" version | sed -n 's/^toolkit_version=\([^ ]*\).*/\1/p')"
	[[ "$actual" == "$expected" ]] || fail "host toolkit $actual does not match pinned version $expected"
}

start_operation() {
	local output
	require_toolkit_pin
	output="$("$TOOLKIT_BIN" operation start --repository "$REPOSITORY" --environment "$ENVIRONMENT" --action backup_capture)"
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
	finish_args+=(--repository "$REPOSITORY" --environment "$ENVIRONMENT" --operation-id "$OPERATION_ID" --state "$state")
	if [[ "$state" != succeeded ]]; then finish_args+=(--failure-phase capture_or_upload); fi
	"$TOOLKIT_BIN" operation finish "${finish_args[@]}" || log 'could not publish terminal operation status'
	exit "$status"
}

ensure_private_dir() {
	local path="$1"
	[[ ! -L "$path" ]] || fail "backup directory must not be a symlink: $path"
	install -d -o root -g root -m 0700 "$path"
	[[ -d "$path" && ! -L "$path" && "$(stat -c '%u' "$path")" == 0 && "$(stat -c '%a' "$path")" == 700 ]] || fail "backup directory is not root-only: $path"
}

require_kopia_config() {
	[[ -x "$KOPIA_BIN" ]] || fail "Kopia executable missing: $KOPIA_BIN"
	local version
	version="$("$KOPIA_BIN" --version 2>&1)" || fail 'cannot read Kopia version'
	[[ "$version" =~ (^|[^0-9])0\.23\.1([^0-9]|$) ]] || fail "Kopia 0.23.1 is required; found: $version"
	[[ -f "$KOPIA_CONFIG_FILE" && ! -L "$KOPIA_CONFIG_FILE" ]] || fail "Kopia config missing or unsafe: $KOPIA_CONFIG_FILE"
	[[ "$(stat -c '%u' "$KOPIA_CONFIG_FILE")" == 0 ]] || fail 'Kopia config must be root-owned'
	(( (8#$(stat -c '%a' "$KOPIA_CONFIG_FILE") & 077) == 0 )) || fail 'Kopia config must not be group/world accessible'
	[[ -n "${KOPIA_PASSWORD:-}" ]] || fail 'KOPIA_PASSWORD must be supplied by a root-only service environment'
}

require_non_expiring_source_policy() {
	local policy_tmp
	policy_tmp="$(mktemp "$RESULT_ROOT/.policy.XXXXXX")"
	if ! "$KOPIA_BIN" --config-file "$KOPIA_CONFIG_FILE" policy show "$SOURCE_ID" --json >"$policy_tmp"; then
		rm -f -- "$policy_tmp"
		fail 'cannot read the stable Kopia source retention policy'
	fi
	if ! python3 - "$policy_tmp" <<'PY'
import json
import sys

policy = json.load(open(sys.argv[1], encoding="utf-8"))
retention = policy.get("retention") if isinstance(policy, dict) else None
fields = ("keepLatest", "keepHourly", "keepDaily", "keepWeekly", "keepMonthly", "keepAnnual")
if not isinstance(retention, dict) or any(type(retention.get(field)) is not int or retention[field] != 0 for field in fields):
    raise SystemExit("source retention must retain all snapshots for hosted maintenance")
if retention.get("ignoreIdenticalSnapshots") is not False:
    raise SystemExit("source policy must record identical four-hour recovery points")
PY
	then
		rm -f -- "$policy_tmp"
		fail 'source retention must be set to zero counters with identical snapshots enabled before capture'
	fi
	rm -f -- "$policy_tmp"
}

require_stage() {
	local path="$1"
	[[ "$path" == "$STAGING_ROOT/"* && -d "$path" && ! -L "$path" ]] || fail 'staging directory is missing or outside the configured root'
	[[ -f "$path/.complete" && -f "$path/manifest.json" && -f "$path/SHA256SUMS" ]] || fail 'staging set is incomplete'
	python3 - "$path" <<'PY'
import os
import sys

root = sys.argv[1]
expected = {".complete", "SHA256SUMS", "manifest.json", "mysql.sql", "redis.json", "umami.dump"}
items = list(os.scandir(root))
if {item.name for item in items} != expected or any(not item.is_file(follow_symlinks=False) for item in items):
    raise SystemExit("staging file set mismatch")
if open(os.path.join(root, ".complete"), encoding="ascii").read() != "complete\n":
    raise SystemExit("staging completion marker is invalid")
PY
	(cd "$path" && sha256sum --check --status SHA256SUMS) || fail 'staging set checksum validation failed'
}

upload_staged() {
	local backup_id="$1"
	local stage="$STAGING_ROOT/$backup_id" result="$RESULT_ROOT/$backup_id.json" result_tmp status
	[[ "$backup_id" =~ ^[0-9]{8}T[0-9]{6}Z-[0-9]+$ ]] || fail 'invalid backup set id'
	require_stage "$stage"
	require_kopia_config
	install -d -o root -g root -m 0700 "$RESULT_ROOT"
	require_non_expiring_source_policy
	[[ ! -e "$result" && ! -L "$result" ]] || fail "result file already exists: $result"
	log "uploading backup set $backup_id"
	result_tmp="$(mktemp "$RESULT_ROOT/.${backup_id}.XXXXXX")"
	if "$KOPIA_BIN" --config-file "$KOPIA_CONFIG_FILE" snapshot create \
		--json --fail-fast \
		--override-source "$SOURCE_ID" \
		--tags 'application:kreditozrouti' \
		--tags 'environment:production' \
		--tags "backup_set:$backup_id" \
		"$stage" >"$result_tmp"; then
		local snapshot_id
		snapshot_id="$(python3 - "$result_tmp" <<'PY'
import json
import re
import sys

try:
    manifest = json.load(open(sys.argv[1], encoding="utf-8"))
except (OSError, json.JSONDecodeError) as error:
    raise SystemExit(f"Kopia returned invalid JSON: {error}")
if not isinstance(manifest, dict) or not isinstance(manifest.get("id"), str) or not manifest["id"]:
    raise SystemExit("Kopia returned no snapshot id")
if manifest.get("incomplete") not in (None, ""):
    raise SystemExit("Kopia returned an incomplete snapshot")
root = manifest.get("rootEntry")
summary = root.get("summ") if isinstance(root, dict) else None
expected_files = 6
if not isinstance(summary, dict) or root.get("type") != "d":
    raise SystemExit("Kopia returned no directory summary")
if type(summary.get("files")) is not int or summary["files"] != expected_files:
    raise SystemExit("Kopia snapshot file count does not match the complete staged set")
if summary.get("dirs", 0) != 1 or summary.get("symlinks", 0) != 0:
    raise SystemExit("Kopia snapshot contains unexpected directories or symlinks")
if summary.get("incomplete") not in (None, ""):
    raise SystemExit("Kopia root directory is incomplete")
for field in ("numFailed", "numIgnoredErrors"):
    if type(summary.get(field, 0)) is not int or summary.get(field, 0) != 0:
        raise SystemExit("Kopia snapshot contains failed or ignored files")
snapshot_id = manifest["id"]
if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}", snapshot_id):
    raise SystemExit("Kopia returned an invalid snapshot id")
print(snapshot_id)
PY
		)" || {
			rm -f -- "$result_tmp"
			log "Kopia returned an invalid snapshot result; staged set retained for retry: $stage"
			return 1
		}
		if ! "$KOPIA_BIN" --config-file "$KOPIA_CONFIG_FILE" snapshot verify --verify-files-percent=100 "$snapshot_id"; then
			rm -f -- "$result_tmp"
			log "Kopia could not verify the complete snapshot; staged set retained for retry: $stage"
			return 1
		fi
		chmod 0600 "$result_tmp"
		ln -- "$result_tmp" "$result" || fail "cannot publish Kopia result without replacement: $result"
		rm -- "$result_tmp"
		log "uploaded backup set $backup_id; Kopia result: $result"
	else
		status=$?
		rm -f -- "$result_tmp"
		log "Kopia upload failed; staged set retained for retry: $stage"
		return "$status"
	fi

	# Only remove the local sensitive dump after Kopia reports a successful snapshot.
	[[ "$stage" == "$STAGING_ROOT/"* && ! -L "$stage" ]] || fail 'refusing to remove an unsafe staging path'
	rm -rf -- "$stage"
	log "local capture removed after successful upload"
	"$SCRIPT_DIR/notify.sh" success
}

capture_locked() {
	local backup_id="$1" stage="$2"
	[[ "$(id -u)" == 0 ]] || fail 'locked capture requires root'
	[[ "${KREDITOZROUTI_CAPTURE_LOCKED:-}" == 1 ]] || fail 'capture must be started through toolkit with-lock'
	[[ "$stage" == "$STAGING_ROOT/$backup_id" ]] || fail 'unexpected capture path'
	[[ ! -e "$stage" && ! -L "$stage" ]] || fail 'capture path already exists'
	mkdir -m 0700 -- "$stage"
	INCOMPLETE_STAGE="$stage"
	CAPTURE_COMPLETE=0
	cleanup_incomplete() {
		if ((CAPTURE_COMPLETE == 0)) && [[ "$INCOMPLETE_STAGE" == "$STAGING_ROOT/"* && -d "$INCOMPLETE_STAGE" && ! -L "$INCOMPLETE_STAGE" ]]; then
			rm -rf -- "$INCOMPLETE_STAGE"
		fi
	}
	trap cleanup_incomplete EXIT

	local app_id web_id mcp_id mysql_id redis_id umami_id mysql_version pg_version toolkit_version captured_at_started captured_at_finished mysql_database umami_database
	local -a scraper_ids=() application_ids=()
	captured_at_started="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
	app_id="$(one_container kreditozrouti api)"
	web_id="$(one_container kreditozrouti web)"
	mcp_id="$(one_container kreditozrouti mcp)"
	mapfile -t scraper_ids < <(docker ps --filter 'label=com.docker.compose.project=kreditozrouti' --filter 'label=com.docker.compose.service=scraper' --format '{{.ID}}')
	((${#scraper_ids[@]} > 0)) || fail 'expected at least one production scraper container'
	application_ids=("$app_id" "$web_id" "$mcp_id" "${scraper_ids[@]}")
	mysql_id="$(one_container kreditozrouti mysql)"
	redis_id="$(one_container kreditozrouti redis)"
	umami_id="$(one_container kreditozrouti-monitoring umami-db)"

	log "capturing MySQL database"
	docker exec "$mysql_id" sh -ceu 'export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"; exec mysqldump --user=root --single-transaction --routines --events --triggers --hex-blob --no-tablespaces --default-character-set=utf8mb4 --databases "$MYSQL_DATABASE"' >"$stage/mysql.sql"
	mysql_version="$(docker exec "$mysql_id" sh -ceu 'export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"; exec mysql --user=root --batch --skip-column-names -e "SELECT VERSION()"')"

	log "capturing Umami PostgreSQL database"
	docker exec "$umami_id" sh -ceu 'export PGPASSWORD="$POSTGRES_PASSWORD"; exec pg_dump --format=custom --no-owner --no-privileges --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' >"$stage/umami.dump"
	pg_version="$(docker exec "$umami_id" sh -ceu 'export PGPASSWORD="$POSTGRES_PASSWORD"; exec psql --no-psqlrc --tuples-only --no-align --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" -c "SHOW server_version"')"

	log "capturing allowlisted Redis keys"
	cat "$SCRIPT_DIR/redis-export.js" | docker exec -i "$app_id" node - >"$stage/redis.json"

	mysql_database="$(docker exec "$mysql_id" sh -ceu 'printf %s "$MYSQL_DATABASE"')"
	umami_database="$(docker exec "$umami_id" sh -ceu 'printf %s "$POSTGRES_DB"')"
	toolkit_version="$("$TOOLKIT_BIN" version | sed -n 's/^toolkit_version=\([^ ]*\).*/\1/p')"
	[[ -n "$toolkit_version" ]] || fail 'cannot read toolkit version'
	captured_at_finished="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"

	BACKUP_ID="$backup_id" CAPTURED_AT_STARTED="$captured_at_started" CAPTURED_AT_FINISHED="$captured_at_finished" \
	MYSQL_DATABASE="$mysql_database" MYSQL_VERSION="$mysql_version" \
	UMAMI_DATABASE="$umami_database" UMAMI_VERSION="$pg_version" TOOLKIT_VERSION="$toolkit_version" \
	python3 - "$stage/manifest.json" "$SCRIPT_DIR/../toolkit.lock" "$mysql_id" "$umami_id" "$redis_id" "${application_ids[@]}" <<'PY'
import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path

manifest_path = Path(sys.argv[1])
lock_path = Path(sys.argv[2])
mysql_id, umami_id, redis_id, *application_ids = sys.argv[3:]
root = manifest_path.parent

def read_lock(path):
    values = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            raise SystemExit("toolkit pin contains a malformed line")
        key, value = line.split("=", 1)
        if key in values:
            raise SystemExit(f"toolkit pin duplicates {key}")
        values[key] = value
    required = ("TOOLKIT_VERSION", "TOOLKIT_SOURCE_COMMIT", "TOOLKIT_ARCHIVE_SHA256")
    if any(not values.get(key) for key in required):
        raise SystemExit("toolkit pin is missing recovery identity fields")
    if values["TOOLKIT_VERSION"] != os.environ["TOOLKIT_VERSION"]:
        raise SystemExit("installed toolkit version does not match the pinned bundle")
    if not re.fullmatch(r"[0-9a-f]{40,64}", values["TOOLKIT_SOURCE_COMMIT"]):
        raise SystemExit("toolkit source commit pin is invalid")
    if not re.fullmatch(r"[a-f0-9]{64}", values["TOOLKIT_ARCHIVE_SHA256"]):
        raise SystemExit("toolkit archive checksum pin is invalid")
    return {
        "version": values["TOOLKIT_VERSION"],
        "sourceCommit": values["TOOLKIT_SOURCE_COMMIT"],
        "archiveSha256": values["TOOLKIT_ARCHIVE_SHA256"],
    }

def latest_release(path, repository, environment, actions, label):
    records = []
    for record_path in path.glob("*.json"):
        if record_path.is_symlink() or not record_path.is_file():
            raise SystemExit(f"unsafe {label} operation record: {record_path.name}")
        try:
            record = json.loads(record_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            raise SystemExit(f"unreadable {label} operation record: {record_path.name}") from error
        if record.get("repository") != repository or record.get("environment") != environment:
            raise SystemExit(f"operation identity mismatch: {record_path.name}")
        if record.get("action") in actions:
            records.append(record)
    if not records:
        raise SystemExit(f"no toolkit {label} release is recorded")
    latest = max(records, key=lambda item: (item.get("started_at") or "", item.get("operation_id") or ""))
    if latest.get("state") != "succeeded" or not isinstance(latest.get("release_id"), str) or not latest["release_id"]:
        raise SystemExit(f"latest toolkit {label} operation is not a successful release")
    return latest["release_id"]

def image(container_id, application=False):
    inspected = json.loads(subprocess.check_output(["docker", "inspect", container_id], text=True))[0]
    config = inspected.get("Config", {})
    labels = config.get("Labels") or {}
    config_hash = labels.get("com.docker.compose.config-hash")
    if not isinstance(config_hash, str) or not re.fullmatch(r"[a-f0-9]{64}", config_hash):
        raise SystemExit(f"container has no valid Compose configuration hash: {config.get('Image', 'unknown')}")
    image_id = inspected.get("Image", "")
    digests = json.loads(subprocess.check_output(["docker", "image", "inspect", "--format", "{{json .RepoDigests}}", image_id], text=True))
    if not isinstance(digests, list) or not any(isinstance(value, str) and "@sha256:" in value for value in digests):
        raise SystemExit(f"image is missing an immutable registry digest: {config.get('Image', 'unknown')}")
    result = {"reference": config.get("Image", "unknown"), "imageId": image_id, "registryDigests": digests, "composeConfigHash": config_hash}
    if application:
        reference = config.get("Image", "")
        revision = labels.get("org.opencontainers.image.revision", "") or reference.rsplit(":", 1)[-1]
        if not re.fullmatch(r"[0-9a-f]{7,64}", revision):
            raise SystemExit(f"application image has no source revision: {config.get('Image', 'unknown')}")
        result["revision"] = revision
        result["service"] = (labels.get("com.docker.compose.service") or "unknown")
    return result

toolkit_pin = read_lock(lock_path)
application_release_id = latest_release(
    Path("/var/lib/toolkit/operations/kreditozrouti/production"),
    "kreditozrouti", "production", {"deploy", "rollback"}, "application",
)
proxy_release_id = latest_release(
    Path("/var/lib/toolkit/operations/infrastructure/production"),
    "infrastructure", "production", {"proxy"}, "shared proxy",
)
mysql_image = image(mysql_id)
umami_image = image(umami_id)
redis_image = image(redis_id)
application_images = [image(container_id, application=True) for container_id in application_ids]
configuration_material = {
    "applicationReleaseId": application_release_id,
    "proxyReleaseId": proxy_release_id,
    "composeConfigHashes": sorted(
        record["composeConfigHash"]
        for record in [mysql_image, umami_image, redis_image] + application_images
    ),
}
configuration_revision = hashlib.sha256(
    json.dumps(configuration_material, sort_keys=True, separators=(",", ":")).encode("utf-8")
).hexdigest()

manifest = {
    "schemaVersion": 1,
    "repository": "kreditozrouti",
    "environment": "production",
    "backupSetId": os.environ["BACKUP_ID"],
    "captureWindow": {
        "startedAt": os.environ["CAPTURED_AT_STARTED"],
        "completedAt": os.environ["CAPTURED_AT_FINISHED"],
    },
    "toolkitVersion": os.environ["TOOLKIT_VERSION"],
    "sources": {
        "mysql": {"database": os.environ["MYSQL_DATABASE"], "serverVersion": os.environ["MYSQL_VERSION"], "image": mysql_image},
        "umamiPostgresql": {"database": os.environ["UMAMI_DATABASE"], "serverVersion": os.environ["UMAMI_VERSION"], "image": umami_image},
        "redis": {"image": redis_image, "serverVersion": json.loads((root / "redis.json").read_text(encoding="utf-8"))["redisVersion"], "dataFile": "redis.json"},
        "applicationImages": application_images,
    },
    "toolkitBundle": toolkit_pin,
    "recoveryDependencies": {
        "applicationReleaseId": application_release_id,
        "proxyReleaseId": proxy_release_id,
        "proxyContractVersion": "handoff-v1",
        "configurationRevision": configuration_revision,
        "releaseManifestSha256": None,
    },
    "files": {},
}
for name in ("mysql.sql", "umami.dump", "redis.json"):
    digest = hashlib.sha256()
    with (root / name).open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    manifest["files"][name] = {"sha256": digest.hexdigest(), "bytes": (root / name).stat().st_size}
(root / "manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
PY
	(
		cd "$stage"
		sha256sum mysql.sql umami.dump redis.json manifest.json > SHA256SUMS
		printf 'complete\n' > .complete
	)
	chmod 0600 "$stage"/*
	CAPTURE_COMPLETE=1
	INCOMPLETE_STAGE=''
	log "capture set complete: $backup_id"
}

one_container() {
	local project="$1" service="$2"; shift 2
	local -a ids=()
	mapfile -t ids < <(docker ps --filter "label=com.docker.compose.project=$project" --filter "label=com.docker.compose.service=$service" --format '{{.ID}}')
	((${#ids[@]} == 1)) || fail "expected one running $project/$service container, found ${#ids[@]}"
	printf '%s\n' "${ids[0]}"
}

usage() {
	cat <<'USAGE'
Usage:
  capture.sh --confirm-production
  capture.sh --upload-staged <backup-set-id>

Production capture needs root, the installed Infrastructure toolkit, Docker access,
Kopia 0.23.1 config, and KOPIA_PASSWORD from a root-only service environment.
USAGE
}

main() {
	require_root
	ensure_private_dir "$STATE_ROOT"
	ensure_private_dir "$STAGING_ROOT"
	ensure_private_dir "$RESULT_ROOT"
	ensure_private_dir "$RESTORE_ROOT"
	case "${1:-}" in
		--upload-staged)
			[[ $# == 2 ]] || { usage >&2; exit 2; }
			start_operation
			upload_staged "$2"
			;;
		--confirm-production)
			[[ $# == 1 ]] || { usage >&2; exit 2; }
			[[ -x "$TOOLKIT_BIN" ]] || fail "Infrastructure toolkit missing: $TOOLKIT_BIN"
			command -v docker >/dev/null 2>&1 || fail 'docker is required'
			command -v python3 >/dev/null 2>&1 || fail 'python3 is required'
			command -v sha256sum >/dev/null 2>&1 || fail 'sha256sum is required'
			start_operation
			require_kopia_config
			local backup_id stage
			backup_id="$(date -u +'%Y%m%dT%H%M%SZ')-$$"
			stage="$STAGING_ROOT/$backup_id"
			"$TOOLKIT_BIN" with-lock --repository "$REPOSITORY" --environment "$ENVIRONMENT" --timeout 600 -- \
			env KREDITOZROUTI_CAPTURE_LOCKED=1 "$SCRIPT_DIR/capture.sh" --capture-locked "$backup_id" "$stage"
			upload_staged "$backup_id"
			;;
		--capture-locked)
			[[ $# == 3 ]] || { usage >&2; exit 2; }
			capture_locked "$2" "$3"
			;;
		-h|--help)
			usage
			;;
		*)
			usage >&2
			exit 2
			;;
	esac
}

main "$@"
