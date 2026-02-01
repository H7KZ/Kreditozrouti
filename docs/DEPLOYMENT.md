# Deployment Documentation

Comprehensive documentation for deploying the Kreditozrouti application.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Docker Setup](#docker-setup)
- [Environment Configuration](#environment-configuration)
- [Networking](#networking)
- [Storage & Volumes](#storage--volumes)
- [CI/CD Pipeline](#cicd-pipeline)
- [Deployment Scripts](#deployment-scripts)
- [Traefik Reverse Proxy](#traefik-reverse-proxy)
- [Error Tracking (GlitchTip)](#error-tracking-glitchtip)
- [Production Deployment](#production-deployment)
- [Development Deployment](#development-deployment)
- [Local Development](#local-development)
- [Monitoring & Logging](#monitoring--logging)
- [Security](#security)
- [Backup & Recovery](#backup--recovery)
- [Maintenance](#maintenance)
- [Troubleshooting](#troubleshooting)

---

## Overview

Kreditozrouti uses a modern, containerized deployment architecture with Docker, orchestrated via Docker Compose, and automated through GitHub Actions CI/CD pipelines.

**Key Features:**
- Multi-service architecture (API, Client, Scraper)
- Automatic HTTPS with Let's Encrypt
- Traefik reverse proxy with automatic service discovery
- Horizontal scaling via container replicas
- Zero-downtime deployments with version directories
- Self-hosted error tracking (GlitchTip)
- GitHub Container Registry for images
- Self-hosted GitHub Actions runners

**Environments:**
- **Local**: Development on local machine
- **Development**: Staging environment on VPS
- **Production**: Production environment on VPS

---

## Architecture

### System Overview

```
┌────────────────────────────────────────────────────────────────┐
│                    Internet (HTTPS)                            │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │   Traefik v3.6.7       │
            │   (Reverse Proxy)      │
            │   - Automatic TLS      │
            │   - Let's Encrypt      │
            │   - Service Discovery  │
            └────────┬───────────────┘
                     │
        ┏────────────┼────────────┓
        │            │            │
        ▼            ▼            ▼
    ┌───────┐   ┌────────┐   ┌──────────┐
    │ Client│   │  API   │   │phpMyAdmin│
    │ (×3)  │   │  (×2)  │   │   (×1)   │
    │Nginx  │   │Express │   │          │
    └───────┘   └───┬────┘   └────┬─────┘
                    │             │
        ┌───────────┼─────────────┘
        │           │
        ▼           ▼
    ┌────────┐  ┌────────┐
    │ MySQL  │  │ Redis  │
    │  8.4   │  │   7    │
    │  (×1)  │  │  (×1)  │
    └────────┘  └───┬────┘
                    │
                    ▼
              ┌──────────┐
              │ Scraper  │
              │   (×5)   │
              │  Node.js │
              └──────────┘
```

### Service Layers

**1. Reverse Proxy Layer (Traefik)**
- External entry point
- TLS termination
- Path-based routing
- Automatic service discovery

**2. Application Layer**
- Client: Vue 3 SPA served via Nginx
- API: Express 5 REST backend
- Scraper: Background job processor

**3. Data Layer**
- MySQL: Persistent database
- Redis: Cache and job queue

---

## Prerequisites

### Required Software

**VPS/Server:**
- Ubuntu 22.04+ or Debian 12+
- Docker 24.0+
- Docker Compose v2.20+
- SSH access with sudo privileges
- 4GB+ RAM (8GB+ recommended for production)
- 40GB+ disk space

**Local Development:**
- Node.js 22+
- pnpm 10.20.0+
- Docker Desktop (for local infrastructure)

### External Services

**Required:**
- GitHub account (for CI/CD and container registry)
- Cloudflare account with domain and API token
- Domain name with DNS managed by Cloudflare

**Optional:**
- Self-hosted GitHub Actions runner
- GlitchTip for error tracking

---

## Docker Setup

### Docker Images

All services use multi-stage builds for optimized production images.

#### API Image

**Location:** `api/Dockerfile`

**Base:** `node:24-alpine`

**Multi-stage Build:**

```dockerfile
# Stage 1: Builder
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm@10.20.0
RUN pnpm install --frozen-lockfile
COPY ../deployment .
RUN pnpm run build

# Stage 2: Production
FROM node:24-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 80
CMD ["node", "dist/api/src/index.js"]
```

**Features:**
- Installs all dependencies (including Scraper for workspace)
- Compiles TypeScript
- Prunes to production dependencies
- Exposes port 80
- Runs compiled JavaScript

---

#### Client Image

**Location:** `client/Dockerfile`

**Multi-stage Build:**

```dockerfile
# Stage 1: Builder
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm@10.20.0
RUN pnpm install --frozen-lockfile
COPY . .
ENV VITE_API_URL=__VITE_API_URL_PLACEHOLDER__
ENV VITE_SENTRY_DSN=__VITE_SENTRY_DSN_PLACEHOLDER__
ENV VITE_SENTRY_RELEASE=__VITE_SENTRY_RELEASE_PLACEHOLDER__
RUN pnpm run build

# Stage 2: Nginx
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
```

**Features:**
- Vite build with placeholder environment variables
- Nginx serves static files
- Runtime environment variable injection
- SPA routing support
- Gzip compression

**Runtime Environment Injection:**

The `docker-entrypoint.sh` script replaces placeholders at container startup:

```bash
#!/bin/sh
# Replace placeholders in built JavaScript
find /usr/share/nginx/html -type f -name "*.js" -exec \
  sed -i \
    -e "s|__VITE_API_URL_PLACEHOLDER__|${VITE_API_URL}|g" \
    -e "s|__VITE_SENTRY_DSN_PLACEHOLDER__|${VITE_SENTRY_DSN}|g" \
    -e "s|__VITE_SENTRY_RELEASE_PLACEHOLDER__|${VITE_SENTRY_RELEASE}|g" \
    {} \;

exec "$@"
```

**Benefit:** Single Docker image works in multiple environments without rebuilding.

---

#### Scraper Image

**Location:** `scraper/Dockerfile`

**Multi-stage Build:**

```dockerfile
# Stage 1: Builder
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm@10.20.0
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build
# Install Puppeteer Chrome
RUN npx puppeteer browsers install chrome

# Stage 2: Production
FROM node:24-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /root/.cache/puppeteer /root/.cache/puppeteer
EXPOSE 80
CMD ["node", "dist/index.js"]
```

**Features:**
- Includes Puppeteer Chrome browser
- Compiles TypeScript
- Production-only dependencies
- Background job processing

---

### Image Registry

**Registry:** GitHub Container Registry (GHCR)

**Image Naming Convention:**

```
ghcr.io/<owner>/<repo>/api:<tag>
ghcr.io/<owner>/<repo>/client:<tag>
ghcr.io/<owner>/<repo>/scraper:<tag>
```

**Tags:**

| Environment | Tag Pattern | Example |
|-------------|-------------|---------|
| Production | `v*.*.*`, `latest` | `v1.0.0`, `latest` |
| Development | `dev-*.*.*`, `dev-latest` | `dev-1.0.0`, `dev-latest` |

**Authentication:**

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

---

## Environment Configuration

### Environment Files

**Location:** `~/variables/` on VPS

| File | Environment | Purpose |
|------|-------------|---------|
| `.env.prod` | Production | Production environment variables |
| `.env.dev` | Development | Development environment variables |
| `.env.example` | Template | Example configuration (in repository) |

### Required Variables

**Common:**

```env
PROJECT=kreditozrouti
ENV=production  # or development
DOMAIN=example.com

# API
API_PORT=80
API_URI=https://example.com/api
API_DOMAIN=example.com
API_ALLOWED_ORIGINS=https://example.com
API_SESSION_SECRET=<random-secret>
API_COMMAND_TOKEN=<random-token>

# Client
VITE_API_URL=https://example.com/api

# MySQL
MYSQL_USER=kreditozrouti
MYSQL_PASSWORD=<strong-password>
MYSQL_ROOT_PASSWORD=<strong-root-password>
MYSQL_URI=mysql://<user>:<password>@mysql:3306/kreditozrouti

# Redis
REDIS_URI=redis://redis:6379
REDIS_PASSWORD=<redis-password>

# Sentry/GlitchTip (optional)
SENTRY_DSN=<glitchtip-dsn>
SENTRY_RELEASE=v1.0.0

# Email (optional)
GOOGLE_USER=<gmail-address>
GOOGLE_APP_PASSWORD=<app-password>
```

**Traefik-specific:**

```env
CLOUDFLARE_DNS_API_TOKEN=<cloudflare-api-token>
CLOUDFLARE_EMAIL=<cloudflare-email>
ACME_EMAIL=<letsencrypt-email>
```

**GlitchTip-specific (optional):**

```env
GLITCHTIP_DOMAIN=glitchtip.example.com
SECRET_KEY=<django-secret-key>
POSTGRES_PASSWORD=<postgres-password>
DEFAULT_FROM_EMAIL=noreply@example.com
EMAIL_URL=consolemail://  # or smtp://user:pass@host:port
GLITCHTIP_MAX_EVENT_LIFE_DAYS=90
```

### Environment Variable Generation

**Generate random secrets:**

```bash
# API_SESSION_SECRET
openssl rand -hex 32

# API_COMMAND_TOKEN
openssl rand -hex 24

# Django SECRET_KEY (for GlitchTip)
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

---

## Networking

### Network Architecture

**Production Networks:**

```
traefik-network (external)
├── traefik
├── api
├── client
└── phpmyadmin

mysql-network (internal)
├── api
└── mysql

redis-network (internal)
├── api
├── scraper
└── redis
```

**Key Principles:**
- **External network**: Only Traefik-exposed services
- **Internal networks**: Isolated by concern (database, cache)
- **No direct external access** to MySQL or Redis

### Network Configuration

**Location:** `deployment/{environment}/networks.yml`

**Production Example:**

```yaml
networks:
  traefik-network:
    external: true
  mysql-network:
    driver: bridge
    internal: false
  redis-network:
    driver: bridge
    internal: false
```

**Creation:** Handled by `deploy.sh` script

```bash
docker network create traefik-network
docker network create mysql-network
docker network create redis-network
```

---

### Traefik Routing

**Client (Root Path):**

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.client.rule=Host(`${DOMAIN}`)"
  - "traefik.http.routers.client.entrypoints=websecure"
  - "traefik.http.routers.client.tls.certresolver=cloudflare"
  - "traefik.http.routers.client.priority=10"
```

**API (/api prefix):**

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.api.rule=Host(`${DOMAIN}`) && PathPrefix(`/api`)"
  - "traefik.http.routers.api.entrypoints=websecure"
  - "traefik.http.routers.api.tls.certresolver=cloudflare"
  - "traefik.http.routers.api.priority=100"
  - "traefik.http.middlewares.api-stripprefix.stripprefix.prefixes=/api"
  - "traefik.http.routers.api.middlewares=api-stripprefix"
```

**phpMyAdmin (/phpmyadmin prefix):**

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.phpmyadmin.rule=Host(`${DOMAIN}`) && PathPrefix(`/phpmyadmin`)"
  - "traefik.http.routers.phpmyadmin.entrypoints=websecure"
  - "traefik.http.routers.phpmyadmin.tls.certresolver=cloudflare"
  - "traefik.http.routers.phpmyadmin.priority=80"
  - "traefik.http.middlewares.phpmyadmin-stripprefix.stripprefix.prefixes=/phpmyadmin"
  - "traefik.http.routers.phpmyadmin.middlewares=phpmyadmin-stripprefix"
```

**Priority Rules:**
- Higher priority = matches first
- API (100) > phpMyAdmin (80) > Client (10)

---

## Storage & Volumes

### Volume Types

**Named Volumes:**
- Managed by Docker
- Persistent across container recreations
- Easy to backup

**Host Mounts:**
- Direct filesystem access
- Useful for configuration files

### Production Volumes

**Location:** `deployment/production/volumes.yml`

```yaml
volumes:
  mysql-data-volume:
    driver: local
  traefik-certificates-volume:
    driver: local
  traefik-logs-volume:
    driver: local
```

**Volume Purposes:**

| Volume | Service | Data |
|--------|---------|------|
| `mysql-data-volume` | MySQL | Database files |
| `traefik-certificates-volume` | Traefik | TLS certificates (acme.json) |
| `traefik-logs-volume` | Traefik | Access logs |

### Volume Management

**Creation:**

```bash
docker volume create mysql-data-volume
docker volume create traefik-certificates-volume
docker volume create traefik-logs-volume
```

**List volumes:**

```bash
docker volume ls
```

**Inspect volume:**

```bash
docker volume inspect mysql-data-volume
```

**Backup volume:**

```bash
docker run --rm \
  -v mysql-data-volume:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/mysql-backup.tar.gz /data
```

**Restore volume:**

```bash
docker run --rm \
  -v mysql-data-volume:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/mysql-backup.tar.gz -C /
```

---

## CI/CD Pipeline

### GitHub Actions Workflows

**Location:** `.github/workflows/`

#### 1. Verify Workflow

**File:** `verify.yml`

**Trigger:** Pull requests (opened, synchronize, reopened)

**Purpose:** Code quality checks before merge

**Steps:**
1. Checkout code
2. Setup Node.js 24 and pnpm 10
3. Install dependencies (`make install`)
4. Lint code (`make lint`)
5. Build all services (`make build`)

**Runs on:** Self-hosted runner

---

#### 2. Production Deployment

**File:** `deploy-production.yml`

**Trigger:**
- Git tags matching `v*.*.*` (e.g., `v1.0.0`, `v2.3.1`)
- Manual workflow dispatch with `skip-build` option

**Jobs:**

**A. Build Job** (if `!skip_build`):

```yaml
- name: Build and push API image
  uses: docker/build-push-action@v5
  with:
    context: .
    file: ./api/Dockerfile
    push: true
    tags: |
      ghcr.io/${{ github.repository }}/api:${{ steps.meta.outputs.version }}
      ghcr.io/${{ github.repository }}/api:latest
    cache-from: type=gha,scope=api
    cache-to: type=gha,mode=max,scope=api
```

- Builds API, Client, Scraper images
- Pushes to GHCR with version tag and `latest`
- Uses GitHub Actions cache for layer caching

**B. Deploy Job:**

```yaml
- name: Upload deployment files
  run: |
    scp -r deployment/production/* ${{ secrets.SSH_USER }}@${{ secrets.SSH_HOST }}:~/versions/production/${{ steps.meta.outputs.version }}/

- name: Deploy stack
  run: |
    ssh ${{ secrets.SSH_USER }}@${{ secrets.SSH_HOST }} \
      "cd ~/versions/production/${{ steps.meta.outputs.version }} && \
       ./deploy.sh prod production"
```

- Creates version directory: `~/versions/production/v1.0.0/`
- Uploads deployment files via SCP
- Executes `deploy.sh` on remote server
- Updates `current` symlink

---

#### 3. Development Deployment

**File:** `deploy-development.yml`

**Trigger:**
- Git tags matching `dev-*.*.*` (e.g., `dev-1.0.0`)
- Manual workflow dispatch

**Similar to production but:**
- Images tagged `dev-${TAG}` and `dev-latest`
- Deploys to `~/versions/development/`
- Uses `.env.dev` environment file

---

### Required GitHub Secrets

Configure in repository settings: Settings → Secrets and variables → Actions

| Secret | Description | Example |
|--------|-------------|---------|
| `SSH_HOST` | VPS hostname or IP | `192.168.1.100` or `vps.example.com` |
| `SSH_USER` | SSH username | `deploy` |
| `SSH_PORT` | SSH port | `22` |
| `SSH_PRIVATE_KEY` | SSH private key | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `GITHUB_TOKEN` | GHCR auth (auto-provided) | N/A |

**SSH Key Generation:**

```bash
# Generate key pair
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions

# Copy public key to server
ssh-copy-id -i ~/.ssh/github_actions.pub user@host

# Add private key to GitHub Secrets
cat ~/.ssh/github_actions
```

---

## Deployment Scripts

### Main Deployment Script

**Location:** `deployment/deploy.sh`

**Usage:**

```bash
./deploy.sh <project_name> <environment>

# Examples:
./deploy.sh prod production
./deploy.sh dev development
```

**Prerequisites:**
- `.env` file with environment variables
- `.images` file with registry info
- Docker Compose files in `${environment}/` directory

**Process:**

```bash
#!/bin/bash

# 1. Validate environment variables
if [ -z "$IMAGE_REGISTRY" ] || [ -z "$IMAGE_PREFIX" ] || [ -z "$IMAGE_TAG" ]; then
  echo "Error: Missing image variables"
  exit 1
fi

# 2. Create networks
cat ${environment}/networks.yml | grep -A 1 "networks:" | tail -n +2 | while read network; do
  docker network create $network 2>/dev/null || true
done

# 3. Create volumes
cat ${environment}/volumes.yml | grep -A 1 "volumes:" | tail -n +2 | while read volume; do
  docker volume create $volume 2>/dev/null || true
done

# 4. Deploy stack
docker compose \
  -p $PROJECT_NAME \
  -f ${environment}/docker-compose.${environment}.yml \
  --env-file .env \
  pull

docker compose \
  -p $PROJECT_NAME \
  -f ${environment}/docker-compose.${environment}.yml \
  --env-file .env \
  up --remove-orphans -d
```

**Outputs:**
- Network creation status
- Volume creation status
- Container deployment status

---

### Traefik Deployment Script

**Location:** `scripts/traefik.sh`

**Usage:**

```bash
./traefik.sh \
  -p ~/deployment \
  -d traefik.example.com \
  -c ~/.htpasswd \
  --cf-email user@example.com \
  --cf-token abc123xyz
```

**Parameters:**

| Flag | Description | Required |
|------|-------------|----------|
| `-p, --path` | Path to deployment directory | Yes |
| `-d, --domain` | Traefik dashboard domain | Yes |
| `-c, --credentials` | htpasswd file for basic auth | Yes |
| `--cf-email` | Cloudflare email | Yes |
| `--cf-token` | Cloudflare API token | Yes |

**Prerequisites:**
- Cloudflare API token with `Zone:DNS:Edit` permissions
- htpasswd credentials file

**Generate htpasswd:**

```bash
htpasswd -c ~/.htpasswd admin
# Enter password when prompted
```

**Process:**

1. Validates all parameters
2. Creates `traefik-network` if not exists
3. Creates persistent volumes
4. Generates `.env` with Cloudflare credentials
5. Deploys Traefik via Docker Compose
6. Provides dashboard URL and monitoring commands

**Output:**

```
Traefik deployed successfully!

Dashboard: https://traefik.example.com
Username: (from htpasswd file)

Monitor logs:
  docker logs -f traefik

Check health:
  curl -I http://localhost:8080/ping
```

---

### Maintenance Script

**Location:** `scripts/maintenance.sh`

**Usage:**

```bash
sudo ./maintenance.sh [OPTIONS]
```

**Options:**

| Flag | Description |
|------|-------------|
| `-r, --auto-reboot` | Auto-reboot if system requires restart |
| `-s, --skip-security` | Skip Lynis security audit |
| `-d, --docker-cleanup` | Clean Docker resources |
| `-q, --quiet` | Minimal output |

**Tasks:**

1. **System Updates**
   - Update APT package lists
   - Install security updates
   - Upgrade all packages

2. **Log Cleanup**
   - Retain logs for last 7 days
   - Clear old systemd journal entries

3. **Temporary File Cleanup**
   - Remove files older than 7 days from `/tmp`

4. **Docker Cleanup** (if `-d` flag)
   - Stop and remove unused containers
   - Remove dangling images
   - Remove unused volumes
   - Remove unused networks
   - Prune build cache

5. **Security Audit** (via Lynis)
   - System hardening scan
   - Security recommendations

6. **Health Checks**
   - Failed systemd services
   - Disk usage > 80%
   - Memory usage > 90%
   - Load average > CPU count
   - Zombie processes

7. **Reboot Handling**
   - Check if reboot required
   - Auto-reboot if `-r` flag

**Schedule with Cron:**

```bash
# Weekly maintenance on Sunday at 2 AM
0 2 * * 0 /root/scripts/maintenance.sh -r -d >> /var/log/maintenance.log 2>&1
```

---

## Traefik Reverse Proxy

### Configuration

**Location:** `deployment/traefik/traefik.yml`

**Features:**
- Automatic HTTPS via Let's Encrypt
- Cloudflare DNS-01 challenge
- HTTP to HTTPS redirect
- Docker provider for service discovery
- Dashboard with basic auth

**Configuration:**

```yaml
api:
  dashboard: true
  insecure: false

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https

  websecure:
    address: ":443"
    http:
      tls:
        certResolver: cloudflare

  traefik:
    address: ":8080"

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: traefik-network

certificatesResolvers:
  cloudflare:
    acme:
      email: ${ACME_EMAIL}
      storage: /certs/acme.json
      dnsChallenge:
        provider: cloudflare
        resolvers:
          - "1.1.1.1:53"
          - "8.8.8.8:53"
```

### Docker Compose

**Location:** `deployment/traefik/docker-compose.traefik.yml`

```yaml
services:
  traefik:
    image: traefik:v3.6.7
    container_name: traefik
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    networks:
      - traefik-network
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"
    environment:
      CLOUDFLARE_EMAIL: ${CLOUDFLARE_EMAIL}
      CLOUDFLARE_DNS_API_TOKEN: ${CLOUDFLARE_DNS_API_TOKEN}
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik-certificates-volume:/certs
      - ./traefik.yml:/traefik.yml:ro
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dashboard.rule=Host(`${TRAEFIK_DOMAIN}`)"
      - "traefik.http.routers.dashboard.entrypoints=websecure"
      - "traefik.http.routers.dashboard.service=api@internal"
      - "traefik.http.routers.dashboard.middlewares=auth"
      - "traefik.http.middlewares.auth.basicauth.usersfile=/etc/traefik/.htpasswd"
```

### Dashboard Access

**URL:** `https://traefik.example.com`

**Authentication:** Basic auth with htpasswd

**View Services:**
- HTTP Routers
- Services
- Middlewares
- TLS Certificates

**Health Check:**

```bash
curl -I http://localhost:8080/ping
# Expected: HTTP/1.1 200 OK
```

---

## Error Tracking (GlitchTip)

### Overview

GlitchTip is a self-hosted, open-source error tracking system compatible with Sentry SDKs.

**Benefits:**
- Self-hosted (data privacy)
- No usage limits
- Sentry SDK compatible
- Performance monitoring
- Issue tracking

### Stack Components

**Services:**

| Service | Image | Purpose |
|---------|-------|---------|
| web | glitchtip/glitchtip | Web UI and API |
| worker | glitchtip/glitchtip | Background jobs (Celery + Beat) |
| migrate | glitchtip/glitchtip | Database migrations (one-shot) |
| postgres | postgres:16-alpine | Database |
| valkey | valkey/valkey:8-alpine | Redis-compatible cache |

### Configuration

**Location:** `deployment/glitchtip/docker-compose.glitchtip.yml`

**Environment Variables:**

```env
GLITCHTIP_DOMAIN=glitchtip.example.com
SECRET_KEY=<django-secret-key>
POSTGRES_PASSWORD=<postgres-password>
DATABASE_URL=postgres://postgres:${POSTGRES_PASSWORD}@postgres:5432/glitchtip
REDIS_URL=redis://valkey:6379/0
DEFAULT_FROM_EMAIL=noreply@example.com
EMAIL_URL=consolemail://  # or smtp://user:pass@host:port
GLITCHTIP_MAX_EVENT_LIFE_DAYS=90
```

### Deployment

```bash
cd deployment/glitchtip
docker compose -p glitchtip --env-file .env up -d
```

### Initial Setup

1. **Access web UI:** `https://glitchtip.example.com`
2. **Create admin account** on first visit
3. **Create organization** (e.g., "Kreditozrouti")
4. **Create project** (e.g., "API", "Client", "Scraper")
5. **Copy DSN** from project settings

**DSN Format:**

```
https://<key>@glitchtip.example.com/<project-id>
```

### Integration

**API (.env):**

```env
SENTRY_DSN=https://<key>@glitchtip.example.com/1
SENTRY_RELEASE=v1.0.0
```

**Client (docker-compose):**

```yaml
environment:
  VITE_SENTRY_DSN: https://<key>@glitchtip.example.com/2
  VITE_SENTRY_RELEASE: v1.0.0
```

**Scraper (.env):**

```env
SENTRY_DSN=https://<key>@glitchtip.example.com/3
SENTRY_RELEASE=v1.0.0
```

---

## Production Deployment

### Prerequisites

1. **VPS Setup:**
   - Ubuntu 22.04+ or Debian 12+
   - Docker and Docker Compose installed
   - SSH access configured
   - Firewall configured (ports 80, 443, 22)

2. **Domain Configuration:**
   - DNS managed by Cloudflare
   - A records pointing to VPS IP

3. **Cloudflare API Token:**
   - Permissions: `Zone:DNS:Edit`
   - Token scope: Specific zone

4. **GitHub Setup:**
   - Repository with CI/CD workflows
   - GitHub Container Registry enabled
   - Secrets configured

### Step-by-Step Deployment

#### 1. Server Preparation

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

#### 2. Create Directory Structure

```bash
mkdir -p ~/versions/production
mkdir -p ~/versions/development
mkdir -p ~/variables
mkdir -p ~/deployment/traefik
```

#### 3. Configure Environment Variables

```bash
# Copy template
cp .env.example ~/variables/.env.prod

# Edit with production values
nano ~/variables/.env.prod
```

**Key values to set:**
- `DOMAIN` - Your production domain
- `API_SESSION_SECRET` - Random secret
- `API_COMMAND_TOKEN` - Random token
- `MYSQL_PASSWORD` - Strong password
- `REDIS_PASSWORD` - Strong password
- `SENTRY_DSN` - GlitchTip DSN (optional)

#### 4. Deploy Traefik

```bash
cd ~/deployment
./scripts/traefik.sh \
  -p ~/deployment \
  -d traefik.example.com \
  -c ~/.htpasswd \
  --cf-email your-email@example.com \
  --cf-token your-cloudflare-token
```

**Verify:**

```bash
docker ps | grep traefik
curl -I http://localhost:8080/ping
```

#### 5. Deploy Application Stack

**A. Via CI/CD (Recommended):**

```bash
# Create and push tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# GitHub Actions will:
# 1. Build images
# 2. Push to GHCR
# 3. Deploy to VPS
# 4. Update current symlink
```

**B. Manual Deployment:**

```bash
# On VPS
cd ~/versions/production
mkdir v1.0.0
cd v1.0.0

# Upload deployment files
scp -r deployment/production/* user@host:~/versions/production/v1.0.0/

# Copy environment file
cp ~/variables/.env.prod .env

# Create .images file
cat > .images << EOF
IMAGE_REGISTRY=ghcr.io
IMAGE_PREFIX=your-org/kreditozrouti
IMAGE_TAG=v1.0.0
EOF

# Deploy
./deploy.sh prod production

# Update current symlink
ln -sfn ~/versions/production/v1.0.0 ~/versions/production/current
```

#### 6. Verify Deployment

```bash
# Check running containers
docker ps

# Check logs
docker compose -p prod logs -f

# Test endpoints
curl -I https://example.com
curl https://example.com/api/health

# Check Traefik dashboard
https://traefik.example.com
```

### Production Scaling

**Adjust Replicas:**

Edit `deployment/production/docker-compose.production.yml`:

```yaml
services:
  api:
    deploy:
      replicas: 4  # Increase from 2

  client:
    deploy:
      replicas: 5  # Increase from 3

  scraper:
    deploy:
      replicas: 10  # Increase from 5
```

**Redeploy:**

```bash
docker compose -p prod up -d
```

---

## Development Deployment

### Purpose

Development environment on VPS for testing before production.

### Differences from Production

| Aspect | Production | Development |
|--------|------------|-------------|
| **Environment** | `.env.prod` | `.env.dev` |
| **Domain** | `example.com` | `dev.example.com` |
| **Tag Prefix** | `v*.*.*` | `dev-*.*.*` |
| **Replicas** | API: 2, Client: 3, Scraper: 5 | API: 2, Client: 2, Scraper: 3 |
| **Resources** | Higher limits | Lower limits |
| **Networks** | `mysql-network` | `mysql-dev-network` |
| **Project Name** | `prod` | `dev` |

### Deployment Process

**1. Configure Environment:**

```bash
# Create development environment file
cp ~/variables/.env.prod ~/variables/.env.dev

# Edit for development
nano ~/variables/.env.dev

# Key changes:
# - DOMAIN=dev.example.com
# - Different database credentials
# - Different Redis password
```

**2. Deploy via CI/CD:**

```bash
# Create and push development tag
git tag -a dev-1.0.0 -m "Dev release 1.0.0"
git push origin dev-1.0.0
```

**3. Verify:**

```bash
docker compose -p dev ps
curl https://dev.example.com/api/health
```

### Development Workflow

```
1. Develop locally (make dev)
2. Push to branch
3. Create pull request
4. CI/CD runs verify workflow
5. Merge to main
6. Tag with dev-*.*.*
7. Auto-deploy to dev environment
8. Test on dev.example.com
9. Tag with v*.*.* for production
10. Auto-deploy to production
```

---

## Local Development

### Docker Infrastructure

**File:** `docker-compose.local.yml`

**Services:**
- MySQL 8.4
- Redis 7-alpine
- phpMyAdmin

**Start:**

```bash
make run-local-docker
```

**Services:**
- MySQL: `localhost:43306`
- phpMyAdmin: `http://localhost:43307`
- Redis: `localhost:46379`

### Development Workflow

**1. Install Dependencies:**

```bash
make install
```

**2. Start Infrastructure:**

```bash
make run-local-docker
```

**3. Run Services:**

```bash
# All services in parallel
make dev

# Individual services
make dev-api      # API on port 40080
make dev-client   # Client on port 45173
make dev-scraper  # Scraper (background)
```

**4. Access Application:**

- Client: `http://localhost:45173`
- API: `http://localhost:40080`
- phpMyAdmin: `http://localhost:43307`

### Local Testing

**Build Docker Images:**

```bash
make build-docker-images
```

**Test Built Images:**

```bash
# Run API image
docker run -p 40080:80 --env-file .env kreditozrouti-api

# Run Client image
docker run -p 45173:80 kreditozrouti-client

# Run Scraper image
docker run --env-file .env kreditozrouti-scraper
```

---

## Monitoring & Logging

### Container Logging

**Log Configuration:**

```yaml
logging:
  driver: json-file
  options:
    max-size: "10m"
    max-file: "3"
```

**View Logs:**

```bash
# All containers
docker compose -p prod logs -f

# Specific service
docker compose -p prod logs -f api

# Last 100 lines
docker compose -p prod logs --tail=100 api

# Follow with timestamps
docker compose -p prod logs -f -t api
```

### Traefik Access Logs

**Location:** `/var/log/traefik/access.log` (in volume)

**View:**

```bash
docker exec traefik cat /var/log/traefik/access.log
```

**Filter 4xx/5xx:**

```bash
docker exec traefik cat /var/log/traefik/access.log | grep -E "\" [45][0-9]{2} "
```

### Application Logs

**API Logs:**

```bash
docker compose -p prod logs -f api | grep -E "(ERROR|WARN)"
```

**Scraper Logs:**

```bash
docker compose -p prod logs -f scraper | grep -E "job_id"
```

### Health Checks

**API Health:**

```bash
curl https://example.com/api/health
# Expected: HTTP 200 "OK"
```

**Traefik Health:**

```bash
curl -I http://localhost:8080/ping
# Expected: HTTP/1.1 200 OK
```

**MySQL Health:**

```bash
docker exec -it prod-mysql-1 mysqladmin ping -h localhost -u root -p
# Expected: mysqld is alive
```

**Redis Health:**

```bash
docker exec -it prod-redis-1 redis-cli ping
# Expected: PONG
```

### Resource Monitoring

**Container Stats:**

```bash
docker stats
```

**System Resources:**

```bash
# CPU, memory, disk
htop

# Disk usage
df -h

# Specific container resources
docker inspect prod-api-1 | grep -A 10 Resources
```

### Alert Setup (Optional)

**Email Alerts via Healthchecks.io:**

```yaml
services:
  api:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

**Uptime Monitoring:**
- UptimeRobot
- Pingdom
- StatusCake

---

## Security

### Network Security

**Firewall (UFW):**

```bash
# Enable firewall
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Deny all other incoming
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Check status
sudo ufw status verbose
```

### TLS/SSL

**Certificate Management:**
- Automatic via Let's Encrypt
- DNS-01 challenge via Cloudflare
- 90-day certificates with auto-renewal

**Verify Certificate:**

```bash
openssl s_client -connect example.com:443 -servername example.com
```

**Certificate Location:**

```
/certs/acme.json (in traefik-certificates-volume)
```

### Environment Variable Security

**Best Practices:**
- Never commit `.env` files to repository
- Use strong passwords (32+ characters)
- Rotate secrets regularly
- Restrict file permissions: `chmod 600 .env`

**Generate Strong Passwords:**

```bash
openssl rand -base64 32
```

### Container Security

**Read-only Root Filesystem:**

```yaml
services:
  api:
    read_only: true
    tmpfs:
      - /tmp
```

**No New Privileges:**

```yaml
security_opt:
  - no-new-privileges:true
```

**Drop Capabilities:**

```yaml
cap_drop:
  - ALL
cap_add:
  - NET_BIND_SERVICE
```

### Database Security

**MySQL:**
- Use non-root user for application
- Strong passwords
- Network isolation
- Regular backups

**Access Control:**

```sql
-- Create app user
CREATE USER 'kreditozrouti'@'%' IDENTIFIED BY 'strong-password';
GRANT ALL PRIVILEGES ON kreditozrouti.* TO 'kreditozrouti'@'%';
FLUSH PRIVILEGES;
```

---

## Backup & Recovery

### Backup Strategy

**Daily Backups:**
- MySQL database
- Traefik certificates
- Environment files

**Weekly Backups:**
- Full server filesystem
- Docker volumes

### MySQL Backup

**Manual Backup:**

```bash
docker exec prod-mysql-1 mysqldump \
  -u root -p${MYSQL_ROOT_PASSWORD} \
  kreditozrouti > backup-$(date +%Y%m%d).sql
```

**Automated Daily Backup:**

```bash
#!/bin/bash
# /root/scripts/mysql-backup.sh

BACKUP_DIR="/backups/mysql"
RETENTION_DAYS=30

mkdir -p $BACKUP_DIR

# Backup
docker exec prod-mysql-1 mysqldump \
  -u root -p${MYSQL_ROOT_PASSWORD} \
  kreditozrouti | gzip > $BACKUP_DIR/kreditozrouti-$(date +%Y%m%d).sql.gz

# Delete old backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
```

**Schedule with Cron:**

```bash
0 2 * * * /root/scripts/mysql-backup.sh >> /var/log/mysql-backup.log 2>&1
```

### MySQL Restore

```bash
# Restore from backup
gunzip < backup-20240131.sql.gz | \
  docker exec -i prod-mysql-1 mysql \
    -u root -p${MYSQL_ROOT_PASSWORD} \
    kreditozrouti
```

### Volume Backup

**Backup All Volumes:**

```bash
#!/bin/bash
# /root/scripts/volume-backup.sh

BACKUP_DIR="/backups/volumes"
mkdir -p $BACKUP_DIR

for volume in mysql-data-volume traefik-certificates-volume; do
  docker run --rm \
    -v $volume:/data \
    -v $BACKUP_DIR:/backup \
    alpine tar czf /backup/$volume-$(date +%Y%m%d).tar.gz /data
done
```

### Disaster Recovery

**Complete System Restore:**

1. **Provision new VPS**
2. **Install Docker and Docker Compose**
3. **Restore environment files**
4. **Deploy Traefik**
5. **Restore MySQL data**
6. **Restore Traefik certificates**
7. **Deploy application stack**

**Estimated RTO (Recovery Time Objective):** 2-4 hours

**Estimated RPO (Recovery Point Objective):** 24 hours (with daily backups)

---

## Maintenance

### Routine Maintenance Tasks

**Weekly:**
- Review logs for errors
- Check disk usage
- Monitor container health
- Review GlitchTip errors

**Monthly:**
- System updates (`maintenance.sh`)
- Docker resource cleanup
- Security audit (Lynis)
- Backup verification

**Quarterly:**
- Rotate secrets
- Review access logs
- Update dependencies
- Capacity planning

### System Updates

```bash
# Run maintenance script
sudo ./scripts/maintenance.sh -r -d

# Manual updates
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get dist-upgrade -y
sudo apt-get autoremove -y
```

### Docker Cleanup

**Remove Unused Resources:**

```bash
# Stop unused containers
docker container prune -f

# Remove dangling images
docker image prune -f

# Remove unused volumes
docker volume prune -f

# Remove unused networks
docker network prune -f

# Clean build cache
docker builder prune -f
```

**Aggressive Cleanup:**

```bash
# Remove all stopped containers, unused images, and volumes
docker system prune -a --volumes -f
```

### Log Rotation

**Systemd Journal:**

```bash
# Retain logs for 7 days
sudo journalctl --vacuum-time=7d

# Limit log size to 1GB
sudo journalctl --vacuum-size=1G
```

**Docker Logs:**

Configured via `logging.options` in docker-compose (already set).

---

## Troubleshooting

### Common Issues

#### Containers Not Starting

**Check logs:**

```bash
docker compose -p prod logs api
```

**Common causes:**
- Missing environment variables
- Port conflicts
- Network issues
- Volume permission errors

**Solution:**

```bash
# Validate environment
cat .env

# Check ports
sudo netstat -tulpn | grep -E ":(80|443|3306|6379)"

# Recreate container
docker compose -p prod up -d --force-recreate api
```

---

#### TLS Certificate Issues

**Symptoms:**
- HTTPS not working
- Certificate errors

**Check Traefik logs:**

```bash
docker logs traefik | grep -i error
```

**Common causes:**
- Cloudflare API token expired/invalid
- DNS not propagated
- Rate limit (Let's Encrypt)

**Solution:**

```bash
# Verify Cloudflare token
curl -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer $CLOUDFLARE_DNS_API_TOKEN"

# Delete acme.json and retry
docker compose -p traefik down
docker volume rm traefik-certificates-volume
docker volume create traefik-certificates-volume
docker compose -p traefik up -d
```

---

#### Database Connection Errors

**Symptoms:**
- API can't connect to MySQL
- "Connection refused" errors

**Check MySQL health:**

```bash
docker exec -it prod-mysql-1 mysqladmin ping -u root -p
```

**Check network:**

```bash
docker network inspect mysql-network
```

**Common causes:**
- MySQL not ready
- Network misconfiguration
- Wrong credentials

**Solution:**

```bash
# Restart MySQL
docker compose -p prod restart mysql

# Wait for health check
docker compose -p prod ps mysql

# Check API can reach MySQL
docker exec -it prod-api-1 ping mysql
```

---

#### Redis Connection Errors

**Symptoms:**
- Jobs not processing
- API errors related to Redis

**Check Redis:**

```bash
docker exec -it prod-redis-1 redis-cli ping
```

**Check connection from API:**

```bash
docker exec -it prod-api-1 sh
nc -zv redis 6379
```

**Solution:**

```bash
# Restart Redis
docker compose -p prod restart redis

# Clear Redis database
docker exec -it prod-redis-1 redis-cli FLUSHDB
```

---

#### Disk Space Issues

**Symptoms:**
- Deployment fails
- Containers crash

**Check disk usage:**

```bash
df -h
docker system df
```

**Clean up:**

```bash
# Remove old images
docker image prune -a -f

# Remove old logs
sudo journalctl --vacuum-time=3d

# Clean build cache
docker builder prune -f
```

---

#### High Memory Usage

**Check resource usage:**

```bash
docker stats
```

**Common causes:**
- Too many replicas
- Memory leaks
- Insufficient swap

**Solution:**

```bash
# Reduce replicas
# Edit docker-compose.*.yml
services:
  scraper:
    deploy:
      replicas: 3  # Reduce from 5

# Restart with new config
docker compose -p prod up -d
```

---

#### Rollback Deployment

**Quick rollback:**

```bash
# Point to previous version
ln -sfn ~/versions/production/v1.0.0 ~/versions/production/current

# Redeploy
cd ~/versions/production/current
docker compose -p prod up -d
```

---

### Debug Mode

**Enable debug logging:**

```bash
# Edit .env
LOG_LEVEL=debug

# Restart services
docker compose -p prod restart api scraper
```

**View debug logs:**

```bash
docker compose -p prod logs -f api | grep DEBUG
```

---

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Cloudflare API Documentation](https://developers.cloudflare.com/api/)
- [GlitchTip Documentation](https://glitchtip.com/documentation)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

## Summary

This deployment architecture provides:

- **Production-Grade Infrastructure**: Multi-service Docker orchestration with Traefik reverse proxy
- **Automated CI/CD**: GitHub Actions workflows for building and deploying
- **Zero-Downtime Deployments**: Version directories with symlink swapping
- **Comprehensive Monitoring**: Logs, health checks, and error tracking
- **Security Best Practices**: TLS, network isolation, secret management
- **Disaster Recovery**: Backup strategies and rollback capabilities
- **Scalability**: Container replicas and resource limits
- **Maintainability**: Automated scripts and clear documentation

The infrastructure supports rapid development iteration, staging environments for testing, and stable production deployments with operational excellence.
