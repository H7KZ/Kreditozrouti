# Deployment — Overview

Kreditožrouti uses a containerised deployment architecture: Docker Compose for orchestration, Traefik as the reverse
proxy, GitHub Actions for CI/CD, and GitHub Container Registry (GHCR) for image storage.

---

## Architecture

```
                        Internet (HTTPS)
                               │
                               ▼
                  ┌────────────────────────┐
                  │      Traefik v3        │
                  │  - Automatic TLS       │
                  │  - Let's Encrypt       │
                  │  - Service Discovery   │
                  └────────┬───────────────┘
                           │
             ┌─────────────┼─────────────┐
             │             │             │
             ▼             ▼             ▼
         ┌───────┐    ┌────────┐   ┌──────────┐
         │Client │    │  API   │   │phpMyAdmin│
         │ (×3)  │    │  (×2)  │   │   (×1)   │
         │ Nginx │    │Express │   │          │
         └───────┘    └───┬────┘   └──────────┘
                          │
              ┌───────────┤
              │           │
              ▼           ▼
          ┌────────┐  ┌────────┐
          │ MySQL  │  │ Redis  │
          │  8.4   │  │   7    │
          └────────┘  └───┬────┘
                          │
                          ▼
                    ┌──────────┐
                    │ Scraper  │
                    │   (×5)   │
                    └──────────┘
```

### Network isolation

```
traefik-network (external — Traefik-exposed services only)
  ├── traefik, api, client, phpmyadmin

mysql-network (internal)
  ├── api, mysql

redis-network (internal)
  ├── api, scraper, redis
```

MySQL and Redis are never directly reachable from outside the host.

---

## Environments

| Environment | Purpose           | Tag pattern | Domain            |
|-------------|-------------------|-------------|-------------------|
| Local       | Developer machine | —           | `localhost`       |
| Development | VPS staging       | `dev-*.*.*` | `dev.example.com` |
| Production  | VPS live          | `v*.*.*`    | `example.com`     |

---

## Quick-start (production)

```
1. Provision VPS (Ubuntu 22.04+)
2. Install Docker               → scripts/install-docker.sh
3. Deploy Traefik               → scripts/traefik.sh
4. Configure env vars           → ~/variables/.env.prod
5. Push git tag v*.*.* to repo  → GitHub Actions builds + deploys automatically
6. Verify                       → curl https://example.com/api/health
```

---

## Further Reading

- [Docker images](DOCKER.md) — multi-stage builds, runtime env injection, GHCR registry
- [CI/CD pipeline](CICD.md) — GitHub Actions workflows, secrets, version directories, rollback
- [Infrastructure](INFRASTRUCTURE.md) — Traefik, GlitchTip, networking, volumes, env vars
- [Operations](OPERATIONS.md) — monitoring, logging, security, backup, maintenance, troubleshooting
