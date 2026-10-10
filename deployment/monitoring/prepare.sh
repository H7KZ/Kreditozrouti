#!/usr/bin/env bash
set -euo pipefail
set +x
umask 077
: "${TOOLKIT_RUNTIME_DIR:?}" "${TOOLKIT_ENV_FILE:?}" "${DISCORD_WEBHOOK_URL:?}" "${HEALTHCHECKS_PING_URL:?}" "${UMAMI_APP_SECRET:?}"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
[[ -L "$script_dir/.secrets" && "$(realpath -e "$script_dir/.secrets")" == "$TOOLKIT_RUNTIME_DIR/monitoring/.secrets" ]] || { echo 'ERROR: toolkit runtime symlink missing' >&2; exit 1; }
# Runtime parent remains private; readable files are needed by Alertmanager's uid.
chmod 755 "$script_dir/.secrets"
printf '%s' "$DISCORD_WEBHOOK_URL" > "$script_dir/.secrets/discord_webhook_url"
printf '%s' "$HEALTHCHECKS_PING_URL" > "$script_dir/.secrets/healthchecks_ping_url"
chmod 644 "$script_dir/.secrets/discord_webhook_url" "$script_dir/.secrets/healthchecks_ping_url"
docker_gid="$(stat -c '%g' /var/run/docker.sock)"
[[ "$docker_gid" =~ ^[0-9]+$ ]] || exit 1
grafana_password="$(printf '%s' "grafana_ro:$UMAMI_APP_SECRET" | sha256sum | cut -c1-40)"
printf "DOCKER_GID='%s'\nUMAMI_GRAFANA_PASSWORD='%s'\n" "$docker_gid" "$grafana_password" > "$TOOLKIT_RUNTIME_DIR/extra.env"
chmod 600 "$TOOLKIT_RUNTIME_DIR/extra.env"
