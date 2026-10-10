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

## Recovery and rollback

Use **Actions > Rollback Deployment** with an existing eight-character legacy tag, full 40-character SHA, or `<source-commit>-<development-run-id>-<run-attempt>` release ID, service, and environment. The workflow requires that release directory and, for new release IDs, saved digests and successful-deploy markers. See [rollback details](CICD.md#rollback). Image rollback does not undo schema migrations.

The production backup scaffold is in [backups](../../deployment/backups/README.md). It captures MySQL, the Umami PostgreSQL database, and only Redis `share:*` / `ical:*` records with original expiry times. It excludes Redis queues, cache, sessions, counters, and full-volume dumps. Deploy and rollback use toolkit locks when installed; `TOOLKIT_LOCKS_REQUIRED=true` makes a missing toolkit fail closed. No timer is enabled. Do not rely on backups until the host toolkit is installed, B2 Object Lock and hosted retention are proven, a full isolated restore is rehearsed, and the application owner approves rollout. Losing the MySQL volume removes the scraped course and study-plan catalog until it is rebuilt from InSIS. Retain all named volumes during Docker cleanup.

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
