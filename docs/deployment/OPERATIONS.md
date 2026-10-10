# Deployment operations

Run commands on the VPS unless stated otherwise. The app's Compose configuration is in `~/kreditozrouti/versions/<environment>/current/`; monitoring is in `~/kreditozrouti/versions/monitoring/current/monitoring/`. Commands that inspect Compose services need the version directory and its three Compose files, as shown in the [deploy script](../../deployment/deploy.sh). Set the project to `kreditozrouti` for production or `kreditozrouti-dev` for development.

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

After a reboot Docker restores running containers; `kreditozrouti-reconcile.service` then starts any stopped container in the production, development and monitoring projects that has a restart policy, data services first. It validates each `versions/<target>/current` pointer, runs under the toolkit lock, and never pulls, builds, recreates or removes. Install with `sudo bash deployment/boot-recovery/install.sh --user <deploy-user>`, check with `systemctl status kreditozrouti-reconcile.service` and preview with `sudo -u <deploy-user> bash /usr/local/libexec/kreditozrouti-reconcile/reconcile.sh --dry-run`. A container that was removed needs the Deploy workflow. Services stopped on purpose start again at boot.

## Recovery and rollback

Use **Actions > Rollback Deployment** with an existing full 40-character SHA or `<source-commit>-<development-run-id>-<run-attempt>` release ID, service, and environment. The workflow requires that release directory and, for new release IDs, saved digests and successful-deploy markers. See [rollback details](CICD.md#rollback). Image rollback does not undo schema migrations.

Production backups are plain encrypted dumps to an Object-Locked B2 bucket, written by `toolkit backup` (see [backups](../../deployment/backups/README.md) and [RESTORE.md](../../deployment/backups/RESTORE.md)). They capture MySQL, the Umami PostgreSQL database and a whole Redis RDB every four hours; restore copies only `share:*` / `ical:*` records, with original expiry times, into a fresh Redis, never queues, cache, sessions or counters. Deploy and rollback always run under toolkit locks and fail without the pinned toolkit. No timer is enabled until the application owner approves it. GitHub-hosted `backup-verify.yml` checks freshness daily and restores everything weekly. Losing the MySQL volume removes the scraped course and study-plan catalog until it is rebuilt from InSIS. Retain all named volumes during Docker cleanup.

## Manual data changes

Use the shared host lock for every manual migration or volume mutation. Example for the one-time Umami PostgreSQL migration:

```bash
cd "$HOME/kreditozrouti/versions/production/current"
sudo /usr/local/bin/toolkit with-lock \
  --repository kreditozrouti --environment production --action maintenance --timeout 3600 -- \
  bash deployment/monitoring/migrate-umami-pg18.sh diagnose
```

Repeat under the same lock for its reviewed `migrate` or `clean` action. The naming-volume migration and `--prune-old` also require the lock. Do not run Docker/DDL migration commands directly while the backup capture timer is enabled.

For a new host: restore Docker access, deploy shared Traefik from the Infrastructure repo, configure GitHub environment secrets including the trusted SSH host fingerprint, deploy monitoring if needed, then dispatch `Deploy` for the app. Current workflows use GitHub-hosted runners over verified SSH; the existing VPS runner stack remains until its separate retirement gate. Check public health routes and the scraper after deployment. The [Umami PostgreSQL 18 migration](HANDOFF-umami-pg18-migration.md) applies only to an older monitoring database volume; do not run it on a fresh volume.

## Security and maintenance

- The shared Infrastructure repo owns Traefik certificates, Cloudflare credentials, and edge firewall policy. Check its runbook for TLS failures; do not remove its certificate volume as a routine repair.
- GitHub environment secrets are the source for app credentials. The deploy workflow writes `.env` with mode `600` inside the version directory. Keep local `.env` files untracked.
- Production phpMyAdmin is available only through an SSH tunnel and the `admin` Compose profile. Development serves it at `/phpmyadmin` behind basic auth. See [access instructions](INFRASTRUCTURE.md#phpmyadmin).
- Check disk and memory use before pruning images or changing replica counts. Never delete named MySQL, Redis, or monitoring volumes during routine cleanup.
- Deploy monitoring manually with `deploy-monitoring.yml`. Its Discord and healthchecks.io endpoints are held in files written by the monitoring deploy script; see [monitoring](MONITORING.md#deployment-and-secrets).
