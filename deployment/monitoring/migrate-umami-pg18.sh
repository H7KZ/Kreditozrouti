#!/usr/bin/env bash
set -euo pipefail
echo "ERROR: historical migration entrypoint retired. Use a reviewed owner migration procedure under toolkit with-lock --repository kreditozrouti --environment production --action maintenance --host-window; see docs/deployment/HANDOFF-umami-pg18-migration.md." >&2
exit 1
