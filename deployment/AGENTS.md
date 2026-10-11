# Deployment instructions

For workflow, snapshot, rollback, monitoring, recovery or retention changes, read
[snapshot operations](README.md). Toolkit owns deployment mutations and repository-wide locks;
`deploy.sh` and recovery are thin adapters. Keep full environment releases and exact development
qualification checks. Secrets live in private runtime outside immutable source; hooks consume
exported values. Registry and release cleanup remain deferred until recovery references are protected.

- Keep application Compose projects distinct: `kreditozrouti`, `kreditozrouti-dev`, `kreditozrouti-monitoring`.
- Infrastructure owns shared Traefik/public-network. State stays in named external volumes.
- Production phpMyAdmin remains behind `admin`, loopback-only. Never publish its root credentials.
- Prebuilt application images require complete digest mappings; all dependency/profile images
  are pinned by toolkit at staging. Data image changes require explicit migration.
- Monitoring redacts before storage; Prometheus/Loki files own alerts. Keep per-repo Alloy
  project allowlists and `prometheus.io/scrape` / `prometheus.io/port` labels.
- Keep database image/volume layout compatible: PostgreSQL18 mounts `/var/lib/postgresql`.
- `lib.sh` contains logging/file validation only; retained for monitoring validation.
- Installers leave units/timers disabled. New source is not evidence of a live deployment.
- Redis uses AOF/noeviction; backup restore allowlists `share:*` / `ical:*`, never whole production Redis. See [backups](backups/README.md).
- Historical naming/PG18 entrypoints are retired; data migration needs a reviewed owner procedure.
