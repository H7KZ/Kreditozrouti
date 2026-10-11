#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
readonly SCRIPT_DIR
bundle_dir="${1:-$SCRIPT_DIR}"
[[ $# -le 1 && -d "$bundle_dir" ]] || { printf 'usage: verify-toolkit-pin.sh [deployment-directory]\n' >&2; exit 1; }
readonly bundle_dir
version="$(awk -F= '$1 == "TOOLKIT_VERSION" { if (seen++) exit 2; print substr($0, index($0, "=") + 1) } END { if (!seen) exit 1 }' "$bundle_dir/toolkit.lock")"
[[ "$version" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]] || {
	printf 'toolkit pin has an invalid version\n' >&2
	exit 1
}
exec bash "$SCRIPT_DIR/vendor/toolkit/validate-lock.sh" \
	"$bundle_dir/toolkit.lock" "$bundle_dir/vendor/toolkit/toolkit-$version.tar.gz"
