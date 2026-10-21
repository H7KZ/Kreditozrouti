# Deployment operations

Run commands on the VPS unless stated otherwise. The app's Compose configuration is in `~/kreditozrouti/versions/<environment>/current/`; monitoring is in `~/kreditozrouti/versions/monitoring/current/monitoring/`. Commands that inspect Compose services need the version directory and its three Compose files, as listed in the snapshot's `.toolkit-release.json` (`compose_files`). Set the project to `kreditozrouti` for production or `kreditozrouti-dev` for development.

## Check a deployment

```bash
curl -fsS https://kreditozrouti.cz/api/health
curl -fsS https://kreditozrouti.cz/mcp/health
docker ps --filter label=com.docker.compose.project=kreditozrouti
docker logs --tail 100 kreditozrouti-api-1
docker stats
docker system df
```

For service startup failures, inspect its container logs, then check MySQL/Redis health, the version directory `.env`, and network membership. Do not print `.env` or secrets into shared logs. The [CI/CD guide](CICD.md) describes how the deploy workflow creates each version directory.

For dashboards, alerts, and log queries, see [monitoring](MONITORING.md). Validate monitoring configuration with `bash deployment/monitoring/validate.sh` from a repository checkout before manually deploying it.

## Boot recovery

Boot recovery is the generated `toolkit-kreditozrouti-reconcile.service` (from `deployment/toolkit.conf`): it runs toolkit reconcile per environment, validating saved inventory and using `up --no-recreate --pull never --no-build`. Missing pointers skip; legacy/corrupt snapshots fail. `deployment/toolkit install` leaves it disabled; start it manually, validate, then enable it separately. See [snapshot operations](../../deployment/README.md).

## Recovery and rollback

Use **Actions > Rollback** from any branch with controller `ref`, environment,
`operation=rollback|activate|reconcile` and `release_id=previous|current|<fullSHA-run-attempt>`.
Reconcile ignores the release ID and repairs current. Toolkit restores the whole saved snapshot/env/runtime. Image rollback does not undo schema migrations.

Production backups are plain encrypted dumps to an Object-Locked B2 bucket, written by `toolkit backup` (components, restore steps and drill: [backups](../../deployment/backup/README.md)). They capture MySQL, the Umami PostgreSQL database and a whole Redis RDB every four hours; restore copies only `share:*` / `ical:*` records, with original expiry times, into a fresh Redis, never queues, cache, sessions or counters. Deploy and rollback always run under toolkit locks and fail without the pinned toolkit. No timer is enabled until the application owner approves it. GitHub-hosted `backup-verify.yml` checks freshness daily and restores everything weekly. Losing the MySQL volume removes the scraped course and study-plan catalog until it is rebuilt from InSIS. Retain all named volumes during Docker cleanup.

## Manual data changes

Use the shared host lock for every manual migration or volume mutation. Example for the one-time Umami PostgreSQL migration:

```bash
cd "$HOME/kreditozrouti/versions/production/current"
sudo bash /path/to/checkout/deployment/toolkit with-lock \
  --repository kreditozrouti --environment production --action maintenance --timeout 3600 -- \
  bash deployment/monitoring/migrate-umami-pg18.sh diagnose
```

Repeat under the same lock for its reviewed `migrate` or `clean` action. The naming-volume migration and `--prune-old` also require the lock. Do not run Docker/DDL migration commands directly while the backup capture timer is enabled.

For a new host: restore Docker access, deploy shared Traefik from the Infrastructure repo, configure GitHub environment secrets including the trusted SSH host fingerprint, deploy monitoring if needed, then dispatch `Deploy` for the app. Current workflows use GitHub-hosted runners over verified SSH; the legacy github-runner sources are removed. Check public health routes and the scraper after deployment. The [Umami PostgreSQL 18 migration](HANDOFF-umami-pg18-migration.md) applies only to an older monitoring database volume; do not run it on a fresh volume.

## Security and maintenance

- The shared Infrastructure repo owns Traefik certificates, Cloudflare credentials, and edge firewall policy. Check its runbook for TLS failures; do not remove its certificate volume as a routine repair.
- GitHub environment secrets are the source for app credentials. The deploy workflow writes `.env` with mode `600` inside the version directory. Keep local `.env` files untracked.
- Production phpMyAdmin is available only through an SSH tunnel and the `admin` Compose profile. Development serves it at `/phpmyadmin` behind basic auth. See [access instructions](INFRASTRUCTURE.md#phpmyadmin).
- Check disk and memory use before pruning images or changing replica counts. Never delete named MySQL, Redis, or monitoring volumes during routine cleanup.
- Deploy monitoring manually with `deploy-monitoring.yml`. Its Discord and healthchecks.io endpoints are held in files written by the monitoring deploy script; see [monitoring](MONITORING.md#deployment-and-secrets).

Canonical complete deployment/retention and manual commands: [snapshot operations](../../deployment/README.md).
