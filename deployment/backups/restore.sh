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
expected = {".complete", "SHA256SUMS", "manifest.json", "recovery-release-manifest.json", "mysql.sql", "redis.json", "umami.dump"}
items = list(os.scandir(root))
if {item.name for item in items} != expected:
    raise SystemExit("snapshot file set mismatch")
if any(not item.is_file(follow_symlinks=False) for item in items):
    raise SystemExit("snapshot contains a non-regular entry")
if (root / ".complete").read_text(encoding="ascii") != "complete\n":
    raise SystemExit("snapshot completion marker is invalid")
checksum_lines = (root / "SHA256SUMS").read_text(encoding="ascii").splitlines()
if len(checksum_lines) != 5:
    raise SystemExit("snapshot checksum list is malformed")
names = set()
for line in checksum_lines:
    if len(line) < 67 or line[64:66] != "  " or any(character not in "0123456789abcdef" for character in line[:64]):
        raise SystemExit("snapshot checksum entry is malformed")
    name = line[66:]
    if name not in {"mysql.sql", "umami.dump", "redis.json", "recovery-release-manifest.json", "manifest.json"}:
        raise SystemExit("snapshot checksum path is unexpected")
    names.add(name)
if names != {"mysql.sql", "umami.dump", "redis.json", "recovery-release-manifest.json", "manifest.json"}:
    raise SystemExit("snapshot checksum list is incomplete")
PY
	(
		cd "$destination"
		sha256sum --check SHA256SUMS
	)
	python3 - "$destination/manifest.json" <<'PY'
import hashlib
import json
import re
import sys
from pathlib import Path

manifest = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
if manifest.get("schemaVersion") != 1:
    raise SystemExit("unsupported backup manifest schema")
if manifest.get("repository") != "kreditozrouti" or manifest.get("environment") != "production":
    raise SystemExit("backup manifest identity mismatch")
toolkit_version = manifest.get("toolkitVersion")
if not isinstance(toolkit_version, str) or not re.fullmatch(r"(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?", toolkit_version):
    raise SystemExit("backup manifest toolkit version is not semantic versioning")
toolkit_bundle = manifest.get("toolkitBundle")
if not isinstance(toolkit_bundle, dict) or toolkit_bundle.get("version") != toolkit_version:
    raise SystemExit("backup manifest toolkit bundle version does not match")
if not isinstance(toolkit_bundle.get("sourceCommit"), str) or not re.fullmatch(r"[0-9a-f]{40,64}", toolkit_bundle["sourceCommit"]):
    raise SystemExit("backup manifest toolkit source commit is invalid")
if not isinstance(toolkit_bundle.get("archiveSha256"), str) or not re.fullmatch(r"[0-9a-f]{64}", toolkit_bundle["archiveSha256"]):
    raise SystemExit("backup manifest toolkit archive checksum is invalid")
dependencies = manifest.get("recoveryDependencies")
if not isinstance(dependencies, dict):
    raise SystemExit("backup manifest recovery dependencies are missing")
for field in ("applicationReleaseId", "proxyReleaseId"):
    if not isinstance(dependencies.get(field), str) or not dependencies[field].strip():
        raise SystemExit(f"backup manifest recovery dependency is missing: {field}")
if dependencies.get("proxyContractVersion") != "handoff-v1":
    raise SystemExit("backup manifest proxy contract version is unsupported")
if not isinstance(dependencies.get("configurationRevision"), str) or not re.fullmatch(r"[0-9a-f]{64}", dependencies["configurationRevision"]):
    raise SystemExit("backup manifest configuration revision is invalid")
release_manifest_hash = dependencies.get("releaseManifestSha256")
if not isinstance(release_manifest_hash, str) or not re.fullmatch(r"[0-9a-f]{64}", release_manifest_hash):
    raise SystemExit("backup manifest release manifest checksum is invalid")
required = {"mysql.sql", "umami.dump", "redis.json", "recovery-release-manifest.json"}
if set(manifest.get("files", {})) != required:
    raise SystemExit("backup manifest file set mismatch")
release_path = Path(sys.argv[1]).parent / "recovery-release-manifest.json"
release_bytes = release_path.read_bytes()
if hashlib.sha256(release_bytes).hexdigest() != release_manifest_hash:
    raise SystemExit("canonical recovery release manifest checksum mismatch")
recovery_release = json.loads(release_bytes.decode("utf-8"))
if not isinstance(recovery_release, dict) or recovery_release.get("schema_version") != 1 or recovery_release.get("repository") != "kreditozrouti" or recovery_release.get("environment") != "production":
    raise SystemExit("canonical recovery release manifest identity mismatch")
release_ids = recovery_release.get("release_ids")
if not isinstance(release_ids, dict) or release_ids.get("application") != dependencies.get("applicationReleaseId") or release_ids.get("proxy") != dependencies.get("proxyReleaseId"):
    raise SystemExit("canonical recovery release IDs do not match the backup manifest")
toolkit_bundle = recovery_release.get("toolkit_bundle")
if not isinstance(toolkit_bundle, dict) or toolkit_bundle != manifest.get("toolkitBundle"):
    raise SystemExit("canonical recovery toolkit bundle does not match the backup manifest")
source_manifests = recovery_release.get("source_manifests")
if not isinstance(source_manifests, list) or not source_manifests:
    raise SystemExit("canonical recovery release manifest has no source releases")
source_by_hash = {}
for source in source_manifests:
    if not isinstance(source, dict) or not isinstance(source.get("sha256"), str) or not re.fullmatch(r"[0-9a-f]{64}", source["sha256"]):
        raise SystemExit("canonical recovery source manifest record is malformed")
    if source["sha256"] in source_by_hash:
        raise SystemExit("canonical recovery release manifest contains duplicate source hashes")
    source_document = source.get("manifest")
    if not isinstance(source_document, dict):
        raise SystemExit("canonical recovery source manifest is not a JSON object")
    source_bytes = (json.dumps(source_document, sort_keys=True, indent=2) + "\n").encode("utf-8")
    if hashlib.sha256(source_bytes).hexdigest() != source["sha256"]:
        raise SystemExit("canonical recovery source manifest content checksum mismatch")
    services = source_document.get("services")
    source_commit = source_document.get("source_commit")
    run_id = source_document.get("workflow_run_id")
    run_attempt = source_document.get("workflow_run_attempt")
    if source_document.get("schema_version") != 1 or source_document.get("environment") != "development" or source_document.get("workflow_path") != ".github/workflows/deploy-all.yml":
        raise SystemExit("canonical recovery source release has an unsupported identity")
    if not isinstance(source_commit, str) or not re.fullmatch(r"[a-f0-9]{40}", source_commit) or not isinstance(run_id, str) or not re.fullmatch(r"[1-9][0-9]*", run_id) or not isinstance(run_attempt, str) or not re.fullmatch(r"[1-9][0-9]*", run_attempt):
        raise SystemExit("canonical recovery source release workflow identity is invalid")
    if not isinstance(services, dict) or set(services) != {"api", "web", "scraper", "mcp"} or any(not isinstance(value, str) or not re.fullmatch(r"sha256:[a-f0-9]{64}", value) for value in services.values()):
        raise SystemExit("canonical recovery source release service bindings are invalid")
    repository = source_document.get("repository")
    if not isinstance(repository, str) or not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository) or repository.rsplit("/", 1)[-1].lower() != "kreditozrouti":
        raise SystemExit("canonical recovery source release repository is invalid")
    source_by_hash[source["sha256"]] = source_document
images = recovery_release.get("images")
expected_image_services = {"api", "web", "scraper", "mcp", "mysql", "umami_postgresql", "redis"}
if not isinstance(images, dict) or set(images) != expected_image_services:
    raise SystemExit("canonical recovery image service set is invalid")
sources = manifest.get("sources", {})
for name, source_name in (("mysql", "mysql"), ("umami_postgresql", "umamiPostgresql"), ("redis", "redis")):
    image_records = images.get(name)
    if not isinstance(image_records, list) or len(image_records) != 1:
        raise SystemExit(f"canonical recovery {name} image record is missing")
    image = image_records[0]
    digests = image.get("registry_digests") if isinstance(image, dict) else None
    compose_hash = image.get("compose_config_hash") if isinstance(image, dict) else None
    outer_image = sources.get(source_name, {}).get("image")
    if not isinstance(digests, list) or not any(isinstance(value, str) and re.search(r"@sha256:[0-9a-f]{64}$", value) for value in digests):
        raise SystemExit(f"{name} recovery image is missing its immutable registry digest")
    if not isinstance(compose_hash, str) or not re.fullmatch(r"[0-9a-f]{64}", compose_hash):
        raise SystemExit(f"{name} recovery image Compose configuration hash is invalid")
    if not isinstance(outer_image, dict) or outer_image.get("registryDigests") != digests or outer_image.get("composeConfigHash") != compose_hash:
        raise SystemExit(f"{name} canonical image binding differs from the backup manifest")
    source_revision = image.get("source_revision")
    if source_revision is not None and (not isinstance(source_revision, str) or not re.fullmatch(r"[a-f0-9]{7,64}", source_revision)):
        raise SystemExit(f"{name} image source revision is invalid")
applications = sources.get("applicationImages")
if not isinstance(applications, list) or not applications:
    raise SystemExit("backup manifest has no application image references")
expected_applications = []
for service in ("api", "web", "scraper", "mcp"):
    records = images[service]
    if not isinstance(records, list) or not records:
        raise SystemExit(f"canonical recovery {service} image bindings are missing")
    for image in records:
        if not isinstance(image, dict):
            raise SystemExit("application recovery image binding is malformed")
        source_hash = image.get("source_manifest_sha256")
        if not isinstance(source_hash, str) or source_hash not in source_by_hash:
            raise SystemExit("application recovery image references an unknown source manifest")
        source_document = source_by_hash[source_hash]
        source_repository = source_document["repository"]
        source_commit = source_document["source_commit"]
        expected_digest = source_document["services"][service]
        digests = image.get("registry_digests")
        compose_hash = image.get("compose_config_hash")
        revision = image.get("source_revision")
        expected_image = f"ghcr.io/{source_repository.lower()}/{service}@{expected_digest}"
        if not isinstance(digests, list) or expected_image not in digests:
            raise SystemExit(f"{service} recovery image does not match its source release digest")
        if not isinstance(compose_hash, str) or not re.fullmatch(r"[0-9a-f]{64}", compose_hash):
            raise SystemExit(f"{service} recovery Compose configuration hash is invalid")
        if revision != source_commit:
            raise SystemExit(f"{service} image revision does not match its source release")
        expected_applications.append({
            "service": service,
            "sourceReleaseId": f"{source_commit}-{source_document['workflow_run_id']}-{source_document['workflow_run_attempt']}",
            "sourceManifestSha256": source_hash,
            "sourceRepository": source_repository,
            "sourceCommit": source_commit,
            "expectedImageDigest": expected_digest,
            "revision": revision,
            "registryDigests": digests,
            "composeConfigHash": compose_hash,
        })
expected_applications.sort(key=lambda item: (item["service"], item["sourceManifestSha256"], item["expectedImageDigest"], item["composeConfigHash"]))
if applications != expected_applications:
    raise SystemExit("backup application bindings do not match the canonical recovery release manifest")
source_manifest_hashes = sorted(source_by_hash)
configuration_material = {
    "release_ids": release_ids,
    "toolkit_bundle": toolkit_bundle,
    "source_manifest_hashes": source_manifest_hashes,
    "images": images,
}
configuration_revision = hashlib.sha256(json.dumps(configuration_material, sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest()
if recovery_release.get("configuration_revision") != configuration_revision or dependencies.get("configurationRevision") != configuration_revision:
    raise SystemExit("recovery configuration revision does not match its release and image bindings")
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
if manifest["files"]["recovery-release-manifest.json"]["sha256"] != release_manifest_hash:
    raise SystemExit("backup recovery release manifest file record does not match its dependency")
PY
	if [[ $# == 3 ]]; then
		local target_api="$3" target_project target_service recovery_redis allowed_ips
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
