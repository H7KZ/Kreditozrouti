# Deployment

GitHub Actions builds four app images (API, web, scraper, MCP), pushes them to GHCR, and deploys them with Docker Compose. A separate Infrastructure repo runs shared Traefik. This repo also deploys an optional monitoring stack.

| Environment | Compose project | Trigger |
| --- | --- | --- |
| Local | Local Docker and `make dev` | Developer command |
| Development | `kreditozrouti-dev` | Manual `Deploy` dispatch |
| Production | `kreditozrouti` | Push to `main` for changed service paths, or manual dispatch |
| Monitoring | `kreditozrouti-monitoring` | Manual `Deploy Monitoring` dispatch |

On a fresh host, install Docker, deploy shared Traefik, configure the GitHub environment secrets, optionally deploy monitoring, then run the `Deploy` workflow for the app. The GitHub runner is optional if another self-hosted runner is available. Check `https://kreditozrouti.cz/api/health` after production deployment. [DNS setup](../setup/DNS.md) lists the actual public routes.

Start here:

- [CI/CD](CICD.md) - triggers, secrets, deploys, rollback
- [Infrastructure](INFRASTRUCTURE.md) - networks, volumes, configuration, phpMyAdmin
- [Docker images](DOCKER.md) - image builds, tags, runtime web settings
- [Operations](OPERATIONS.md) - health, maintenance, recovery
- [Monitoring](MONITORING.md) - metrics, logs, alerts, dashboards

The [PostgreSQL 18 migration](HANDOFF-umami-pg18-migration.md) is a one-time runbook. The [monitoring split proposal](MONITORING_SPLIT.md) is a draft, not an implemented topology.
