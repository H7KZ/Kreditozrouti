#!/usr/bin/env bash
set -euo pipefail
[[ $# == 2 && "$1" == --user && "$2" =~ ^[A-Za-z_][A-Za-z0-9_.-]{0,31}$ && "$2" != root ]] || { echo 'usage: sudo install.sh --user <deploy-user>' >&2; exit 2; }
[[ $EUID == 0 ]] || { echo 'ERROR: root required' >&2; exit 1; }
deploy_user="$2"
entry="$(getent passwd "$deploy_user")"
[[ "$(cut -d: -f3 <<< "$entry")" != 0 ]] || exit 1
deploy_home="$(cut -d: -f6 <<< "$entry")"
[[ "$deploy_home" =~ ^/[A-Za-z0-9_./-]+$ && -d "$deploy_home" && ! -L "$deploy_home" ]] || exit 1
here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
install -d -o root -g root -m 755 /usr/local/libexec/kreditozrouti-umami-retention
install -o root -g root -m 700 "$here/retain-worker.sh" /usr/local/libexec/kreditozrouti-umami-retention/retain-worker.sh
sed -e "s|__USER__|$deploy_user|g" -e "s|__HOME__|$deploy_home|g" "$here/kreditozrouti-umami-retention.service" > /etc/systemd/system/kreditozrouti-umami-retention.service
chmod 644 /etc/systemd/system/kreditozrouti-umami-retention.service
install -o root -g root -m 644 "$here/kreditozrouti-umami-retention.timer" /etc/systemd/system/kreditozrouti-umami-retention.timer
systemctl daemon-reload
echo 'Installed. Timer activation is a separate operator action after a manual run.'
