#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
readonly SCRIPT_DIR
[[ "$(id -u)" == 0 ]] || { printf 'Run with sudo as root.\n' >&2; exit 1; }

bash "$SCRIPT_DIR/verify-toolkit-pin.sh"
version="$(awk -F= '$1 == "TOOLKIT_VERSION" { if (seen++) exit 2; print substr($0, index($0, "=") + 1) } END { if (!seen) exit 1 }' "$SCRIPT_DIR/toolkit.lock")"
archive="$SCRIPT_DIR/vendor/toolkit/toolkit-$version.tar.gz"
checksum="$archive.sha256"
temporary="$(mktemp -d /tmp/toolkit-bootstrap.XXXXXXXX)"
trap 'rm -rf -- "$temporary"' EXIT

tar -xzf "$archive" --no-same-owner --no-same-permissions -C "$temporary"
bash "$temporary/toolkit/packaging/bootstrap-install.sh" "$archive" "$checksum"
printf 'installed toolkit release %s inactive; activate explicitly with:\n' "$version"
printf '  sudo /opt/toolkit/releases/%s/bin/toolkit activate %s\n' "$version" "$version"
