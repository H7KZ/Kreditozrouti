# Deployment — CLAUDE.md

> Full reference: [docs/deployment/](../docs/deployment/README.md)

---

## Directory Structure

```
deployment/
├── deploy.sh                              # App stack deployment (run from CI)
├── production/
│   ├── docker-compose.production.yml      # api×2, scraper×5, client×3, mysql, redis, phpmyadmin
│   ├── networks.yml
│   └── volumes.yml
├── development/
│   ├── docker-compose.development.yml     # Same services, lower replicas, dev image tags
│   ├── networks.yml
│   └── volumes.yml
├── traefik/
│   ├── docker-compose.traefik.yml
│   ├── traefik.yml                        # Static config — entrypoints, ACME, ping
│   ├── networks.yml
│   └── volumes.yml
├── monitoring/
│   ├── docker-compose.monitoring.yml     # Prometheus + Grafana stack
│   ├── networks.yml
│   ├── volumes.yml
│   ├── prometheus/
│   │   ├── prometheus.yml                # Production scrape config (scrapes /metrics on API containers)
│   │   └── prometheus.local.yml          # Local scrape config
│   └── grafana/
│       └── provisioning/datasources/
│           └── prometheus.yml            # Auto-provisions Prometheus datasource in Grafana
└── github-runner/
    ├── deploy.sh                         # Manual runner setup (run directly on VPS)
    └── docker-compose.github-runner.yml
```

## deploy.sh

```bash
./deploy.sh prod production              # full-stack production deploy
./deploy.sh dev development              # full-stack development deploy
./deploy.sh prod production api          # deploy api service only
./deploy.sh prod production client       # deploy client service only
```

Requires `.env` (written by CI from GitHub Secrets — never placed manually) and image tag env vars passed inline.

For single-service deploys, only the relevant tag env var is required (e.g. `API_IMAGE_TAG` for `service=api`). Old
version directories under `$HOME/versions/<environment>/` older than 7 days are cleaned up after each deploy (minimum 3
kept).

---

## Critical Invariants

**Deploy order on a fresh server:** Traefik → monitoring stack (optional) → GitHub Runner (optional) → app stack.
Traefik must
exist before any app stack because it creates `traefik-network`.

**`.env` is written by CI, never committed.** `_deploy-service.yml` and `deploy-all.yml` construct it from GitHub
Environment secrets/variables and write it into the version directory (`~/versions/<env>/<sha>/.env`) before calling
`deploy.sh`.

**`VITE_*` env vars** are baked into the client image at build time by Vite. Setting them at container runtime has no
effect — the `docker-entrypoint.sh` placeholder-swap handles this at startup instead.

**Redis data is ephemeral** (BullMQ queue + sessions). No named volume for Redis. Only MySQL data is persisted via
`mysql-data-volume`.

**`deploy.sh` uses `$SCRIPT_DIR`** — must be called by path (`./deployment/deploy.sh`) or from within `deployment/`. The
working directory doesn't matter; only the script's own location does.

**MySQL healthcheck** uses `MYSQL_ROOT_PASSWORD` — it must be present in `.env`.

**Production vs development** differ in: float tag (`latest` vs `dev-latest`), replica counts, network names (
`mysql-network` vs `mysql-dev-network`), volume names. Both use `${GITHUB_SHA::8}` as the versioned tag.

---

## Key Docs

| Topic                                          | Doc                                                       |
|------------------------------------------------|-----------------------------------------------------------|
| System architecture, containers, networks      | [docs/architecture/](../docs/architecture/README.md)      |
| Docker multi-stage builds, GHCR registry       | [DOCKER.md](../docs/deployment/DOCKER.md)                 |
| GitHub Actions workflows, secrets, rollback    | [CICD.md](../docs/deployment/CICD.md)                     |
| Traefik, networking, env vars                  | [INFRASTRUCTURE.md](../docs/deployment/INFRASTRUCTURE.md) |
| Monitoring, backups, security, troubleshooting | [OPERATIONS.md](../docs/deployment/OPERATIONS.md)         |
