#!/usr/bin/env bash
set -euo pipefail
[[ $# -ge 2 && "$1" =~ ^(deploy|stage|activate|rollback|reconcile)$ && "$2" =~ ^(production|development|monitoring)$ ]] || {
  echo 'usage: deploy.sh <deploy|stage|activate|rollback|reconcile> <environment> [toolkit snapshot arguments]' >&2; exit 2;
}
action="$1"; target="$2"; shift 2
actual="$(/usr/local/bin/toolkit version | sed -n 's/^toolkit_version=\([^ ]*\).*/\1/p')"
[[ "$actual" =~ ^0\.[0-9]+\.[0-9]+$ && "$(printf '%s\n' 0.8.1 "$actual" | sort -V | head -1)" == 0.8.1 ]] || { echo 'Host toolkit snapshot API requires >=0.8.1, <1.0.0' >&2; exit 1; }
for arg in "$@"; do
  case "$arg" in --repository|--repository=*|--environment|--environment=*|--root|--root=*|--user|--user=*) echo 'ERROR: wrapper owns repository, environment, root and user' >&2; exit 2;; esac
done
command=(release "$action")
[[ "$action" != reconcile ]] || command=(reconcile)
exec sudo -n /usr/local/bin/toolkit "${command[@]}" --repository kreditozrouti --environment "$target" \
  --root "$HOME/kreditozrouti/versions/$target" --user "$(id -un)" "$@"
