#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

case "${1:-}" in success|failure) state="$1" ;; *) printf 'usage: notify.sh success|failure\n' >&2; exit 2 ;; esac
export BACKUP_NOTIFICATION_STATE="$state"
python3 <<'PY'
import json
import os
import urllib.error
import urllib.parse
import urllib.request

state = os.environ["BACKUP_NOTIFICATION_STATE"]
healthchecks = os.environ.get("HEALTHCHECKS_BACKUP_URL", "")
discord = os.environ.get("DISCORD_BACKUP_WEBHOOK_URL", "")
requests = []
if healthchecks:
    url = healthchecks.rstrip("/") + ("" if state == "success" else "/fail")
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != "https" or not parsed.hostname:
        raise SystemExit("Healthchecks URL must be HTTPS")
    requests.append(urllib.request.Request(url, method="GET"))
if state == "failure" and discord:
    parsed = urllib.parse.urlsplit(discord)
    if parsed.scheme != "https" or parsed.hostname not in {"discord.com", "discordapp.com"}:
        raise SystemExit("Discord webhook URL is invalid")
    body = json.dumps({"content": "Kreditozrouti backup failed; inspect the root-only toolkit operation record and journal."}).encode()
    requests.append(urllib.request.Request(discord, data=body, headers={"Content-Type": "application/json"}, method="POST"))
if not healthchecks or (state == "failure" and not discord):
    raise SystemExit("backup notification URLs are required")
errors = []
for request in requests:
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            if not 200 <= response.status < 300:
                errors.append(f"HTTP {response.status}")
    except (OSError, urllib.error.URLError) as error:
        errors.append(type(error).__name__)
if errors:
    raise SystemExit("notification delivery failed: " + ", ".join(errors))
PY
