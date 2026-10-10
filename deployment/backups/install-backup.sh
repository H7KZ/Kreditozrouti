#!/usr/bin/env bash
set -euo pipefail

# Installs the Kreditozrouti backup component list and systemd units on the host.
#
#   sudo bash deployment/backups/install-backup.sh
#
# Does NOT enable the timers and does NOT write credentials. Create
# /etc/toolkit/backup/kreditozrouti.env (root, 0600) first; see deployment/backups/README.md.
# The component list is copied to a root-owned path because root executes it; never point the
# host config at a file inside the deploy user's release tree.

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
libexec=/usr/local/libexec/kreditozrouti-backup

[[ $EUID -eq 0 ]] || {
  echo 'Run as root (sudo).' >&2
  exit 1
}
[[ -x /usr/local/bin/toolkit ]] || {
  echo 'Install and activate the pinned toolkit first (deployment/install-toolkit.sh).' >&2
  exit 1
}
pinned="$(awk -F= '$1 == "TOOLKIT_VERSION" { print $2 }' "$script_dir/../toolkit.lock")"
active="$(/usr/local/bin/toolkit version | sed -n 's/^toolkit_version=\([^ ]*\).*/\1/p')"
[[ -n "$pinned" && "$pinned" == "$active" ]] || {
  echo "Active toolkit '$active' does not match deployment/toolkit.lock '$pinned'." >&2
  exit 1
}
/usr/local/bin/toolkit backup install-tools

install -d -o root -g root -m 0755 /usr/local/libexec "$libexec"
install -o root -g root -m 0644 "$script_dir/components.sh" "$libexec/components.sh"
install -d -o root -g root -m 0700 /etc/toolkit /etc/toolkit/backup
for unit in toolkit-backup@.service toolkit-backup@kreditozrouti-4h.timer toolkit-backup@kreditozrouti-daily.timer; do
  install -o root -g root -m 0644 "$script_dir/$unit" "/etc/systemd/system/$unit"
done
systemctl daemon-reload

echo 'Installed. Timers are NOT enabled.'
echo 'After creating /etc/toolkit/backup/kreditozrouti.env and a manual run succeeds:'
echo '  systemctl start toolkit-backup@kreditozrouti-4h.service'
echo '  systemctl enable --now toolkit-backup@kreditozrouti-4h.timer toolkit-backup@kreditozrouti-daily.timer'
