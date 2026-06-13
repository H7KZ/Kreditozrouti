#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE="docker-boot-recovery.service"

cp "$SCRIPT_DIR/$SERVICE" /etc/systemd/system/
systemctl daemon-reload
systemctl enable "$SERVICE"

echo "Installed. Run 'systemctl start $SERVICE' or reboot to activate."
