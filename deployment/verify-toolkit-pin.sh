#!/usr/bin/env bash
# Managed by Infrastructure toolkit vendoring (docs/toolkit/consumers.md). Do not edit this copy.
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
readonly SCRIPT_DIR
bundle_dir="${1:-$SCRIPT_DIR}"
[[ $# -le 1 && -d "$bundle_dir" ]] || {
  printf 'usage: verify-toolkit-pin.sh [deployment-directory]\n' >&2
  exit 2
}
readonly bundle_dir
lock="$bundle_dir/toolkit.lock"
[[ -f "$lock" && ! -L "$lock" ]] || {
  printf 'missing %s; vendor a toolkit release from Infrastructure first\n' "$lock" >&2
  exit 1
}
version="$(awk -F= '$1 == "TOOLKIT_VERSION" { if (seen++) exit 2; print substr($0, index($0, "=") + 1) } END { if (!seen) exit 1 }' "$lock")"
[[ "$version" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]] || {
  printf 'toolkit pin has an invalid version\n' >&2
  exit 1
}
archive="$bundle_dir/vendor/toolkit/toolkit-$version.tar.gz"
bash "$SCRIPT_DIR/vendor/toolkit/validate-lock.sh" "$lock" "$archive"

# Every managed copy that is present must equal the pinned release. Installed control
# directories may hold a subset; archives older than 0.10.0 carry no managed copies.
if [[ -f "$bundle_dir/vendor/toolkit/toolkit.lock" ]] && ! cmp -s -- "$lock" "$bundle_dir/vendor/toolkit/toolkit.lock"; then
  printf 'vendor/toolkit/toolkit.lock differs from toolkit.lock; re-vendor instead of editing pins\n' >&2
  exit 1
fi
names="$(tar -tzf "$archive")"
if [[ $'\n'"$names"$'\n' == *$'\ntoolkit/consumer/verify-toolkit-pin.sh\n'* ]]; then
  for managed in validate-lock.sh:vendor/toolkit/validate-lock.sh verify-toolkit-pin.sh:verify-toolkit-pin.sh install-toolkit.sh:install-toolkit.sh; do
    copy="$bundle_dir/${managed#*:}"
    [[ -e "$copy" ]] || continue
    tar -xOzf "$archive" "toolkit/consumer/${managed%%:*}" | cmp -s -- - "$copy" || {
      printf '%s differs from toolkit %s; re-vendor instead of editing managed files\n' "${managed#*:}" "$version" >&2
      exit 1
    }
  done
fi
