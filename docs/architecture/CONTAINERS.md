# Containers

## Local Development

Defined in `docker-compose.local.yml`. Starts only infrastructure — app services run as native Node.js processes (`make dev`).

```
docker-compose.local.yml
├── mysql        port 43306  ← MySQL 8, volume: mysql-local-data
├── redis        port 46379  ← Redis (no named volume, ephemeral)
└── phpmyadmin   port 48080  ← phpMyAdmin (user: kreditozrouti)
```

App processes run directly on the host:
```
make dev-api      → node on :40080
make dev-client   → Vite on :45173
make dev-scraper  → node worker (no port)
```

---

## Production / Staging Stacks

Defined under `deployment/`. Each stack is a separate Compose file with explicit network and volume declarations split into companion files.

### Traefik Stack (`deployment/traefik/`)
Must be deployed first on a fresh server — creates `traefik-network`.

```
traefik
├── traefik container     :80 (redirect) + :443 (TLS)
│   └── network: traefik-network (external)
└── volumes: traefik-letsencrypt-volume
```

### App Stack (`deployment/production/` or `development/`)

```
docker-compose.production.yml
├── api         ×2 replicas    traefik-network + mysql-network + redis-network
├── scraper     ×5 replicas    redis-network only
├── client      ×3 replicas    traefik-network only
├── mysql        ×1            mysql-network, volume: mysql-data-volume
├── redis        ×1            redis-network (no named volume — ephemeral)
└── phpmyadmin   ×1            traefik-network + mysql-network
```

Development uses lower replica counts and `dev-*` image tags; network names include `-dev-` suffix.

### GlitchTip Stack (optional, `deployment/glitchtip/`)

```
glitchtip-web      ← Django frontend
glitchtip-worker   ← Celery worker
glitchtip-migrate  ← One-shot DB migration
glitchtip-postgres ← Postgres (GlitchTip's own DB)
glitchtip-valkey   ← Valkey (Redis-compatible cache)
```

### GitHub Runner Stack (optional, `deployment/github-runner/`)

Self-hosted GitHub Actions runners registered to the repo.

---

## Networks

| Network | Purpose | Who joins |
|---------|---------|-----------|
| `traefik-network` | Public ingress, Traefik routing | traefik, api, client, phpmyadmin |
| `mysql-network` | DB access | api, mysql, phpmyadmin |
| `redis-network` | Queue + sessions | api, scraper, redis |

Networks are **isolated** — the scraper cannot reach MySQL directly; it can only talk to Redis. The client container (Nginx) cannot reach MySQL or Redis.

---

## Volumes

| Volume | Mounted by | Data | Ephemeral? |
|--------|-----------|------|-----------|
| `mysql-data-volume` | mysql | All course/study-plan data | No — persisted |
| `traefik-letsencrypt-volume` | traefik | TLS certificates | No — persisted |
| Redis (no volume) | redis | BullMQ queues, sessions | Yes — lost on restart |

---

## Traefik Routing

All production traffic enters through Traefik on port 443 (TLS via Let's Encrypt DNS-01 + Cloudflare).

| Service | Rule | Priority | Notes |
|---------|------|----------|-------|
| API | `PathPrefix(/api)` | 100 | Strips `/api` prefix before forwarding |
| phpMyAdmin | `PathPrefix(/pma)` | 80 | Strips `/pma` prefix |
| Client | `PathPrefix(/)` | 10 | Catch-all, lowest priority |

Port 80 redirects to 443. The `traefik.yml` static config handles ACME, entrypoints, and ping.

---

## Deploy Order (Fresh Server)

```
1. Traefik stack      ← creates traefik-network, TLS
2. GlitchTip stack    ← (optional) error tracking
3. GitHub Runner      ← (optional) CI runners
4. App stack          ← api, scraper, client, mysql, redis
```

App stack must come last because it depends on `traefik-network` already existing.

Full deployment details: [docs/deployment/](../deployment/README.md)
