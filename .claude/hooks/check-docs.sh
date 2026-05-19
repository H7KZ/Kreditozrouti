#!/usr/bin/env bash
# Claude Code Stop hook — runs after every response
# Reminds the engineer to review and update docs when code changes

cat <<'MSG'

📚  Doc-review checkpoint
    ─────────────────────────────────────────────────────────
    Did this task change any code, config, or behavior?

    → Check docs/ for the affected area and update if needed:
        docs/architecture/   monorepo, services, data flow, containers
        docs/api/            endpoints, services, jobs, database, internals
        docs/client/         stores, composables, timetable, internals
        docs/scraper/        jobs, extraction, queue, types, internals
        docs/shared/         domain, http, queue
        docs/deployment/     docker, ci/cd, infrastructure, operations
        docs/scripts/        infrastructure, maintenance
        docs/engineering/    setup, contributing

    → If the change introduces something not in any doc,
      add it or explicitly decide to skip it.
    ─────────────────────────────────────────────────────────
MSG
