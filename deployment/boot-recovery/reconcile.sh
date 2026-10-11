#!/usr/bin/env bash
set -euo pipefail
[[ $EUID == 0 && $# == 4 && "$1" == --user && "$3" == --home ]] || { echo 'usage: sudo reconcile.sh --user <deploy-user> --home <deploy-home>' >&2; exit 2; }
readonly APP="kreditozrouti"
deploy_user="$2" deploy_home="$4"
[[ "$deploy_user" =~ ^[A-Za-z_][A-Za-z0-9_.-]{0,31}$ && "$deploy_home" =~ ^/[A-Za-z0-9_./-]+$ ]] || exit 2
entry="$(getent passwd "$deploy_user")"
[[ "$(cut -d: -f3 <<< "$entry")" != 0 ]] || { echo 'Deploy user must not have uid 0' >&2; exit 1; }
account_home="$(cut -d: -f6 <<< "$entry")"
[[ -d "$deploy_home" && ! -L "$deploy_home" && "$deploy_home" == "$(realpath -e -- "$deploy_home")" ]] || exit 1
[[ "$deploy_home" == "$account_home" || "$deploy_home" == "$account_home/"* ]] || { echo 'Deploy home must be within the account home' >&2; exit 1; }
actual="$(/usr/local/bin/toolkit version | sed -n 's/^toolkit_version=\([^ ]*\).*/\1/p')"
[[ "$actual" =~ ^0\.[0-9]+\.[0-9]+$ && "$(printf '%s\n' 0.8.1 "$actual" | sort -V | head -1)" == 0.8.1 ]] || { echo 'Host toolkit snapshot API requires >=0.8.1, <1.0.0' >&2; exit 1; }
failures=0
for target in production development monitoring; do
  /usr/local/bin/toolkit reconcile --repository "$APP" --environment "$target" \
    --root "$deploy_home/$APP/versions/$target" --user "$deploy_user" || failures=1
done
exit "$failures"
