# Deployment — CI/CD Pipeline

GitHub Actions automates building, pushing, and deploying all three services.

---

## Overview

Deployments are **path-triggered and per-service**. When code changes are pushed to `main` or `develop`, only the
service (s) whose source files changed are rebuilt and redeployed.

| Branch    | Environment |
|-----------|-------------|
| `main`    | production  |
| `develop` | development |

**Image tag strategy:** Each build produces a `${GITHUB_SHA::8}` short-SHA tag (e.g. `a1b2c3d4`) plus a floating tag
(`latest` for production, `dev-latest` for development).

---

## Workflows

All workflow files live in `../../.github/workflows`.

### `_verify.yml` — Reusable: verification

**Trigger:** `workflow_call`.

Holds the actual verification steps: checkout, pnpm + Node.js 24 setup, `make install`, `make lint`, the em-dash
check, type-check, core build, and `make test`. Runs on a self-hosted runner.

It exists as a reusable workflow so that the same definition gates **both** pull requests and deploys. Previously
`verify.yml` ran only on `pull_request` while `deploy-all.yml` ran on push to `main`, and they were separate
workflows with no `needs:` between them, so a commit that reached `main` any other way (a direct push, a force push,
an admin merge) could deploy to production without CI ever having run on it.

---

### `verify.yml` — Pull Request checks

**Trigger:** PR opened, synchronised, or reopened

A thin caller: `uses: ./.github/workflows/_verify.yml`. A PR cannot be merged until this passes.

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

**Trigger:** push to `main` under `api/**`, `client/**`, `scraper/**`, `mcp/**` or `packages/**`, which auto-deploys
only the services whose paths changed; or `workflow_dispatch` for manual control over any combination.

Builds the four services in parallel and deploys them. Use the manual form for:

- Initial deployment on a fresh environment
- Emergency redeployments
- Cases where all services must move together

**Inputs:** `environment` (production/development, required), per-service `deploy_*` checkboxes, `image_tag`
(optional SHA, skips build if set), `skip_build` (bool).

When several are built at once, `API_IMAGE_TAG`, `CLIENT_IMAGE_TAG`, `SCRAPER_IMAGE_TAG` and `MCP_IMAGE_TAG` are all
set to the same short SHA.

**CI gate.** A `verify` job calls `_verify.yml` and `validate` declares `needs: [verify]`. Every build job already
requires `needs.validate.result == 'success'`, `resolve` requires the same, the deploy jobs require `resolve`, and
cleanup requires deploy - so a failed verification skips the entire graph at one choke point. This applies to
`workflow_dispatch` runs too, including `skip_build`, because a skip_build dispatch still writes a `.env` and runs
`deploy.sh` on the VPS.

One limit worth knowing rather than assuming away: for `skip_build` with an explicit `image_tag`, verification runs
against the dispatched ref, which need not be the commit the pre-existing image was built from. The gate proves the
ref is green; it does not prove the image matches the ref.

---

### `_build-service.yml` — Reusable: build image

**Trigger:** `workflow_call` (called by per-service workflows).

Builds and pushes a single service image to GHCR with two tags: `${GITHUB_SHA::8}` and the floating tag. Uses GHA layer
cache scoped per service and environment.

**Outputs:** `image_tag` (short SHA), `image_prefix` (GHCR path prefix).

---

### `_deploy-service.yml` — Reusable: deploy service

**Trigger:** `workflow_call` (called by per-service workflows).

Uploads deployment files to the VPS, writes `.env`, and calls `deploy.sh <project> <environment> <service>` for a
single-service update.

**Secret shape validation.** Before writing `.env` and before `docker login`, the workflow rejects any secret that
cannot survive the trip. Two readers can eat a `$` on the way to the container: this shell, which is defeated by
writing values with `printf` rather than interpolation, and Compose, which interpolates the `.env` file it is handed
and which nothing defeats. So `MYSQL_PASSWORD=abc$def` would reach the container as `abc`, silently. For
`MYSQL_ROOT_PASSWORD` that is unrecoverable: the database initialises with the truncated value on first boot and the
real password then differs from the stored secret forever.

Twelve credential-bearing secrets are checked for `$` and backtick and the deploy fails with a message pointing at
`openssl rand -base64 32`, whose alphabet contains neither character.

**Dependency inclusion:** `api`, `scraper`, and `mcp` are deployed together with their infrastructure dependencies -
deploying `api` also brings up (or updates, if their config changed) `mysql` and `redis`, honouring `depends_on` health
ordering. Already-healthy, unchanged dependencies are left untouched. `client` keeps `--no-deps` because its only
dependency is `api` (an app service whose image tag is not set in a client-only deploy, so including it could bounce the
running api to the `:latest` float).

---

### Traefik reverse proxy — moved to the Infrastructure repo

This repo no longer deploys Traefik. The single shared Traefik (which owns `public-network`) lives in
the **Infrastructure** repo and is deployed from there. The former `deploy-traefik.yml` workflow and
`deployment/traefik/` stack were removed — see `docs/handoff-shared-vps-traefik.md`.

Generate `TRAEFIK_HTPASSWD` with: `htpasswd -nb admin yourpassword`

---

### `deploy-monitoring.yml` — Monitoring stack

**Trigger:** Push to `main` touching `deployment/monitoring/**`, or `workflow_dispatch`.

1. Upload `../../deployment/monitoring` to `~/deployment/monitoring/` on the VPS
2. SSH → run `~/deployment/monitoring/deploy.sh` with secrets passed as env vars

**Required repository secrets:** `MONITORING_DOMAIN`, `GRAFANA_ADMIN_PASSWORD`, `DISCORD_WEBHOOK_URL`

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
~/kreditozrouti/versions/
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
  bash ./deploy.sh kreditozrouti production

# Single-service deploy (e.g. api only)
API_IMAGE_TAG=a1b2c3d4 bash ./deploy.sh kreditozrouti production api
```

After a successful deploy, `deploy.sh` automatically removes version directories older than 7 days from
`~/kreditozrouti/versions/<environment>/` (minimum 3 kept, active symlink target always preserved).

---

## Routine Deploys

Push to `main` or `develop` — the path filters determine which workflow (s) run:

| Changed path               | Workflow triggered      |
|----------------------------|-------------------------|
| `api/**`                   | `deploy-api.yml`        |
| `client/**`                | `deploy-client.yml`     |
| `scraper/**`               | `deploy-scraper.yml`    |
| `shared/**`                | all three               |
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

Edit `../../deployment/production/docker-compose.production.yml`:

```yaml
services:
	api:
		deploy:
			replicas: 4 # default: 2

	client:
		deploy:
			replicas: 5 # default: 3

	scraper:
		deploy:
			replicas: 10 # default: 5
```

Then redeploy: `docker compose -p kreditozrouti up -d`
