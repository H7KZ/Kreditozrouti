# Deployment — CI/CD Pipeline

GitHub Actions automates building, pushing, and deploying all three services.

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

### `deploy-production.yml` — Production release

**Trigger:** Git tag matching `v*.*.*` (e.g. `v1.0.0`, `v2.3.1`) or manual dispatch with `skip-build` option.

**Job A — Build** (skipped when `skip-build` is set):

Builds and pushes three images to GHCR with two tags each: the version tag and `latest`.

```yaml
tags: |
  ghcr.io/${{ github.repository }}/api:${{ steps.meta.outputs.version }}
  ghcr.io/${{ github.repository }}/api:latest
cache-from: type=gha,scope=api
cache-to: type=gha,mode=max,scope=api
```

**Job B — Deploy:**

1. Creates version directory on VPS: `~/versions/production/v1.0.0/`
2. Uploads deployment files via SCP
3. Executes `deploy.sh prod production` on the remote host
4. Updates `current` symlink → `~/versions/production/v1.0.0`

---

### `deploy-development.yml` — Development release

**Trigger:** Git tag matching `dev-*.*.*` or manual dispatch.

Same structure as production but:

- Images tagged `dev-${TAG}` / `dev-latest`
- Deploys to `~/versions/development/`
- Uses `.env.dev`
- Fewer replicas (API: 2, Client: 2, Scraper: 3)

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

On the VPS, each deployment gets its own directory:

```
~/versions/
├── production/
│   ├── v1.0.0/          ← deployment files + .env symlink
│   ├── v1.1.0/
│   ├── current -> v1.1.0   ← active deployment
│   └── ...
└── development/
    └── ...
```

`deploy.sh` is called inside the version directory and runs:

```bash
docker compose -p prod \
  -f production/docker-compose.production.yml \
  --env-file .env \
  pull && up --remove-orphans -d
```

---

## Triggering a Release

**Production:**

```bash
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin v1.2.0
# GitHub Actions builds images, pushes to GHCR, deploys to VPS
```

**Development:**

```bash
git tag -a dev-1.2.0 -m "Dev release 1.2.0"
git push origin dev-1.2.0
```

**Rollback:**

```bash
# On VPS — point symlink to a previous version and redeploy
ln -sfn ~/versions/production/v1.1.0 ~/versions/production/current
cd ~/versions/production/current
docker compose -p prod up -d
```

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
