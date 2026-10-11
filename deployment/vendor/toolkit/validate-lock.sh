#!/usr/bin/env bash
set -euo pipefail

if (($# != 2)); then
  printf 'Usage: %s <consumer-lock> <release-archive>\n' "$0" >&2
  exit 2
fi
lock="$1"
archive="$2"
temporary="$(mktemp -d)"
trap 'rm -rf -- "$temporary"' EXIT

read_value() {
  local path="$1" key="$2" found
  found="$(awk -F= -v key="$key" '$1 == key { if (seen++) exit 2; print substr($0, index($0, "=") + 1) } END { if (!seen) exit 1 }' "$path")" || return 1
  printf '%s' "$found"
}

[[ -f "$lock" && -r "$lock" && ! -L "$lock" ]] || {
  printf 'consumer lock must be a readable regular file\n' >&2
  exit 1
}
[[ -f "$archive" && -r "$archive" && ! -L "$archive" ]] || {
  printf 'consumer bundle archive must be a readable regular file\n' >&2
  exit 1
}
digest="$(read_value "$lock" TOOLKIT_ARCHIVE_SHA256)" || {
  printf 'consumer lock is missing or duplicates archive SHA-256\n' >&2
  exit 1
}
[[ "$digest" =~ ^[a-f0-9]{64}$ ]] || {
  printf 'consumer archive SHA-256 is invalid\n' >&2
  exit 1
}
actual="$(sha256sum -- "$archive" | awk '{print $1}')"
[[ "$digest" == "$actual" ]] || {
  printf 'consumer archive SHA-256 does not match pinned bundle\n' >&2
  exit 1
}

tar -tzf "$archive" --quoting-style=escape >"$temporary/names" || {
  printf 'consumer bundle is not a readable gzip tar archive\n' >&2
  exit 1
}
tar -tvzf "$archive" --quoting-style=escape >"$temporary/details" || {
  printf 'cannot inspect consumer bundle entries\n' >&2
  exit 1
}
declare -A seen=()
declare -a segments=()
manifest_count=0
while IFS= read -r entry || [[ -n "$entry" ]]; do
  [[ "$entry" != *\\* ]] || {
    printf 'consumer bundle contains an escaped path\n' >&2
    exit 1
  }
  normalized="${entry%/}"
  [[ "$normalized" =~ ^toolkit(/[A-Za-z0-9._-]+)*$ ]] || {
    printf 'consumer bundle contains an unsafe path: %s\n' "$entry" >&2
    exit 1
  }
  IFS='/' read -r -a segments <<<"$normalized"
  for segment in "${segments[@]}"; do
    [[ "$segment" != . && "$segment" != .. ]] || {
      printf 'consumer bundle contains a traversal path: %s\n' "$entry" >&2
      exit 1
    }
  done
  [[ -z "${seen["$normalized"]+present}" ]] || {
    printf 'consumer bundle contains a duplicate path: %s\n' "$entry" >&2
    exit 1
  }
  seen["$normalized"]=1
  [[ "$normalized" == toolkit/MANIFEST ]] && ((manifest_count += 1))
done <"$temporary/names"
while IFS= read -r entry || [[ -n "$entry" ]]; do
  case "${entry:0:1}" in
  - | d) ;;
  *)
    printf 'consumer bundle may contain only regular files and directories\n' >&2
    exit 1
    ;;
  esac
done <"$temporary/details"
[[ "$manifest_count" == 1 && -n "${seen[toolkit]+present}" && -n "${seen["toolkit/VERSION"]+present}" && -n "${seen["toolkit/bin/toolkit"]+present}" ]] || {
  printf 'consumer bundle is missing required toolkit files\n' >&2
  exit 1
}
tar -xOf "$archive" toolkit/MANIFEST >"$temporary/MANIFEST" || {
  printf 'cannot read manifest from consumer bundle\n' >&2
  exit 1
}
tar -xOf "$archive" toolkit/VERSION >"$temporary/VERSION" || {
  printf 'cannot read VERSION from consumer bundle\n' >&2
  exit 1
}

for key in VERSION BUNDLE_FORMAT_VERSION TOOLKIT_HELPER_API_VERSION HOST_CONFIG_SCHEMA_VERSION STATUS_SCHEMA_VERSION IMAGE_PROTECTION_SCHEMA_VERSION BACKUP_RECOVERY_REFERENCE_SCHEMA_VERSION DEVELOPMENT_RELEASE_MANIFEST_SCHEMA_VERSION SUPPORTED_OS SUPPORTED_ARCHITECTURES DOCKER_ENGINE_RANGE DOCKER_COMPOSE_RANGE PROXY_BUNDLE_VERSION PLUGIN_PINS IMAGE_PINS SOURCE_COMMIT; do
  value="$(read_value "$temporary/MANIFEST" "$key")" || {
    printf 'release manifest is missing or duplicates %s\n' "$key" >&2
    exit 1
  }
  case "$key" in
  VERSION) lock_key=TOOLKIT_VERSION ;;
  SOURCE_COMMIT) lock_key=TOOLKIT_SOURCE_COMMIT ;;
  *) lock_key="$key" ;;
  esac
  pinned="$(read_value "$lock" "$lock_key")" || {
    printf 'consumer lock is missing or duplicates %s\n' "$lock_key" >&2
    exit 1
  }
  [[ "$value" == "$pinned" ]] || {
    printf 'consumer pin mismatch for %s\n' "$lock_key" >&2
    exit 1
  }
done

[[ "$(read_value "$temporary/VERSION" TOOLKIT_VERSION 2>/dev/null || cat "$temporary/VERSION")" == "$(read_value "$lock" TOOLKIT_VERSION)" ]] || {
  printf 'consumer bundle VERSION does not match its pin\n' >&2
  exit 1
}

printf 'consumer toolkit pin valid version=%s source_commit=%s\n' "$(read_value "$lock" TOOLKIT_VERSION)" "$(read_value "$lock" TOOLKIT_SOURCE_COMMIT)"
