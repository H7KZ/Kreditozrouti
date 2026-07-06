# Scripts — Infrastructure

Scripts for provisioning server infrastructure: Docker, Traefik, and GitHub Actions runners.

---

## Bootstrap

Fresh server setup is done manually in order:

1. **Install Docker** — `sudo bash scripts/install-docker.sh` then log out and back in
2. **Set up GitHub runner** — `GITHUB_REPO_URL=... GITHUB_ACCESS_TOKEN=... bash deployment/github-runner/deploy.sh`
3. **Deploy Traefik** — push to `deployment/traefik/**` or trigger `deploy-traefik.yml` via `workflow_dispatch`
4. **Deploy Monitoring** — push to `deployment/monitoring/**` or trigger `deploy-monitoring.yml` via `workflow_dispatch`
5. **Deploy app** — push to `main`/`develop` or trigger `deploy-all.yml` via `workflow_dispatch`

All required GitHub Secrets must be set before steps 3–5 (see [ci/cd docs](../deployment/CICD.md)).

---

## Configuration

All scripts read configuration from environment variables only — no config file. This allows them to be driven by GitHub
Actions secrets/variables without any file on disk.

**Backups (`backup.sh`):** `MYSQL_CONTAINER`, `BACKUP_DIR`, `BACKUP_RETENTION_DAYS`. The container name must match a
running container — find it with `docker ps --format '{{.Names}}'`.

---

## `install-docker.sh`

Installs Docker Engine on Ubuntu 20.04+ / Debian 11+. Run once on a fresh server.

```bash
sudo ./install-docker.sh [--user <username>] [--skip-test]
```

**Steps:**

1. Removes conflicting old Docker packages
2. Installs prerequisites (`curl`, `gnupg`, etc.)
3. Adds Docker's official apt repository with GPG key
4. Installs `docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-compose-plugin`
5. Runs `docker run hello-world` to verify (skip with `--skip-test`)
6. Adds `$SUDO_USER` (or `--user`) to the `docker` group
7. Enables and starts the Docker systemd service

After install, log out and back in for group membership to take effect.

---

## `deployment/traefik/deploy.sh`

Deploys the global Traefik reverse proxy. Reads its compose config from `deployment/traefik/`.

**Required environment variables:**

| Variable                   | Description                                |
|----------------------------|--------------------------------------------|
| `DEPLOYMENT_PATH`          | Path to the deployment directory           |
| `TRAEFIK_DOMAIN`           | Domain for the Traefik dashboard           |
| `TRAEFIK_CREDENTIALS_PATH` | Path to htpasswd file for basic auth       |
| `CF_API_EMAIL`             | Cloudflare account email                   |
| `CF_DNS_API_TOKEN`         | Cloudflare API token (`Zone → DNS → Edit`) |

**Optional:** `ACME_EMAIL` (defaults to `CF_API_EMAIL`)

**Generate htpasswd** (run once, store result as `TRAEFIK_HTPASSWD` secret):

```bash
htpasswd -nb admin yourpassword
```

**Steps:**

1. Validates all parameters and file paths
2. Creates `traefik-network` Docker network if it doesn't exist
3. Creates persistent volumes for TLS certs and access logs
4. Deploys Traefik via Docker Compose under project `global`

---

## `deployment/monitoring/deploy.sh`

Deploys the monitoring stack (Prometheus, Grafana, Loki, Alloy). Traefik must already be running.

**Required environment variables:**

| Variable                 | Description                                     |
|--------------------------|-------------------------------------------------|
| `DEPLOYMENT_PATH`        | Path to the deployment directory                |
| `DOMAIN`                 | Public domain (used for Grafana + Faro routing) |
| `GRAFANA_ADMIN_PASSWORD` | Grafana admin password                          |

**Optional:** `GRAFANA_ADMIN_USER` (default: `admin`), `DISCORD_WEBHOOK_URL`

Deployed under Docker Compose project `global` (shared with Traefik and runners).

After deploy, services are exposed via Traefik at:

- `https://domain/grafana` — Grafana dashboard
- `https://domain/faro/collect` — Alloy Faro receiver (browser telemetry)

**Operational commands:**

```bash
docker compose -p global ps
docker compose -p global logs -f
docker compose -p global logs grafana -f
```

---

## `deployment/github-runner/deploy.sh`

Deploys self-hosted GitHub Actions runners. Runners auto-register to the repository on container startup.

**Required environment variables:**

| Variable              | Description                               |
|-----------------------|-------------------------------------------|
| `GITHUB_REPO_URL`     | Full GitHub repository URL                |
| `GITHUB_ACCESS_TOKEN` | GitHub personal access token (repo scope) |

**Optional:** `RUNNER_REPLICAS` (default: `2`), `RUNNER_LABELS` (appended to `docker,self-hosted`)

Deployed under Docker Compose project `global`. Runners share the Docker socket — required for container image builds in
CI workflows.
