#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# install.sh — install the docker-boot-recovery systemd unit.
#
# Run once on the VPS, as root:
#
#   sudo bash deployment/boot-recovery/install.sh
#
# Idempotent — re-run any time (e.g. after editing the unit file) to reinstall.
# ==============================================================================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly UNIT_NAME="docker-boot-recovery.service"
readonly SRC="${SCRIPT_DIR}/${UNIT_NAME}"
readonly DEST="/etc/systemd/system/${UNIT_NAME}"

[[ $EUID -eq 0 ]] || { echo "Run as root (sudo)." >&2; exit 1; }
[[ -f "$SRC" ]] || { echo "Unit file not found: $SRC" >&2; exit 1; }

echo "Installing ${UNIT_NAME}"

cp "$SRC" "$DEST"
chmod 644 "$DEST"

systemctl daemon-reload
systemctl enable "$UNIT_NAME"

echo "Installed and enabled. Test now with:  sudo systemctl start ${UNIT_NAME}"
echo "Check result with:                     systemctl status ${UNIT_NAME}"
