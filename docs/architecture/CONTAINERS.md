# Containers

## Local Development

Defined in `../../docker-compose.local.yml`. Starts only infrastructure — app services run as native Node.js processes (
`make dev`).

```
docker-compose.local.yml
├── mysql        port 43306              ← mysql:9, volume: mysql-local-data
├── redis        port 46379              ← redis:8-alpine (no named volume, ephemeral)
└── phpmyadmin   port 127.0.0.1:48080    ← phpmyadmin:5.2.3-apache
```

phpMyAdmin binds the loopback interface only (`127.0.0.1:48080:80`, previously `0.0.0.0`), so a root-credentialled
database UI is no longer published to whatever network the laptop is joined to. `PMA_ARBITRARY` is gone for the same
reason - it turned the container into an open MySQL client against any host a visitor typed in. The local access URL
is unchanged: http://localhost:48080.

App processes run directly on the host:

```
make dev-api      → node on :40080
make dev-client   → Vite on :45173
make dev-scraper  → node worker (no port)
```

---

## Production / Staging Stacks

Defined under `../../deployment`. Each stack is a separate Compose file with explicit network and volume declarations
split into companion files.

### Traefik

Owned by the **Infrastructure** repo (single shared Traefik on the VPS), not this repo. It creates
`public-network`; this stack attaches to it as external. This repo no longer ships a Traefik stack.

### App Stack (`../../deployment/production` or `development/`)

Network/volume names below are the production (`-prod`) forms; development uses the matching `-dev`
forms. See NAMING.md in the Infrastructure repo.

```
docker-compose.production.yml
├── api         ×1 replica     public-network + kreditozrouti-mysql-network-prod + kreditozrouti-redis-network-prod + kreditozrouti-monitoring-network
├── scraper     ×2 replicas    kreditozrouti-redis-network-prod + kreditozrouti-monitoring-network
├── client      ×1 replica     public-network only
├── mcp          ×1            public-network + kreditozrouti-mysql-network-prod  (MCP_PORT default 3000; GET /health)
├── mysql        ×1            kreditozrouti-mysql-network-prod, volume: kreditozrouti-mysql-volume-prod
├── redis        ×1            kreditozrouti-redis-network-prod, volume: kreditozrouti-redis-volume-prod
└── phpmyadmin   profile:admin kreditozrouti-mysql-network-prod only, published on 127.0.0.1:48080 (dev: 48081)
```

**`mcp` container env vars:** `MYSQL_URI`, `MCP_PORT`, `NODE_ENV`, `LOG_LEVEL`

**phpMyAdmin is not part of a normal deploy.** It sits behind Compose profile `admin`, so `docker compose up -d` leaves
it stopped. It is no longer on `public-network` and carries no Traefik labels, so the shared Traefik has nothing to
route to it even when it runs. An internet-reachable DB admin UI holding the MySQL root credentials was the exposure;
the old `PMA_ARBITRARY=1` made it worse by letting a visitor point the login form at any host. `PMA_ARBITRARY`,
`MYSQL_USER`, `MYSQL_PASSWORD` and `PMA_ABSOLUTE_URI` were all removed; `PMA_HOST`, `PMA_PORT`,
`MYSQL_ROOT_PASSWORD` and `UPLOAD_LIMIT` remain.

```bash
docker compose --profile admin up -d phpmyadmin       # on the VPS, for the duration of the work
ssh -L 48080:127.0.0.1:48080 <user>@<host>            # production (development: port 48081)
# then browse http://localhost:48080
```

Development uses lower replica counts and `dev-*` image tags; network/volume names use the `-dev` suffix.

### GitHub Runner Stack (optional, `../../deployment/github-runner`)

Self-hosted GitHub Actions runners registered to the repo.

---

## Networks

Names shown are the `-prod` forms; `-dev` equivalents exist for development.

| Network                              | Purpose                         | Who joins                             |
|--------------------------------------|---------------------------------|---------------------------------------|
| `public-network`                     | Public ingress, Traefik routing | api, client, mcp (+ Infra Traefik)    |
| `kreditozrouti-mysql-network-prod`   | DB access                       | api, mcp, mysql, phpmyadmin           |
| `kreditozrouti-redis-network-prod`   | Queue + sessions                | api, scraper, redis                   |
| `kreditozrouti-monitoring-network`   | Prometheus scrape (per-repo)    | api, scraper, prometheus, alloy       |

Networks are **isolated** — the scraper cannot reach MySQL directly; it can only talk to Redis. The client container
(Nginx) cannot reach MySQL or Redis.

---

## Volumes

Names shown are the `-prod` forms; `-dev` equivalents exist for development.

| Volume                              | Mounted by | Data                       | Ephemeral?     |
|-------------------------------------|------------|----------------------------|----------------|
| `kreditozrouti-mysql-volume-prod`   | mysql      | All course/study-plan data | No — persisted |
| `kreditozrouti-redis-volume-prod`   | redis      | BullMQ queues, sessions (AOF) | No — persisted |

TLS certificates live in the Infrastructure Traefik stack's `traefik-certificates-volume`, not here.

---

## Traefik Routing

All production traffic enters through Traefik on port 443 (TLS via Let's Encrypt DNS-01 + Cloudflare).

| Service | Rule               | Priority | Notes                                  |
|---------|--------------------|----------|----------------------------------------|
| API     | `PathPrefix(/api)` | 100      | Strips `/api` prefix before forwarding |
| MCP     | `PathPrefix(/mcp)` | 50       | Streamable HTTP transport              |
| Client  | `PathPrefix(/)`    | 10       | Catch-all, lowest priority             |

phpMyAdmin used to be routed here (`PathPrefix(/phpmyadmin)`, priority 80). Its Traefik labels were removed - it is now
loopback-only behind an SSH tunnel, as described above.

Port 80 redirects to 443. The `traefik.yml` static config handles ACME, entrypoints, and ping.

---

## Deploy Order (Fresh Server)

```
1. Traefik stack      ← creates public-network, TLS
2. GitHub Runner      ← (optional) CI runners
3. App stack          ← api, scraper, client, mysql, redis
```

App stack must come last because it depends on `public-network` already existing.

Full deployment details: [docs/deployment/](../deployment/README.md)
