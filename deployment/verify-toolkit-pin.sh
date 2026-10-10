#!/usr/bin/env bash
set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
version="$(awk -F= '$1 == "TOOLKIT_VERSION" { if (seen++) exit 2; print substr($0, index($0, "=") + 1) } END { if (!seen) exit 1 }' "$SCRIPT_DIR/toolkit.lock")"
[[ "$version" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]] || {
	printf 'toolkit pin has an invalid version\n' >&2
	exit 1
}
exec bash "$SCRIPT_DIR/vendor/toolkit/validate-lock.sh" \
	"$SCRIPT_DIR/toolkit.lock" "$SCRIPT_DIR/vendor/toolkit/toolkit-$version.tar.gz"
