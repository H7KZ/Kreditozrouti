#!/usr/bin/env bash
# Managed by Infrastructure toolkit vendoring (docs/toolkit/consumers.md). Do not edit this copy.
# Installs the pinned toolkit with the installer from that same release:
#   sudo bash deployment/install-toolkit.sh --ci-only --deploy-user USER   # CI runner only
#   sudo bash deployment/install-toolkit.sh --deploy-user USER [--activate]
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
readonly SCRIPT_DIR
[[ "$(id -u)" == 0 ]] || {
  printf 'Run with sudo as root.\n' >&2
  exit 1
}

bash "$SCRIPT_DIR/verify-toolkit-pin.sh"
version="$(awk -F= '$1 == "TOOLKIT_VERSION" { if (seen++) exit 2; print substr($0, index($0, "=") + 1) } END { if (!seen) exit 1 }' "$SCRIPT_DIR/toolkit.lock")"
archive="$SCRIPT_DIR/vendor/toolkit/toolkit-$version.tar.gz"
checksum="$archive.sha256"
temporary="$(mktemp -d /tmp/toolkit-bootstrap.XXXXXXXX)"
trap 'rm -rf -- "$temporary"' EXIT

tar -xzf "$archive" --no-same-owner --no-same-permissions -C "$temporary"
bash "$temporary/toolkit/packaging/install.sh" --archive "$archive" --checksum "$checksum" "$@"
[[ " $* " == *' --activate '* ]] || printf 'Host CLI not activated; rerun with --activate to select this release.\n'
