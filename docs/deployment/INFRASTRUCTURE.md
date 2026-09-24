# Deployment infrastructure

This repo deploys the app and monitoring stacks. A separate Infrastructure repo owns the shared Traefik proxy, Cloudflare DNS challenge, and `public-network`. Deploy that proxy before routing traffic to this stack. See [DNS and HTTPS setup](../setup/DNS.md).

## Networks

The app's [production](../../deployment/production/networks.yml) and [development](../../deployment/development/networks.yml) Compose files declare separate MySQL and Redis networks. Web, API, and MCP also join `public-network`; API and scraper join `kreditozrouti-monitoring-network` for Alloy. MySQL and Redis have no public ports.

| Network | Connected services |
| --- | --- |
| `public-network` | Shared Traefik, web, API, MCP, and public monitoring routes |
| `kreditozrouti-mysql-network-prod` or `-dev` | MySQL, API, MCP, and optional phpMyAdmin |
| `kreditozrouti-redis-network-prod` or `-dev` | Redis, API, scraper |
| `kreditozrouti-monitoring-network` | API, scraper, Alloy |

`deployment/deploy.sh` creates missing app networks and named volumes. It also creates `public-network` if the app deploys first, but that does not start Traefik. Monitoring uses its own [deploy script](../../deployment/monitoring/deploy.sh).

## Persistent data

Production and development have separate named MySQL and Redis volumes, defined in their respective `volumes.yml` files. Redis uses append-only persistence and `noeviction`; retain its volume when redeploying. The monitoring stack has separate Prometheus, Loki, Grafana, Alloy, Alertmanager, and Umami database volumes. See [monitoring](MONITORING.md).

Changing a database image major version requires a data migration. In particular, Umami's PostgreSQL 18 volume mounts at `/var/lib/postgresql`; see the [migration runbook](HANDOFF-umami-pg18-migration.md) before handling an older volume.

## Configuration and secrets

GitHub Actions reads `production` or `development` environment variables and secrets, writes a mode `600` `.env` inside `~/kreditozrouti/versions/<environment>/<sha>/`, and runs the app deploy script. Do not maintain a separate VPS copy of the app `.env`. For local development, copy the root [`.env.example`](../../.env.example) to an untracked `.env`.

| Setting | Source | Purpose |
| --- | --- | --- |
| `PROJECT`, `DOMAIN` | GitHub environment variables | Compose project labels and public host |
| `MYSQL_USER`, `MYSQL_DATABASE`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `MYSQL_URI` | GitHub environment secrets | MySQL setup and app connection |
| `REDIS_URI`, `REDIS_PASSWORD` | GitHub environment secrets | Redis connection |
| `API_SESSION_SECRET`, `API_COMMAND_TOKEN`, `MCP_JWT_SECRET` | GitHub environment secrets | App authentication |
| `GOOGLE_USER`, `GOOGLE_APP_PASSWORD` | GitHub environment secrets | Optional Gmail SMTP; [setup](../setup/GMAIL.md) |
| `UMAMI_SRC`, `UMAMI_WEBSITE_ID` | GitHub variable and secret | Optional web analytics |

The [deploy workflow](../../.github/workflows/_deploy-service.yml) rejects credential values containing `$` or backticks because Compose can reinterpret them in `.env`. Generate suitable secrets, for example with `openssl rand -base64 32`. Monitoring has [separate repository secrets](MONITORING.md#deployment-and-secrets) and writes its own webhook files.

Web `VITE_*` settings are compiled as placeholders and replaced when the container starts. When adding one, declare it in the web Dockerfile, `web/docker-entrypoint.sh`, and root `turbo.json`; otherwise Turbo strips it during build. See [Docker images](DOCKER.md#web-runtime-configuration).

## phpMyAdmin

phpMyAdmin is stopped by default under Compose profile `admin`. It binds only to VPS loopback: production `127.0.0.1:48080`, development `127.0.0.1:48081`. It has no Traefik route. Start it from the appropriate version directory, using the same Compose files as the [deploy script](../../deployment/deploy.sh):

```bash
cd ~/kreditozrouti/versions/production/current
docker compose -p kreditozrouti --env-file .env \
  -f production/networks.yml -f production/volumes.yml \
  -f production/docker-compose.production.yml --profile admin up -d phpmyadmin
```

From your workstation, run `ssh -L 48080:127.0.0.1:48080 <user>@<host>` and open `http://localhost:48080`. For development, use its current directory, Compose files, project `kreditozrouti-dev`, and port `48081`. Stop phpMyAdmin with the same Compose arguments followed by `--profile admin stop phpmyadmin` when finished.
