# Deployment instructions

For workflow, snapshot, rollback, monitoring, recovery or retention changes, read
[deploy and release](../docs/runbooks/deploy-and-release.md) and the [rollback runbook](../docs/runbooks/rollback-and-recovery.md). Toolkit owns deployment mutations and repository-wide locks;
Releases, boot recovery, backups and jobs run only through the pinned `deployment/toolkit`, declared in `toolkit.conf`. Keep full environment releases. Manual dispatch accepts any source ref for either app target;
only promote mode requires exact development qualification checks. Resolve source once for verify/build/deploy.
Stage must never publish development qualification. Deploy/restore writes queue per target. Secrets live in private runtime outside immutable source; hooks consume
exported values. Registry and release cleanup remain deferred until recovery references are protected.

- Never hand-edit `toolkit`, `toolkit.lock` or `vendor/toolkit/`; `npm run vendor` in the Toolkit repository regenerates them and
  `bash deployment/toolkit verify` (run by CI) rejects edited copies. Never call a toolkit installed on the server.
- Scheduled scripts are `JOBS` in `toolkit.conf`, backups are `BACKUP_COMPONENTS`/`BACKUP_AT`; do not add unit files, installers or `libexec` targets.
- Keep application Compose projects distinct: `kreditozrouti`, `kreditozrouti-dev`; ingress is `global`. Monitoring is
  Infrastructure's shared stack; keep containers on `kreditozrouti-monitoring-network` with `prometheus.io/*` labels.
- Ingress is a role: `deployment/ingress/` is deployed only on a standalone server (target `ingress`); on a shared host Infrastructure's Traefik owns `public-network`. Never run both. Apps always use the external network `public-network`. `MAINTENANCE_AT` and `RECONCILE_BEFORE` stay commented out in `toolkit.conf` here.
- Toolkit creates only `kreditozrouti-*` networks and volumes. Anything else external (`public-network`, `traefik-*`, `crowdsec-*`) is created by the owning stack's `prepare.sh`, never by hand. State stays in named external volumes.
- Workflows follow the repository standard (2-space YAML, SHA-pinned actions with `# vX.Y.Z`, fixed dispatch inputs, `timeout-minutes`); Dependabot keeps pins current. `npm run check:consumers` in the Toolkit repository verifies them.
- Production phpMyAdmin remains behind `admin`, loopback-only. Never publish its root credentials.
- Prebuilt application images require complete digest mappings; all dependency/profile images
  are pinned by toolkit at staging. Data image changes require explicit migration.
- Monitoring redacts before storage; this project's alert rules, dashboards and Alloy module live in Infrastructure
  (`monitoring/`). Keep `prometheus.io/scrape` / `prometheus.io/port` labels.
- Keep database image/volume layout compatible: PostgreSQL18 mounts `/var/lib/postgresql`.
- Shell scripts source the vendored `vendor/toolkit/log.sh` for logging.
- Host Sync (`host-sync.yml`) installs and enables what `toolkit.conf` declares; only a fresh server's first install is manual.
  Web runs two replicas (no `container_name`); api and mcp stay single with readiness healthchecks. Migrations are
  expand-only (`scripts/migration-lint.mjs`). New source is not evidence of a live deployment.
- Redis uses AOF/noeviction; backup restore allowlists `share:*` / `ical:*`, never whole production Redis. See [backups](../docs/runbooks/backups.md).
- Data migrations (naming, PostgreSQL major versions) need a reviewed owner procedure under the toolkit lock; see [rollback and recovery](../docs/runbooks/rollback-and-recovery.md#database-image-or-volume-problems).
