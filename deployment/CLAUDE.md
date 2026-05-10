# deployment/ — CLAUDE.md

Infrastructure configuration for all server environments. Docker Compose stacks organized by service type.

---

## Directory Structure

```
deployment/
├── deploy.sh                              # App stack deployment script
├── production/
│   ├── docker-compose.production.yml      # api×2, scraper×5, client×3, mysql, redis, phpmyadmin
│   ├── networks.yml                       # mysql-network, redis-network (external)
│   └── volumes.yml                        # mysql-data-volume
├── development/
│   ├── docker-compose.development.yml     # Same services, lower replicas, dev image tags
│   ├── networks.yml                       # mysql-dev-network, redis-dev-network (external)
│   └── volumes.yml                        # mysql-data-dev-volume
├── traefik/
│   ├── docker-compose.traefik.yml         # Traefik v3 reverse proxy
│   ├── traefik.yml                        # Traefik static config (entrypoints, ACME, ping)
│   ├── networks.yml                       # traefik-network (external, shared by all stacks)
│   └── volumes.yml                        # traefik-certificates-volume, traefik-logs-volume
├── glitchtip/
│   ├── docker-compose.glitchtip.yml       # web, worker (Celery), migrate, postgres, valkey
│   ├── networks.yml                       # traefik-network (external)
│   └── volumes.yml                        # glitchtip-postgres-volume, glitchtip-valkey-volume
└── github-runner/
    └── docker-compose.github-runner.yml   # Self-hosted GitHub Actions runners
```

---

## Stack Startup Order

Deploy in this order on a fresh server:

```
1. Traefik         → ../scripts/traefik.sh       (once per server)
2. GlitchTip       → ../scripts/glitchtip.sh     (optional, once per server)
3. GitHub Runner   → ../scripts/github-runner.sh (optional, once per server)
4. App stack       → ./deploy.sh                 (per-environment, run from CI)
```

---

## deploy.sh

Unified deployment script for the Kreditožrouti app stack. Handles both `production` and `development` environments.

### Usage

```bash
# Deploy production
./deploy.sh prod production

# Deploy development/staging
./deploy.sh dev development
```

### Required Environment Variables

| Variable | Example | Purpose |
|---|---|---|
| `IMAGE_REGISTRY` | `ghcr.io` | Container registry |
| `IMAGE_PREFIX` | `owner/kreditozrouti` | Image name prefix |
| `IMAGE_TAG` | `v1.2.3` | Image tag to deploy |

Set via `.env` (secrets) or `.images` (CI-written image vars).

### What It Does

1. Loads `deployment/.images` if present (CI writes image vars here)
2. Validates required env vars and config files
3. Creates missing Docker networks (reads from `networks.yml`)
4. Creates missing Docker volumes (reads from `volumes.yml`)
5. Pulls images from the registry
6. Runs `docker compose up --remove-orphans -d`

### Required Files

```
deployment/
├── .env                    # Secrets — gitignored, never commit
├── .images                 # Written by CI (IMAGE_REGISTRY, IMAGE_PREFIX, IMAGE_TAG)
└── <environment>/
    ├── docker-compose.<environment>.yml
    ├── networks.yml
    └── volumes.yml
```

`.env` template: see root `.env.example`. Must include `DOMAIN`, `PROJECT`, `MYSQL_*`, `REDIS_*`, `API_*`, and optionally `SENTRY_*_DSN`.

---

## Production vs Development Differences

| Setting | Production | Development |
|---|---|---|
| Image tag default | `latest` | `dev-latest` |
| API replicas | 2 | 2 |
| Scraper replicas | 5 | 3 |
| Client replicas | 3 | 2 |
| Networks | `mysql-network`, `redis-network` | `mysql-dev-network`, `redis-dev-network` |
| Volumes | `mysql-data-volume` | `mysql-data-dev-volume` |
| Redis save interval | 60s | 20s |
| MySQL buffer sizes | Tuned for prod (less RAM) | Larger (more RAM available) |
| MySQL `innodb_buffer_pool_size` | 512M | not set (default) |

---

## Traefik Stack

Global reverse proxy. Deployed once per server via `../scripts/traefik.sh`.

- TLS termination: Let's Encrypt via Cloudflare DNS-01 challenge
- HTTP → HTTPS redirect (entrypoint `web` → `websecure`)
- Dashboard at `https://<TRAEFIK_DOMAIN>` protected by basic auth (`/credentials.txt`)
- Creates the `traefik-network` external network that all other stacks join

**Static config** lives in `traefik/traefik.yml` — entrypoints, API/dashboard, ping endpoint, ACME config. Do not put dynamic config there; use Docker labels on services instead.

---

## GlitchTip Stack

Self-hosted error tracking. Deployed via `../scripts/glitchtip.sh`.

Services: `web` (API + UI), `worker` (Celery + beat), `migrate` (one-shot, runs Django migrations), `postgres`, `valkey` (Redis-compatible).

After first deployment, create a superuser:

```bash
docker compose -p glitchtip exec web python manage.py createsuperuser
```

Each app service reports errors via `SENTRY_DSN` env var (set in `deployment/.env`).

---

## GitHub Runner Stack

Self-hosted GitHub Actions runners. Deployed via `../scripts/github-runner.sh`.

Uses `myoung34/github-runner`. Runners auto-register to the repository and share the Docker socket (required for container image builds in CI). Labels default to `docker,self-hosted`.

---

## Network Architecture

```
traefik-network (external — Traefik creates it)
├── traefik         (ports 80, 443)
├── api
├── client
├── phpmyadmin
└── glitchtip web

mysql-network / mysql-dev-network (internal)
├── api
├── mysql
└── phpmyadmin

redis-network / redis-dev-network (internal)
├── api
└── scraper

glitchtip-internal (isolated)
├── web, worker, migrate
├── postgres
└── valkey
```

---

## Gotchas

- `deploy.sh` uses `$SCRIPT_DIR` to locate environment subdirectories — it must be run from within `deployment/` or called by full path (e.g., `./deployment/deploy.sh`). The working directory does not matter; only the script's own directory does.
- `deployment/.env` is gitignored. Secrets never go in the compose files.
- `deployment/.images` is written by CI between the build and deploy steps to pass `IMAGE_REGISTRY`, `IMAGE_PREFIX`, and `IMAGE_TAG`.
- Traefik network must exist before deploying any app stack. `traefik.sh` creates it automatically; CI must deploy Traefik first on a fresh server.
- MySQL healthcheck uses the root password — `MYSQL_ROOT_PASSWORD` must be in `.env`.
- `VITE_*` env vars for the client are **build-time** (baked into the image at build time by Vite). Setting them at container runtime has no effect.
- `redis` volume intentionally not used — Redis data is ephemeral (BullMQ job queue, sessions). Only MySQL data is persisted to a named volume.
