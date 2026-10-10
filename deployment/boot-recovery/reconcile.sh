#!/usr/bin/env bash
set -euo pipefail
[[ $# == 0 ]] || { echo 'usage: reconcile.sh' >&2; exit 2; }
readonly APP="kreditozrouti"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
pin="$script_dir/toolkit.lock"
[[ -f "$pin" ]] || pin="$script_dir/../toolkit.lock"
expected="$(awk -F= '$1 == "TOOLKIT_VERSION" { if (seen++) exit 2; print $2 } END { if (!seen) exit 1 }' "$pin")"
[[ "$(printf '%s\n' 0.8.1 "$expected" | sort -V | head -1)" == 0.8.1 ]] || { echo 'ERROR: snapshot API requires reviewed toolkit >=0.8.1' >&2; exit 1; }
actual="$(/usr/local/bin/toolkit version | sed -n 's/^toolkit_version=\([^ ]*\).*/\1/p')"
[[ "$actual" == "$expected" ]] || { echo 'ERROR: toolkit pin mismatch' >&2; exit 1; }
failures=0
for target in production development monitoring; do
  sudo -n /usr/local/bin/toolkit reconcile --repository "$APP" --environment "$target" \
    --root "$HOME/$APP/versions/$target" --user "$(id -un)" || failures=1
done
exit "$failures"
