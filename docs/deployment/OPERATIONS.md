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

Use **Actions > Rollback Deployment** with an existing eight-character SHA, service, and environment. The workflow requires that SHA's version directory on the host. See [rollback details](CICD.md#rollback). Image rollback does not undo schema migrations.

MySQL has no automated backup in this repo. A lost MySQL volume removes the scraped course and study-plan catalog until it is rebuilt from InSIS. Student schedules are stored in their browsers. Redis uses a persistent AOF volume; losing it drops queued jobs, sessions, and active share/calendar links. Retain both volumes during Docker cleanup.

For a new host: restore Docker access and a self-hosted GitHub runner, deploy shared Traefik from the Infrastructure repo, set the GitHub environment secrets, deploy monitoring if needed, then dispatch `Deploy` for the app. Check public health routes and the scraper after deployment. The [Umami PostgreSQL 18 migration](HANDOFF-umami-pg18-migration.md) applies only to an older monitoring database volume; do not run it on a fresh volume.

## Security and maintenance

- The shared Infrastructure repo owns Traefik certificates, Cloudflare credentials, and edge firewall policy. Check its runbook for TLS failures; do not remove its certificate volume as a routine repair.
- GitHub environment secrets are the source for app credentials. The deploy workflow writes `.env` with mode `600` inside the version directory. Keep local `.env` files untracked.
- phpMyAdmin is available only through an SSH tunnel and the `admin` Compose profile. See [access instructions](INFRASTRUCTURE.md#phpmyadmin).
- Check disk and memory use before pruning images or changing replica counts. Never delete named MySQL, Redis, or monitoring volumes during routine cleanup.
- Deploy monitoring manually with `deploy-monitoring.yml`. Its Discord and healthchecks.io endpoints are held in files written by the monitoring deploy script; see [monitoring](MONITORING.md#deployment-and-secrets).
