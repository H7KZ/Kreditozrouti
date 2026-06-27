# Deployment — Infrastructure

Traefik reverse proxy, Docker networking, volumes, and environment variable configuration.

---

## Traefik

Traefik is the single external entry point. It handles TLS termination (via Let's Encrypt + Cloudflare DNS-01),
HTTP→HTTPS redirect, routes traffic to the right container by host/path, and enforces global security policies
for all traffic via entrypoint-level middlewares.

### Architecture

```
Internet → Cloudflare (orange cloud) → Traefik :443
                                            │
                              ┌─────────────┴────────────────┐
                              │  websecure entrypoint         │
                              │  middlewares (all requests):  │
                              │  1. crowdsec-bouncer@file     │  IP ban + OWASP AppSec
                              │  2. rate-limit@file           │  100 avg / 200 burst per IP
                              │  3. security-headers@file     │  HSTS, X-Frame, CSP, etc.
                              └──────────────────────────────┘
                                            │
                              ┌─────────────┴────────────────┐
                              │  CrowdSec sidecar            │
                              │  LAPI :8080  AppSec :7422    │
                              └──────────────────────────────┘
```

### Static config (`deployment/traefik/traefik.yml`)

Key configuration highlights:

- **Real IP extraction** — `forwardedHeaders.trustedIPs` on the `websecure` entrypoint is set to all Cloudflare
  IPv4 ranges. Traefik reads the real client IP from `X-Forwarded-For` when the request arrives from a trusted
  Cloudflare edge IP. Without this, rate limiting and CrowdSec would ban Cloudflare's IPs instead of attackers'.
- **File provider** — `providers.file` points to `/dynamic.yml` (watched). Global middlewares are defined there
  rather than as Docker labels, keeping per-service labels clean.
- **Entrypoint-level middlewares** — all three global middlewares are applied on `websecure` so every router
  inherits them without per-service configuration.
- **TLS enforcement** — TLS options are defined in `dynamic.yml` with `name: default` (auto-applies to all
  routers): minimum TLS 1.2, ECDHE+AES-GCM/ChaCha20 cipher suites only.
- **Prometheus metrics** — enabled via `metrics.prometheus`. Served on the `traefik` entrypoint (port 8080) at
  `/metrics`. Prometheus scrapes it via a static job (Traefik joins `alloy-network` for this).
- **CrowdSec bouncer plugin** — declared under `experimental.plugins`. The LAPI key is passed as an env var
  (`CROWDSEC_BOUNCER_API_KEY`) and read in `dynamic.yml` via Go template: `{{ env "CROWDSEC_BOUNCER_API_KEY" }}`.
- **Staging cert resolver** — `letsencrypt-staging` resolver available for testing cert issuance without
  burning Let's Encrypt rate limits. Uses `storage: /certs/acme-staging.json`.
- **Access log** — full JSON format (all requests, no error-only filter) written to
  `/var/log/traefik/access.log` on `traefik-logs-volume`. Tailed by Alloy → Loki.

### Dynamic config (`deployment/traefik/dynamic.yml`)

Defines three global middlewares and TLS options:

| Middleware         | What it does                                                                                                                          |
|--------------------|---------------------------------------------------------------------------------------------------------------------------------------|
| `security-headers` | HSTS (1y + preload), X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy, Permissions-Policy, X-XSS-Protection: 0 |
| `rate-limit`       | 100 avg / 200 burst per real IP per second; source depth 1 (reads real IP from X-Forwarded-For)                                       |
| `crowdsec-bouncer` | IP reputation via CrowdSec LAPI; OWASP AppSec CRS request inspection (SQLi, XSS, LFI, etc.)                                           |

API key injection: Traefik's file provider processes Go templates in `dynamic.yml`, so
`crowdsecLapiKey: '{{ env "CROWDSEC_BOUNCER_API_KEY" }}'` is resolved at runtime from the container env var.

### CrowdSec (`deployment/traefik/crowdsec/`)

CrowdSec runs as a sidecar container in the Traefik compose stack. It provides two threat-detection layers:

1. **Log-based detection** — reads Traefik's JSON access log, applies behavioral scenarios
   (brute force, scanning, credential stuffing) from the `crowdsecurity/traefik` collection.
2. **AppSec engine** — per-request OWASP CRS inspection on port 7422. The Traefik bouncer plugin forwards
   each request to AppSec before it reaches the backend. Blocks SQLi, XSS, LFI, RCE attempts.

**Bootstrap (one-time on VPS):**

```bash
# Phase 1 — start CrowdSec and generate the bouncer API key
docker compose -f deployment/traefik/docker-compose.traefik.yml up -d crowdsec
docker exec crowdsec cscli bouncers add traefik-bouncer
# → prints the API key — add it to GitHub Secrets as CROWDSEC_BOUNCER_API_KEY

# Phase 2 — full deploy with the key now in place
# CI/CD handles this automatically via the normal deploy workflow
```

**Useful commands:**

```bash
docker exec crowdsec cscli decisions list    # active bans
docker exec crowdsec cscli alerts list       # triggered scenarios
docker exec crowdsec cscli bouncers list     # connected bouncers + last_pull
```

### Dashboard protection

The Traefik dashboard router has one layer of protection:

1. **Basic auth** (`traefik-auth`) — htpasswd file at `TRAEFIK_CREDENTIALS_PATH`.

### Deploy Traefik

Traefik is deployed via the `deploy-traefik.yml` GitHub Actions workflow. To run manually:

```bash
DEPLOYMENT_PATH=~/deployment \
  TRAEFIK_DOMAIN=traefik.example.com \
  TRAEFIK_CREDENTIALS_PATH=~/.htpasswd \
  CF_API_EMAIL=your@email.com \
  CF_DNS_API_TOKEN=YOUR_CF_TOKEN \
  bash ~/deployment/traefik/deploy.sh
```

See [scripts/INFRASTRUCTURE.md](../scripts/INFRASTRUCTURE.md) for the deploy script reference.

### Routing labels

**Client** (root path, lowest priority):

```yaml
labels:
	- 'traefik.enable=true'
	- 'traefik.http.routers.client.rule=Host(`${DOMAIN}`)'
	- 'traefik.http.routers.client.entrypoints=websecure'
	- 'traefik.http.routers.client.tls.certresolver=cloudflare'
	- 'traefik.http.routers.client.priority=10'
```

**API** (`/api` prefix, strips prefix before forwarding):

```yaml
labels:
	- 'traefik.http.routers.api.rule=Host(`${DOMAIN}`) && PathPrefix(`/api`)'
	- 'traefik.http.routers.api.priority=100'
	- 'traefik.http.middlewares.api-stripprefix.stripprefix.prefixes=/api'
	- 'traefik.http.routers.api.middlewares=api-stripprefix'
```

**phpMyAdmin** (`/phpmyadmin` prefix, priority 80):

```yaml
labels:
	- 'traefik.http.routers.phpmyadmin.rule=Host(`${DOMAIN}`) && PathPrefix(`/phpmyadmin`)'
	- 'traefik.http.routers.phpmyadmin.priority=80'
	- 'traefik.http.middlewares.phpmyadmin-stripprefix.stripprefix.prefixes=/phpmyadmin'
```

**Bull Board** (`/bullboard` prefix, priority 90, internal only):

```yaml
labels:
	- 'traefik.http.routers.bullboard.rule=Host(`${DOMAIN}`) && PathPrefix(`/bullboard`)'
	- 'traefik.http.routers.bullboard.priority=90'
```

Note: `/bullboard` is **not** exposed publicly in production. The Traefik label exists so the route is consistently
addressable on the internal network. Access via SSH port-forwarding or a bastion host.

**Grafana** (`/grafana` prefix, priority 85, internal only — monitoring stack):

```yaml
labels:
	- 'traefik.http.routers.grafana.rule=Host(`${DOMAIN}`) && PathPrefix(`/grafana`)'
	- 'traefik.http.routers.grafana.priority=85'
```

Priority rule: API (100) > Bull Board (90) > phpMyAdmin (80+) > Grafana (85) > Client (10).

### Deploy Traefik

Traefik is deployed via the `deploy-traefik.yml` GitHub Actions workflow. To run manually:

```bash
DEPLOYMENT_PATH=~/deployment \
  TRAEFIK_DOMAIN=traefik.example.com \
  TRAEFIK_CREDENTIALS_PATH=~/.htpasswd \
  CF_API_EMAIL=your@email.com \
  CF_DNS_API_TOKEN=YOUR_CF_TOKEN \
  bash ~/deployment/traefik/deploy.sh
```

See [scripts/INFRASTRUCTURE.md](../scripts/INFRASTRUCTURE.md) for the deploy script reference.

### Deploy Monitoring Stack

The monitoring stack (`deployment/monitoring/`) runs Prometheus and Grafana as a separate compose project.

```bash
cd deployment/monitoring
docker compose -p monitoring -f docker-compose.monitoring.yml up -d
```

**Deploy order:** Traefik must be up first (monitoring containers attach to `traefik-network`). Deploy monitoring before
the app stack so Prometheus is ready to scrape from the moment API containers come up.

Prometheus scrapes `GET /metrics` on each API container at a configurable interval (default: 15 s). Grafana is
auto-provisioned with Prometheus as the default datasource via `grafana/provisioning/datasources/prometheus.yml`.

---

### Services

| Container  | Image                    | Purpose                |
|------------|--------------------------|------------------------|
| `postgres` | `postgres:16-alpine`     | Database               |
| `valkey`   | `valkey/valkey:8-alpine` | Redis-compatible cache |

---

## Networking

### Network topology

```
traefik-network (external)    — Traefik-exposed services
  traefik, api, client, phpmyadmin

mysql-network (internal)      — database access only
  api, mysql

redis-network (internal)      — cache + queue access only
  api, scraper, redis
```

MySQL and Redis have no direct external exposure.

### Creating networks

Networks and volumes are created automatically by `deploy.sh` (reads from `networks.yml`), but can also be created
manually:

```bash
docker network create traefik-network
docker network create mysql-network
docker network create redis-network
```

---

## Volumes

### Production volumes (`deployment/production/volumes.yml`)

| Volume                        | Service  | Contents                        |
|-------------------------------|----------|---------------------------------|
| `mysql-data-volume`           | MySQL    | Database files                  |
| `traefik-certificates-volume` | Traefik  | TLS certs (`acme.json`)         |
| `traefik-logs-volume`         | Traefik  | Access logs (shared with Alloy) |
| `crowdsec-db-volume`          | CrowdSec | CrowdSec database + decisions   |
| `crowdsec-config-volume`      | CrowdSec | CrowdSec configuration + rules  |

### Volume management

```bash
# Backup a volume
docker run --rm \
  -v mysql-data-volume:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/mysql-backup.tar.gz /data

# Restore a volume
docker run --rm \
  -v mysql-data-volume:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/mysql-backup.tar.gz -C /
```

---

## Environment Variables

Environment files live in `~/variables/` on the VPS, never in the repository.

| File                    | Environment |
|-------------------------|-------------|
| `~/variables/.env.prod` | Production  |
| `~/variables/.env.dev`  | Development |

### Required variables

```env
PROJECT=kreditozrouti
DOMAIN=example.com

# API
API_SESSION_SECRET=<openssl rand -hex 32>
API_COMMAND_TOKEN=<openssl rand -hex 24>
API_ALLOWED_ORIGINS=https://example.com

# Client
VITE_API_URL=https://example.com/api

# MySQL
MYSQL_USER=kreditozrouti
MYSQL_PASSWORD=<strong-password>
MYSQL_ROOT_PASSWORD=<strong-root-password>
MYSQL_URI=mysql://kreditozrouti:<password>@mysql:3306/kreditozrouti

# Redis
REDIS_URI=redis://redis:6379
REDIS_PASSWORD=<redis-password>

# Optional — Faro browser telemetry
VITE_FARO_COLLECTOR_URL=https://example.com/faro/collect

# Traefik
CF_DNS_API_TOKEN=<cloudflare-token>
CF_API_EMAIL=<cloudflare-email>
TRAEFIK_DOMAIN=traefik.example.com
TRAEFIK_CREDENTIALS_PATH=/path/to/.htpasswd

# CrowdSec (generate via: cscli bouncers add traefik-bouncer)
CROWDSEC_BOUNCER_API_KEY=<generated-key>
```

**Generate secrets:**

```bash
openssl rand -hex 32   # session secret, Django secret key
openssl rand -hex 24   # command token
```
