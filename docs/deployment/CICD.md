# Deployment — CI/CD Pipeline

GitHub Actions automates building, pushing, and deploying all three services.

---

## Overview

Deployments are **path-triggered and per-service**. When code changes are pushed to `main` or `develop`, only the
service(s) whose source files changed are rebuilt and redeployed.

| Branch    | Environment  |
|-----------|-------------|
| `main`    | production  |
| `develop` | development |

**Image tag strategy:** Each build produces a `${GITHUB_SHA::8}` short-SHA tag (e.g. `a1b2c3d4`) plus a floating tag
(`latest` for production, `dev-latest` for development).

---

## Workflows

All workflow files live in `.github/workflows/`.

### `verify.yml` — Pull Request checks

**Trigger:** PR opened, synchronised, or reopened

**Steps:**

1. Checkout code
2. Setup Node.js 24 + pnpm
3. `make install`
4. `make lint`
5. `make build`

Runs on a self-hosted runner. A PR cannot be merged until this passes.

---

### `deploy-api.yml` — Deploy API service

**Trigger:** Push to `main` or `develop` touching `api/**` or `shared/**`, or `workflow_dispatch`.

**Jobs:** `build` (via `_build-service.yml`) → `deploy` (via `_deploy-service.yml`).

**Manual dispatch inputs:** `image_tag` (SHA to deploy), `skip_build` (bool), `environment` (production/development).

---

### `deploy-client.yml` — Deploy client service

**Trigger:** Push to `main` or `develop` touching `client/**` or `shared/**`, or `workflow_dispatch`.

Same structure as `deploy-api.yml` for the client service.

---

### `deploy-scraper.yml` — Deploy scraper service

**Trigger:** Push to `main` or `develop` touching `scraper/**` or `shared/**`, or `workflow_dispatch`.

Same structure as `deploy-api.yml` for the scraper service.

---

### `deploy-all.yml` — Full-stack deploy

**Trigger:** `workflow_dispatch` only (manual).

Builds all three services in parallel and then deploys the full stack in one operation. Use for:

- Initial deployment on a fresh environment
- Emergency redeployments
- Cases where all services must move together

**Inputs:** `environment` (production/development, required), `image_tag` (optional SHA, skips build if set),
`skip_build` (bool).

When all three are built at once, `API_IMAGE_TAG`, `CLIENT_IMAGE_TAG`, and `SCRAPER_IMAGE_TAG` are all set to the same
short SHA.

---

### `_build-service.yml` — Reusable: build image

**Trigger:** `workflow_call` (called by per-service workflows).

Builds and pushes a single service image to GHCR with two tags: `${GITHUB_SHA::8}` and the floating tag. Uses GHA
layer cache scoped per service and environment.

**Outputs:** `image_tag` (short SHA), `image_prefix` (GHCR path prefix).

---

### `_deploy-service.yml` — Reusable: deploy service

**Trigger:** `workflow_call` (called by per-service workflows).

Uploads deployment files to the VPS, writes `.env`, and calls `deploy.sh <project> <environment> <service>` for a
single-service update.

---

### `deploy-traefik.yml` — Traefik reverse proxy

**Trigger:** Push to `main` touching `deployment/traefik/**`, or `workflow_dispatch`.

1. Upload `deployment/traefik/` to `~/deployment/traefik/` on the VPS
2. Write `TRAEFIK_HTPASSWD` secret to `~/.htpasswd` (600 perms)
3. SSH → run `~/deployment/traefik/deploy.sh` with secrets passed as env vars

**Required repository secrets:** `TRAEFIK_DOMAIN`, `TRAEFIK_HTPASSWD`, `CF_API_EMAIL`, `CF_DNS_API_TOKEN`, `ACME_EMAIL`

Generate `TRAEFIK_HTPASSWD` with: `htpasswd -nb admin yourpassword`

---

### `deploy-monitoring.yml` — Monitoring stack

**Trigger:** Push to `main` touching `deployment/monitoring/**`, or `workflow_dispatch`.

1. Upload `deployment/monitoring/` to `~/deployment/monitoring/` on the VPS
2. SSH → run `~/deployment/monitoring/deploy.sh` with secrets passed as env vars

**Required repository secrets:** `MONITORING_DOMAIN`, `GRAFANA_ADMIN_PASSWORD`, `DISCORD_WEBHOOK_URL`

---

### `bootstrap.yml` — Fresh server setup

**Trigger:** `workflow_dispatch` only (manual, one-time).

Runs on `ubuntu-latest` (GitHub-hosted) because the self-hosted runner doesn't exist yet.
Sequence: Docker check → upload scripts + deployment config → Traefik → Monitoring → GitHub Runner → backup cron.

See [OPERATIONS.md](OPERATIONS.md) for the full bootstrap procedure.

---

### Environment variables: GitHub Variables & Secrets

Per-service deploy workflows pass all required env vars from **GitHub Environments** (`production` / `development`)
directly into the remote shell — no `.env` file is manually placed on the server.

**To update an env var:** GitHub → Settings → Environments → `development` (or `production`) → edit the variable or
secret → next deploy picks it up.

---

## Required GitHub Secrets

Configure in **Settings → Secrets and variables → Actions**:

| Secret            | Example                 | Purpose                         |
|-------------------|-------------------------|---------------------------------|
| `SSH_HOST`        | `vps.example.com`       | VPS hostname or IP              |
| `SSH_USER`        | `deploy`                | SSH username                    |
| `SSH_PORT`        | `22`                    | SSH port                        |
| `SSH_PRIVATE_KEY` | `-----BEGIN OPENSSH...` | Private key for the deploy user |
| `GITHUB_TOKEN`    | (auto-provided)         | GHCR authentication             |

**Generate SSH key pair:**

```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions
ssh-copy-id -i ~/.ssh/github_actions.pub deploy@your-vps
# then add ~/.ssh/github_actions contents to the SSH_PRIVATE_KEY secret
```

---

## Version Directory Layout

On the VPS, each deployment gets its own directory keyed by the short SHA:

```
~/versions/
├── production/
│   ├── a1b2c3d4/        ← deployment files + .env
│   ├── e5f6a7b8/
│   ├── current -> e5f6a7b8   ← active deployment
│   └── ...
└── development/
    └── ...
```

`deploy.sh` is called inside the version directory and runs:

```bash
# Full-stack deploy (all services)
API_IMAGE_TAG=a1b2c3d4 CLIENT_IMAGE_TAG=a1b2c3d4 SCRAPER_IMAGE_TAG=a1b2c3d4 \
  bash ./deploy.sh prod production

# Single-service deploy (e.g. api only)
API_IMAGE_TAG=a1b2c3d4 bash ./deploy.sh prod production api
```

After a successful deploy, `deploy.sh` automatically removes version directories older than 7 days from
`~/versions/<environment>/` (minimum 3 kept, active symlink target always preserved).

---

## Routine Deploys

Push to `main` or `develop` — the path filters determine which workflow(s) run:

| Changed path       | Workflow triggered     |
|--------------------|------------------------|
| `api/**`           | `deploy-api.yml`       |
| `client/**`        | `deploy-client.yml`    |
| `scraper/**`       | `deploy-scraper.yml`   |
| `shared/**`        | all three              |
| `deployment/traefik/**` | `deploy-traefik.yml` |
| `deployment/monitoring/**` | `deploy-monitoring.yml` |

Only changed services are rebuilt and redeployed — unchanged services keep their current image tag.

---

## Rollback Procedure

Re-trigger the relevant per-service workflow via `workflow_dispatch` with a previous SHA:

1. GitHub → Actions → `Deploy API` (or Client / Scraper)
2. **Run workflow** → set `image_tag` to the old short SHA (e.g. `a1b2c3d4`)
3. Set `skip_build: true` (the image already exists in GHCR)
4. Select the target environment and run

The workflow will skip the build step and deploy the specified image directly.

---

## Scaling Replicas

Edit `deployment/production/docker-compose.production.yml`:

```yaml
services:
  api:
    deploy:
      replicas: 4      # default: 2

  client:
    deploy:
      replicas: 5      # default: 3

  scraper:
    deploy:
      replicas: 10     # default: 5
```

Then redeploy: `docker compose -p prod up -d`
