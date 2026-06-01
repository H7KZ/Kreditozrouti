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
└── github-runner/
    └── docker-compose.github-runner.yml
```

## deploy.sh

```bash
./deploy.sh prod production    # production
./deploy.sh dev development    # staging
```

Requires `.env` (secrets) and `.images` (CI-written: `IMAGE_REGISTRY`, `IMAGE_PREFIX`, `IMAGE_TAG`).

---

## Critical Invariants

**Deploy order on a fresh server:** Traefik → GitHub Runner (optional) → app stack. Traefik must
exist before any app stack because it creates `traefik-network`.

**`deployment/.env` is gitignored.** Secrets never go in compose files. The file lives in `~/variables/.env.prod` on the
VPS and is symlinked or copied into the deployment directory.

**`VITE_*` env vars** are baked into the client image at build time by Vite. Setting them at container runtime has no
effect — the `docker-entrypoint.sh` placeholder-swap handles this at startup instead.

**Redis data is ephemeral** (BullMQ queue + sessions). No named volume for Redis. Only MySQL data is persisted via
`mysql-data-volume`.

**`deploy.sh` uses `$SCRIPT_DIR`** — must be called by path (`./deployment/deploy.sh`) or from within `deployment/`. The
working directory doesn't matter; only the script's own location does.

**MySQL healthcheck** uses `MYSQL_ROOT_PASSWORD` — it must be present in `.env`.

**Production vs development** differ in: image tag prefix (`v*` vs `dev-*`), replica counts, network names (
`mysql-network` vs `mysql-dev-network`), volume names.

---

## Key Docs

| Topic                                        | Doc                                                       |
|----------------------------------------------|-----------------------------------------------------------|
| System architecture, containers, networks    | [docs/architecture/](../docs/architecture/README.md)      |
| Docker multi-stage builds, GHCR registry     | [DOCKER.md](../docs/deployment/DOCKER.md)                 |
| GitHub Actions workflows, secrets, rollback  | [CICD.md](../docs/deployment/CICD.md)                     |
| Traefik, networking, env vars       | [INFRASTRUCTURE.md](../docs/deployment/INFRASTRUCTURE.md) |
| Monitoring, backups, security, troubleshooting | [OPERATIONS.md](../docs/deployment/OPERATIONS.md)         |
