#!/usr/bin/env bash
# Retired historical migration entrypoint; always fails.
# Exit codes: 1 retired.
set -Eeuo pipefail
# shellcheck source=../vendor/toolkit/log.sh
source "$(dirname -- "${BASH_SOURCE[0]}")/../vendor/toolkit/log.sh"
die 'historical migration entrypoint retired. Use a reviewed owner migration procedure under deployment/toolkit with-lock --repository kreditozrouti --environment production --action maintenance --host-window; see docs/deployment/HANDOFF-umami-pg18-migration.md'
