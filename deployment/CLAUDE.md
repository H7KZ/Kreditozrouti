# Deployment — CLAUDE.md

> Full reference: [docs/dev/deployment/](../docs/deployment/README.md)

---

## Directory Structure

```
deployment/
├── deploy.sh                              # App stack deployment (run from CI)
├── production/
│   ├── docker-compose.production.yml      # api×1, scraper×2, client×1, mcp×1, mysql, redis (+ phpmyadmin, `admin` profile; sized for a 4GB host)
│   ├── networks.yml
│   └── volumes.yml
├── development/
│   ├── docker-compose.development.yml     # Same services, lower replicas, dev image tags
│   ├── networks.yml
│   └── volumes.yml
├── monitoring/
│   ├── docker-compose.monitoring.yml     # Prometheus + Grafana stack
│   ├── networks.yml
│   ├── volumes.yml
│   ├── prometheus/
│   │   ├── prometheus.yml                # Docker SD scrape config — discovers prod + dev API containers
│   │   └── prometheus.local.yml          # Local scrape config
│   └── grafana/
│       └── provisioning/
│           ├── datasources/
│           │   ├── prometheus.yml        # Auto-provisions Prometheus datasource in Grafana
│           │   └── loki.yml              # Auto-provisions Loki datasource in Grafana
│           ├── dashboards/
│           │   ├── dashboards.yml        # File provisioner — points at this directory, deletion enabled
│           │   ├── api.json / client.json / logs.json / scraper.json  # one dashboard per service
│           │   └── crowdsec.json         # single merged CrowdSec dashboard (LAPI dashboard dropped, metrics unavailable)
│           └── alerting/
│               ├── rules.yml             # Alert rules (infrastructure, scraper, application)
│               ├── notification-policies.yml
│               ├── contact-points.yml    # Discord webhook
│               └── message-templates.yml # discord_alert_title + discord_alert_message templates
└── github-runner/
    ├── deploy.sh                         # Manual runner setup (run directly on VPS)
    └── docker-compose.github-runner.yml
```

## deploy.sh

```bash
./deploy.sh kreditozrouti production            # full-stack production deploy
./deploy.sh dev development                     # full-stack development deploy
./deploy.sh kreditozrouti production api        # deploy api service only
./deploy.sh kreditozrouti production client     # deploy client service only
```

Requires `.env` (written by CI from GitHub Secrets — never placed manually) and image tag env vars passed inline.

For single-service deploys, only the relevant tag env var is required (e.g. `API_IMAGE_TAG` for `service=api`).
`api`/`scraper`/`mcp` single-service deploys also bring up their infrastructure dependencies (`mysql`/`redis`) so the
service never starts without them; `client` uses `--no-deps` (its dependency is the app-level `api`). Old version
directories under `$HOME/kreditozrouti/versions/<environment>/` older than 7 days are cleaned up after each deploy (minimum 3 kept).

---

## Critical Invariants

**Deploy order on a fresh server:** shared Infrastructure Traefik → monitoring stack (optional) → GitHub Runner
(optional) → app stack. Every environment's services attach to the external `public-network` that Traefik publishes
on, and request certs via the `letsencrypt-dns` (DNS-01) resolver - HTTP-01 fails because the domain is
Cloudflare-proxied. Traefik is not deployed by Kreditožrouti: Infrastructure's Traefik owns `public-network` on the
shared VPS and creates it; each `deploy.sh` also creates it if this stack deploys first. This repo no longer ships a
Traefik stack (the former `deployment/traefik/` was removed — Infrastructure owns the single Traefik); services connect
to Infrastructure's `public-network` by name, so they work out of the box.

**Monitoring stack reads the Docker socket.** Prometheus and Alloy in `docker-compose.monitoring.yml` mount
`/var/run/docker.sock` and must run with the host's `docker` group GID via `group_add` (default `988`; override with
`DOCKER_GID` in `.env` if `getent group docker` differs). A wrong GID silently yields zero scrape targets and no logs
(blank Grafana + a permanently firing alert). Each stack deploys under its own Compose project name (`STACK_NAME` in
each `deploy.sh`): monitoring → `kreditozrouti-monitoring`, runner → `kreditozrouti-runner`; the app stack uses
`kreditozrouti` (production) / `kreditozrouti-dev` (development). No project name is shared with another repo — only
the external `public-network` (owned by Infrastructure) is. See NAMING.md in the Infrastructure repo.

**`.env` is written by CI, never committed.** `_deploy-service.yml` and `deploy-all.yml` construct it from GitHub
Environment secrets/variables and write it into the version directory (`~/kreditozrouti/versions/<env>/<sha>/.env`) before calling
`deploy.sh`.

**Alert rules removed from `rules.yml` are not deleted from Grafana by provisioning** — the file provisioner only
adds/updates. Run `scripts/sync-grafana-alerts.sh` (see [MONITORING.md](../docs/deployment/MONITORING.md#keeping-grafana-in-sync-with-rulesyml))
after every monitoring redeploy that touched `rules.yml` to delete orphaned rules and reload provisioning; the
dashboards file provisioner does delete removed dashboards on its own (no `disableDeletion: true` set), so dashboard
files need no equivalent step.

**Monitoring deploys the same versioned way as the app stack.** `deploy-monitoring.yml` uploads
`deployment/monitoring/` + `deployment/lib.sh` into `~/kreditozrouti/versions/monitoring/<sha>/`, runs
`monitoring/deploy.sh` from there, then updates the `~/kreditozrouti/versions/monitoring/current` symlink. Old
version dirs are cleaned up the same way as app deploys (7 days, minimum 3 kept) via the shared
`cleanup_old_versions` in `lib.sh`. No more writing directly into a flat `~/deployment/` — that was the old layout
and diverged from every other prod deploy, which caused ownership/permission drift on the host.

**`VITE_*` env vars** are baked into the client image at build time by Vite. Setting them at container runtime has no
effect — the `docker-entrypoint.sh` placeholder-swap handles this at startup instead. **The swap only works while every
`VITE_*` var is declared under the `build` task's `env` array in root `turbo.json`.** turbo 2 runs tasks in strict env
mode and strips any undeclared variable from the task environment, so the six `ENV` lines in `client/Dockerfile` never
reached vite: no placeholder tokens were baked in, Faro and Umami were silently disabled in production, the app version
reported `unknown`, and the entrypoint's `sed` had nothing to replace (`VITE_API_URL` hid the breakage by falling back
to `/api`). Anyone adding a new `VITE_*` var must add it to `turbo.json` too.

**phpMyAdmin is not internet-reachable.** In both production and development it sits behind `profiles: ['admin']` (so a
plain `up` and every deploy leave it stopped), is published on loopback only (`127.0.0.1:48080` prod,
`127.0.0.1:48081` dev), is attached to the mysql network only, and carries no Traefik labels. `PMA_ARBITRARY`,
`MYSQL_USER`, `MYSQL_PASSWORD` and `PMA_ABSOLUTE_URI` were removed; `PMA_HOST`, `PMA_PORT`, `MYSQL_ROOT_PASSWORD` and
`UPLOAD_LIMIT` remain. Start it with `docker compose --profile admin up -d phpmyadmin` and reach it over
`ssh -L 48080:127.0.0.1:48080 <user>@<host>`. The exposure being removed was a database admin UI carrying the MySQL
root credentials on the public internet; `PMA_ARBITRARY` additionally let a visitor point it at any host.

**Every third-party image is pinned** across `production/`, `development/`, `docker-compose.local.yml`, `monitoring/`
and `github-runner/`: `mysql:9`, `redis:8-alpine`, `phpmyadmin:5.2.3-apache`, `myoung34/github-runner:2.337.0`,
`prom/prometheus:v3`, `grafana/grafana:13.2`, `grafana/loki:3.7`, `grafana/alloy:v1.19.2`,
`ghcr.io/umami-software/umami:postgresql-v2.16`, `postgres:16-alpine`. Pin the major/minor, never `:latest` - every
deploy runs `docker compose pull` and a silent major upgrade of a stateful service is not reversible. Digests were
deliberately not used: there is no Renovate or Dependabot here, so they would have to be bumped by hand and would rot.
**MySQL caveat:** `mysql:latest` now resolves to MySQL 26.x (Oracle moved MySQL to calendar versioning), and MySQL
refuses to start against a volume initialised by a newer major - confirm the running version with
`docker compose exec mysql mysql --version` before any deploy that changes the `mysql:9` pin.

**Redis data is persisted** via a named Docker volume (`kreditozrouti-redis-volume-prod` in production,
`kreditozrouti-redis-volume-dev` in development). Redis runs with AOF persistence (`--appendonly yes`) and `noeviction`
policy so sessions and queue jobs are never silently dropped.

**Both MySQL and Redis require named volumes to be created on the host before first `docker compose up`.** Production:
`docker volume create kreditozrouti-mysql-volume-prod && docker volume create kreditozrouti-redis-volume-prod`.
Development: `docker volume create kreditozrouti-mysql-volume-dev && docker volume create kreditozrouti-redis-volume-dev`.

**`deploy.sh` uses `$SCRIPT_DIR`** — must be called by path (`./deployment/deploy.sh`) or from within `deployment/`. The
working directory doesn't matter; only the script's own location does.

**MySQL healthcheck** uses `MYSQL_ROOT_PASSWORD` — it must be present in `.env`.

**Production vs development** differ in: float tag (`latest` vs `dev-latest`), replica counts, network names
(`kreditozrouti-mysql-network-prod` vs `-dev`), volume names, and compose project (`kreditozrouti` vs
`kreditozrouti-dev`). Both use `${GITHUB_SHA::8}` as the versioned tag.

---

## Key Docs

| Topic                                          | Doc                                                           |
|------------------------------------------------|---------------------------------------------------------------|
| Docker multi-stage builds, GHCR registry       | [DOCKER.md](../docs/deployment/DOCKER.md)                     |
| GitHub Actions workflows, secrets, rollback    | [CICD.md](../docs/deployment/CICD.md)                         |
| Traefik, networking, env vars                  | [INFRASTRUCTURE.md](../docs/deployment/INFRASTRUCTURE.md)     |
| Monitoring, backups, security, troubleshooting | [OPERATIONS.md](../docs/deployment/OPERATIONS.md)             |
| Observability stack — full pipeline reference  | [MONITORING.md](../docs/deployment/MONITORING.md)             |
| Moving monitoring to its own host (draft)      | [MONITORING_SPLIT.md](../docs/deployment/MONITORING_SPLIT.md) |
