#!/usr/bin/env bash
set -euo pipefail
[[ $# == 0 && $(id -u) != 0 ]] || { echo 'usage: retain.sh as the deployment user' >&2; exit 2; }
exec sudo -n /usr/local/bin/toolkit with-lock --repository kreditozrouti --environment monitoring --action maintenance --timeout 1800 -- \
  /usr/local/libexec/kreditozrouti-umami-retention/retain-worker.sh --home "$HOME"
