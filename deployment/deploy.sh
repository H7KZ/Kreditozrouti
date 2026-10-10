#!/usr/bin/env bash
set -euo pipefail
[[ $# -ge 2 && "$1" =~ ^(deploy|stage|activate|rollback|reconcile)$ && "$2" =~ ^(production|development|monitoring)$ ]] || {
  echo 'usage: deploy.sh <deploy|stage|activate|rollback|reconcile> <environment> [toolkit snapshot arguments]' >&2; exit 2;
}
action="$1"; target="$2"; shift 2
pin="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/toolkit.lock"
expected="$(awk -F= '$1 == "TOOLKIT_VERSION" { if (seen++) exit 2; print $2 } END { if (!seen) exit 1 }' "$pin")"
[[ "$(printf '%s\n' 0.8.1 "$expected" | sort -V | head -1)" == 0.8.1 ]] || { echo 'ERROR: snapshot API requires toolkit >=0.8.1; await reviewed toolkit repin' >&2; exit 1; }
actual="$(/usr/local/bin/toolkit version | sed -n 's/^toolkit_version=\([^ ]*\).*/\1/p')"
[[ "$actual" == "$expected" ]] || { echo 'ERROR: host toolkit differs from toolkit.lock' >&2; exit 1; }
for arg in "$@"; do
  case "$arg" in --repository|--repository=*|--environment|--environment=*|--root|--root=*|--user|--user=*) echo 'ERROR: wrapper owns repository, environment, root and user' >&2; exit 2;; esac
done
command=(release "$action")
[[ "$action" != reconcile ]] || command=(reconcile)
exec sudo -n /usr/local/bin/toolkit "${command[@]}" --repository kreditozrouti --environment "$target" \
  --root "$HOME/kreditozrouti/versions/$target" --user "$(id -un)" "$@"
