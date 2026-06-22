# Deployment — Infrastructure

Traefik reverse proxy, Docker networking, volumes, and environment variable configuration.

---

## Traefik

Traefik is the single external entry point. It handles TLS termination (via Let's Encrypt + Cloudflare DNS-01),
HTTP→HTTPS redirect, and routes traffic to the right container by host/path.

### Configuration (`deployment/traefik/traefik.yml`)

```yaml
api:
	dashboard: true
	insecure: false

entryPoints:
	web:
		address: ':80'
		http:
			redirections:
				entryPoint:
					to: websecure
					scheme: https
	websecure:
		address: ':443'
	traefik:
		address: ':8080'

providers:
	docker:
		endpoint: 'unix:///var/run/docker.sock'
		exposedByDefault: false
		network: traefik-network

certificatesResolvers:
	cloudflare:
		acme:
			email: ${ACME_EMAIL}
			storage: /certs/acme.json
			dnsChallenge:
				provider: cloudflare
				resolvers: [ '1.1.1.1:53', '8.8.8.8:53' ]
```

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

| Volume                        | Service | Contents                |
|-------------------------------|---------|-------------------------|
| `mysql-data-volume`           | MySQL   | Database files          |
| `traefik-certificates-volume` | Traefik | TLS certs (`acme.json`) |
| `traefik-logs-volume`         | Traefik | Access logs             |

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
CLOUDFLARE_DNS_API_TOKEN=<cloudflare-token>
CLOUDFLARE_EMAIL=<cloudflare-email>
ACME_EMAIL=<letsencrypt-email>
```

**Generate secrets:**

```bash
openssl rand -hex 32   # session secret, Django secret key
openssl rand -hex 24   # command token
```
