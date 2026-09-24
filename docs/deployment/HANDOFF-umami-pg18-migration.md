# Umami PostgreSQL 18 volume migration

**One-time recovery runbook.** The current [monitoring Compose file](../../deployment/monitoring/docker-compose.monitoring.yml) already uses PostgreSQL 18 and mounts `kreditozrouti-umami-postgres-volume` at `/var/lib/postgresql`. Use this runbook only when an older volume still contains a flat PostgreSQL 16 or 17 cluster. A fresh volume needs no migration.

PostgreSQL 18 images expect a versioned data directory under `/var/lib/postgresql/<major>/docker` and refuse to start over legacy data at `/var/lib/postgresql/data`. Repeated restarts do not resolve the layout mismatch.

## Diagnose first

On the VPS, inspect the named volume without changing it:

```bash
bash deployment/monitoring/migrate-umami-pg18.sh diagnose
```

The script is part of this repo; on a versioned deployment, use its path under `~/kreditozrouti/versions/monitoring/current/monitoring/`. A flat root with `PG_VERSION`, `base/`, and `pg_wal/` holds an old cluster. An empty or nearly empty volume may be a fresh failed initialization. Inspect contents and size yourself; if uncertain, stop. Never infer that an existing volume is disposable from a startup error alone.

## Migrate an old cluster

1. Confirm the old `PG_VERSION` major. Set `OLD_MAJOR` to that value; the script defaults to `16`.
2. Export `UMAMI_DB_USER`, `UMAMI_DB_PASSWORD`, and `UMAMI_DB_NAME` in the shell without printing them. They must match the existing cluster.
3. Run `OLD_MAJOR=16 bash deployment/monitoring/migrate-umami-pg18.sh migrate`, replacing `16` as needed. Run it from a directory where its `pg-migration/` dump can be stored securely.
4. The script stops Umami and its database, dumps the old cluster, checks the dump, and waits for operator confirmation before backing up and replacing the volume. Read each prompt. It recreates the `-pg-old` backup volume, overwriting any earlier backup with that name; preserve an earlier backup elsewhere first. The new backup remains for rollback.
5. Dispatch **Deploy Monitoring**, confirm Umami loads and historical data is present, then remove the backup volume only when recovery is verified. Treat the SQL dump as sensitive data and store or remove it under your retention policy.

The script uses `pg_dumpall` plus restore because the Alpine images do not contain both PostgreSQL majors for an in-place `pg_upgrade`. Review the [script](../../deployment/monitoring/migrate-umami-pg18.sh) before running it. It performs destructive volume operations after confirmation.

## Empty volume

If inspection confirms there is no data to preserve, `bash deployment/monitoring/migrate-umami-pg18.sh clean` clears the volume after an interactive confirmation. Dispatch **Deploy Monitoring** to initialize a new PostgreSQL 18 cluster. This permanently discards anything in the volume.
