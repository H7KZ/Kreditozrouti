#!/usr/bin/env bash
set -euo pipefail
[[ $# == 0 ]] || { echo 'usage: reconcile.sh' >&2; exit 2; }
readonly APP="kreditozrouti"
actual="$(/usr/local/bin/toolkit version | sed -n 's/^toolkit_version=\([^ ]*\).*/\1/p')"
[[ "$actual" =~ ^0\.[0-9]+\.[0-9]+$ && "$(printf '%s\n' 0.8.1 "$actual" | sort -V | head -1)" == 0.8.1 ]] || { echo 'Host toolkit snapshot API requires >=0.8.1, <1.0.0' >&2; exit 1; }
failures=0
for target in production development monitoring; do
  sudo -n /usr/local/bin/toolkit reconcile --repository "$APP" --environment "$target" \
    --root "$HOME/$APP/versions/$target" --user "$(id -un)" || failures=1
done
exit "$failures"
