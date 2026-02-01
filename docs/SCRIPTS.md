# Scripts Documentation

Comprehensive documentation for all automation and utility scripts in the Kreditozrouti project.

## Table of Contents

- [Overview](#overview)
- [Script Categories](#script-categories)
- [Installation Scripts](#installation-scripts)
- [Deployment Scripts](#deployment-scripts)
- [Maintenance Scripts](#maintenance-scripts)
- [Common Patterns](#common-patterns)
- [Scheduling & Automation](#scheduling--automation)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

The `/scripts` directory contains automation scripts for infrastructure setup, service deployment, and system maintenance. All scripts follow consistent patterns for logging, error handling, and parameter validation.

**Script Categories:**

| Category | Scripts | Purpose |
|----------|---------|---------|
| **Infrastructure Setup** | install-docker.sh | Initial system configuration |
| **Deployment** | traefik.sh, glitchtip.sh, github-runner.sh | Deploy services via Docker Compose |
| **Maintenance** | maintenance.sh, docker-cleanup.sh | System and Docker resource management |

**Common Features:**
- Colored, timestamped output
- Comprehensive error handling
- Parameter validation
- Help documentation
- Dry-run modes (where applicable)
- Detailed logging

---

## Script Categories

### Infrastructure Setup Scripts

**Purpose:** Initial server configuration and software installation

| Script | Function | When to Use |
|--------|----------|-------------|
| install-docker.sh | Install Docker Engine | New VPS setup, fresh Ubuntu/Debian installation |

### Deployment Scripts

**Purpose:** Deploy and configure containerized services

| Script | Function | When to Use |
|--------|----------|-------------|
| traefik.sh | Deploy Traefik reverse proxy | First deployment, proxy setup |
| glitchtip.sh | Deploy error tracking | Optional error monitoring |
| github-runner.sh | Deploy CI/CD runners | Self-hosted Actions setup |

### Maintenance Scripts

**Purpose:** Routine system and Docker maintenance

| Script | Function | When to Use |
|--------|----------|-------------|
| maintenance.sh | System-wide maintenance | Weekly/monthly (via cron) |
| docker-cleanup.sh | Clean Docker resources | When disk space is low |

---

## Installation Scripts

### install-docker.sh

**Purpose:** Automated Docker Engine installation on Ubuntu/Debian systems.

#### Overview

Removes conflicting packages, adds official Docker repository, installs Docker Engine with plugins, and configures user permissions.

#### Requirements

- **Operating System:** Ubuntu 20.04+ or Debian 11+
- **Privileges:** Must run as root (sudo)
- **Network:** Internet connection required

#### Usage

```bash
sudo ./install-docker.sh [OPTIONS]
```

#### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-u, --user <username>` | Add user to docker group | None |
| `-s, --skip-test` | Skip verification test | Runs test |
| `-h, --help` | Show help message | N/A |

#### Examples

**Basic Installation:**

```bash
sudo ./install-docker.sh
```

**Install and Add User:**

```bash
sudo ./install-docker.sh --user deploy
```

**Install Without Test:**

```bash
sudo ./install-docker.sh --skip-test
```

#### What It Does

1. **Validation:**
   - Checks for root privileges
   - Detects Ubuntu/Debian version
   - Validates minimum OS version

2. **Cleanup:**
   - Removes conflicting packages:
     - docker.io
     - docker-doc
     - docker-compose
     - podman-docker
     - containerd
     - runc

3. **Installation:**
   - Adds Docker GPG key
   - Sets up official Docker repository
   - Installs packages:
     - docker-ce
     - docker-ce-cli
     - containerd.io
     - docker-buildx-plugin
     - docker-compose-plugin

4. **Configuration:**
   - Adds user to docker group (if specified)
   - Enables docker service
   - Starts docker service

5. **Verification:**
   - Runs `docker run hello-world`
   - Displays installation status

#### Post-Installation

**Log out and back in** for group changes to take effect:

```bash
exit
# SSH back in
docker ps  # Should work without sudo
```

**Verify Installation:**

```bash
docker --version
docker compose version
docker ps
```

#### Troubleshooting

**Permission Denied:**

```bash
# If docker commands require sudo after group add:
sudo usermod -aG docker $USER
newgrp docker  # Or log out and back in
```

**Service Not Starting:**

```bash
sudo systemctl status docker
sudo systemctl start docker
sudo journalctl -u docker
```

---

## Deployment Scripts

### traefik.sh

**Purpose:** Deploy Traefik reverse proxy with automatic HTTPS via Let's Encrypt and Cloudflare DNS-01 challenge.

#### Overview

Sets up Traefik with automatic TLS certificate management, dashboard authentication, and Docker provider integration.

#### Requirements

- Docker and Docker Compose installed
- Cloudflare account with domain
- Cloudflare API token with Zone:DNS:Edit permissions
- htpasswd credentials file

#### Usage

```bash
./traefik.sh [OPTIONS]
```

#### Required Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `-p, --path <path>` | Deployment directory | `~/deployment` |
| `-d, --domain <domain>` | Traefik dashboard domain | `traefik.example.com` |
| `-c, --credentials <path>` | htpasswd file path | `~/.htpasswd` |
| `--cf-email <email>` | Cloudflare account email | `user@example.com` |
| `--cf-token <token>` | Cloudflare API token | `abc123xyz...` |

#### Optional Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `-e, --email <email>` | Let's Encrypt notification email | Cloudflare email |
| `-h, --help` | Show help message | N/A |

#### Examples

**Basic Deployment:**

```bash
./traefik.sh \
  -p ~/deployment \
  -d traefik.example.com \
  -c ~/.htpasswd \
  --cf-email user@example.com \
  --cf-token abc123xyz
```

**With Custom ACME Email:**

```bash
./traefik.sh \
  -p ~/deployment \
  -d traefik.example.com \
  -c ~/.htpasswd \
  --cf-email user@example.com \
  --cf-token abc123xyz \
  -e acme@example.com
```

#### Prerequisites

**1. Generate htpasswd Credentials:**

```bash
# Install htpasswd (if not available)
sudo apt-get install apache2-utils

# Generate credentials file
htpasswd -c ~/.htpasswd admin
# Enter password when prompted
```

**2. Create Cloudflare API Token:**

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use "Edit zone DNS" template
4. Permissions: `Zone → DNS → Edit`
5. Zone Resources: `Include → Specific zone → example.com`
6. Copy the generated token

**3. Prepare Directory Structure:**

```bash
mkdir -p ~/deployment/traefik
```

**Required Files:**
```
deployment/
└── traefik/
    ├── docker-compose.traefik.yml
    ├── traefik.yml
    ├── networks.yml
    └── volumes.yml
```

#### What It Does

1. **Validation:**
   - Checks all required parameters
   - Validates configuration files exist
   - Verifies htpasswd file

2. **Network Setup:**
   - Creates `traefik-network` (external)

3. **Volume Setup:**
   - Creates `traefik-certificates-volume` (TLS certs)
   - Creates `traefik-logs-volume` (access logs)

4. **Environment Configuration:**
   - Exports Cloudflare credentials
   - Exports ACME email
   - Exports domain variables

5. **Deployment:**
   - Pulls latest Traefik image
   - Starts Traefik container
   - Waits for health check

6. **Verification:**
   - Displays dashboard URL
   - Shows monitoring commands

#### Post-Deployment

**Access Dashboard:**

```
URL: https://traefik.example.com
Username: (from htpasswd file)
Password: (from htpasswd file)
```

**Verify Traefik:**

```bash
# Check container status
docker ps | grep traefik

# View logs
docker logs traefik

# Check health
curl -I http://localhost:8080/ping
# Expected: HTTP/1.1 200 OK
```

**Monitor Certificate Issuance:**

```bash
# Watch logs for ACME messages
docker logs -f traefik | grep -i acme

# Check certificate file
docker exec traefik ls -lh /certs/
```

#### Troubleshooting

**Certificate Not Issued:**

```bash
# Check Cloudflare API token
curl -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer $CLOUDFLARE_DNS_API_TOKEN"

# Check DNS propagation
dig traefik.example.com

# View detailed logs
docker logs traefik | grep -i error
```

**Dashboard Not Accessible:**

```bash
# Verify htpasswd file
cat ~/.htpasswd

# Check Traefik labels
docker inspect traefik | grep -A 20 Labels
```

---

### glitchtip.sh

**Purpose:** Deploy GlitchTip error tracking service with PostgreSQL database.

#### Overview

Self-hosted Sentry-compatible error tracking with web UI, worker, and database.

#### Requirements

- Docker and Docker Compose installed
- Domain name for GlitchTip
- Strong PostgreSQL password
- Django secret key

#### Usage

```bash
./glitchtip.sh [OPTIONS]
```

#### Required Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `-p, --path <path>` | Deployment directory | `~/deployment` |
| `-d, --domain <domain>` | GlitchTip domain | `glitchtip.example.com` |
| `-s, --secret <key>` | Django SECRET_KEY | `openssl rand -hex 32` |
| `--postgres-password <pw>` | PostgreSQL password | `strongpassword123` |

#### Optional Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `-e, --email <url>` | EMAIL_URL for SMTP | `consolemail://` |
| `--from-email <email>` | DEFAULT_FROM_EMAIL | `noreply@<domain>` |
| `--max-event-days <days>` | Event retention | `90` |
| `-h, --help` | Show help | N/A |

#### Examples

**Basic Deployment:**

```bash
./glitchtip.sh \
  -p ~/deployment \
  -d glitchtip.example.com \
  -s $(openssl rand -hex 32) \
  --postgres-password strongpassword123
```

**With SMTP Email:**

```bash
./glitchtip.sh \
  -p ~/deployment \
  -d glitchtip.example.com \
  -s $(openssl rand -hex 32) \
  --postgres-password strongpassword123 \
  -e "smtp://user:pass@smtp.gmail.com:587" \
  --from-email noreply@example.com
```

**Custom Event Retention:**

```bash
./glitchtip.sh \
  -p ~/deployment \
  -d glitchtip.example.com \
  -s $(openssl rand -hex 32) \
  --postgres-password strongpassword123 \
  --max-event-days 30
```

#### Prerequisites

**1. Generate Secret Key:**

```bash
# Using OpenSSL
openssl rand -hex 32

# Using Python
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

**2. Prepare Directory Structure:**

```
deployment/
└── glitchtip/
    ├── docker-compose.glitchtip.yml
    ├── networks.yml
    └── volumes.yml
```

#### What It Does

1. **Validation:**
   - Checks required parameters
   - Validates configuration files
   - Verifies directory structure

2. **Network Setup:**
   - Creates `glitchtip-internal` network

3. **Volume Setup:**
   - Creates `glitchtip-postgres-volume`
   - Creates `glitchtip-valkey-volume`

4. **Environment Configuration:**
   - Sets Django secret key
   - Configures database connection
   - Sets email configuration
   - Configures retention policy

5. **Deployment:**
   - Runs database migrations
   - Starts web, worker, and database services

6. **Verification:**
   - Displays access URL
   - Shows next steps

#### Post-Deployment

**Access GlitchTip:**

```
URL: https://glitchtip.example.com
```

**Initial Setup:**

1. Create admin account on first visit
2. Create organization (e.g., "Kreditozrouti")
3. Create projects (API, Client, Scraper)
4. Copy DSN from each project

**DSN Format:**

```
https://<key>@glitchtip.example.com/<project-id>
```

**Integration:**

Add to `.env` files:

```env
# API
SENTRY_DSN=https://<key>@glitchtip.example.com/1
SENTRY_RELEASE=v1.0.0

# Client
VITE_SENTRY_DSN=https://<key>@glitchtip.example.com/2
VITE_SENTRY_RELEASE=v1.0.0

# Scraper
SENTRY_DSN=https://<key>@glitchtip.example.com/3
SENTRY_RELEASE=v1.0.0
```

#### Troubleshooting

**Migration Failed:**

```bash
# Check logs
docker logs glitchtip-migrate

# Retry manually
docker compose -p glitchtip run --rm migrate
```

**Can't Access Web UI:**

```bash
# Check container status
docker ps | grep glitchtip

# Check logs
docker logs glitchtip-web
docker logs glitchtip-worker

# Verify Traefik routing
docker inspect glitchtip-web | grep -A 20 Labels
```

---

### github-runner.sh

**Purpose:** Deploy self-hosted GitHub Actions runners for CI/CD pipelines.

#### Overview

Runs GitHub Actions runners as Docker containers with custom labels and scaling.

#### Requirements

- Docker and Docker Compose installed
- GitHub repository access
- GitHub Personal Access Token (PAT) with `repo` scope

#### Usage

```bash
./github-runner.sh [OPTIONS]
```

#### Required Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `-p, --path <path>` | Deployment directory | `~/deployment` |
| `-r, --repo <url>` | GitHub repository URL | `https://github.com/owner/repo` |
| `-t, --token <token>` | GitHub PAT | `ghp_abc123...` |

#### Optional Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `-n, --replicas <num>` | Number of runners | `2` |
| `-l, --labels <list>` | Additional labels (comma-separated) | None |
| `--project <name>` | Project name prefix | `github` |
| `-h, --help` | Show help | N/A |

#### Examples

**Basic Deployment:**

```bash
./github-runner.sh \
  -p ~/deployment \
  -r https://github.com/owner/repo \
  -t ghp_abc123xyz
```

**With Multiple Runners:**

```bash
./github-runner.sh \
  -p ~/deployment \
  -r https://github.com/owner/repo \
  -t ghp_abc123xyz \
  -n 4
```

**With Custom Labels:**

```bash
./github-runner.sh \
  -p ~/deployment \
  -r https://github.com/owner/repo \
  -t ghp_abc123xyz \
  -l "production,ubuntu-22.04,x64"
```

#### Prerequisites

**1. Create GitHub PAT:**

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo` (Full control of private repositories)
4. Generate and copy token

**2. Prepare Directory Structure:**

```
deployment/
├── github-runner/
│   └── docker-compose.github-runner.yml
└── traefik/
    └── networks.yml
```

#### What It Does

1. **Validation:**
   - Validates GitHub repository URL format
   - Checks required parameters
   - Verifies configuration files

2. **Network Setup:**
   - Creates `traefik-network` (if not exists)

3. **Environment Configuration:**
   - Exports GitHub repository URL
   - Exports GitHub token
   - Configures runner labels
   - Sets replica count

4. **Deployment:**
   - Scales to specified replica count
   - Starts runner containers
   - Registers with GitHub

5. **Verification:**
   - Displays runner status

#### Post-Deployment

**Verify Runners:**

```bash
# Check container status
docker ps | grep github-runner

# View logs
docker logs github-runner-1

# Check GitHub
# Go to: https://github.com/owner/repo/settings/actions/runners
```

**Runners should appear as:**
- Name: `hostname-1`, `hostname-2`, etc.
- Status: Idle (green dot)
- Labels: `self-hosted`, `Linux`, `X64`, plus custom labels

**Update Workflows:**

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: self-hosted  # Use self-hosted runners
```

#### Scaling

**Increase Runners:**

```bash
./github-runner.sh \
  -p ~/deployment \
  -r https://github.com/owner/repo \
  -t ghp_abc123xyz \
  -n 6  # Increase from 2 to 6
```

**Decrease Runners:**

```bash
./github-runner.sh \
  -p ~/deployment \
  -r https://github.com/owner/repo \
  -t ghp_abc123xyz \
  -n 1  # Decrease to 1
```

#### Troubleshooting

**Runners Not Appearing:**

```bash
# Check logs for registration errors
docker logs github-runner-1

# Verify token
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/owner/repo
```

**Registration Failed:**

```bash
# Remove existing runners
docker compose -p github down
docker compose -p github up -d

# Check GitHub for offline runners and remove manually
```

---

## Maintenance Scripts

### maintenance.sh

**Purpose:** Comprehensive system maintenance including updates, cleanup, security audits, and health checks.

#### Overview

All-in-one maintenance script for routine system upkeep, suitable for scheduled execution via cron.

#### Requirements

- **Privileges:** Must run as root (sudo)
- **OS:** Ubuntu/Debian
- **Optional Tools:** Lynis (for security audit)

#### Usage

```bash
sudo ./maintenance.sh [OPTIONS]
```

#### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-r, --auto-reboot` | Auto-reboot if required | Interactive prompt |
| `-s, --skip-security` | Skip security audit | Runs audit |
| `-d, --docker-cleanup` | Clean Docker resources | Skips Docker |
| `-q, --quiet` | Minimal output | Verbose |
| `-h, --help` | Show help | N/A |

#### Examples

**Basic Maintenance:**

```bash
sudo ./maintenance.sh
```

**Full Automated Maintenance:**

```bash
sudo ./maintenance.sh -r -d
```

**Quiet Mode (for cron):**

```bash
sudo ./maintenance.sh -q -r >> /var/log/cron-maintenance.log 2>&1
```

**Skip Security Audit:**

```bash
sudo ./maintenance.sh -s
```

#### What It Does

**1. System Updates:**
- Updates APT package lists
- Installs security updates
- Upgrades all packages
- Removes unused packages

**2. Log Cleanup:**
- Retains logs for last 7 days
- Clears old systemd journal entries
- Manages log rotation

**3. Temporary File Cleanup:**
- Removes files older than 7 days from `/tmp`
- Cleans package cache

**4. Docker Cleanup (if `-d` flag):**
- Stops unused containers
- Removes dangling images
- Removes unused volumes
- Removes unused networks
- Prunes build cache

**5. Security Audit (if Lynis installed):**
- System hardening scan
- Security recommendations
- Configuration review

**6. Health Checks:**
- Failed systemd services
- Disk usage > 80%
- Memory usage > 90%
- Load average > CPU count
- Zombie processes
- System errors in journal

**7. Reboot Handling:**
- Checks if reboot required
- 60-second warning (if interactive)
- Auto-reboot (if `-r` flag)

#### Log Files

**Primary Log:** `/var/log/system-maintenance.log`

**View Logs:**

```bash
tail -f /var/log/system-maintenance.log
```

**Log Format:**

```
[2024-01-31 10:15:23] Starting system maintenance...
[2024-01-31 10:15:24] Updating package lists...
[2024-01-31 10:16:12] 42 packages upgraded
[2024-01-31 10:17:05] Disk usage: 65% OK
[2024-01-31 10:17:06] Memory usage: 45% OK
[2024-01-31 10:17:07] Maintenance completed successfully
```

#### Scheduling with Cron

**Weekly Maintenance (Sunday at 2 AM):**

```bash
# Edit crontab
sudo crontab -e

# Add line:
0 2 * * 0 /root/scripts/maintenance.sh -r -d -q >> /var/log/cron-maintenance.log 2>&1
```

**Monthly Full Maintenance (1st of month at 3 AM):**

```bash
0 3 1 * * /root/scripts/maintenance.sh -r -d >> /var/log/monthly-maintenance.log 2>&1
```

**Daily Quick Check (4 AM):**

```bash
0 4 * * * /root/scripts/maintenance.sh -s -q >> /var/log/daily-check.log 2>&1
```

#### Security Audit

**Install Lynis:**

```bash
sudo apt-get install lynis
```

**Audit Results:**

Saved to `/var/log/lynis.log`

**Review Recommendations:**

```bash
sudo cat /var/log/lynis.log | grep -A 5 "Suggestions"
```

#### Health Check Details

**Failed Services:**

```bash
systemctl list-units --failed
```

**Disk Usage:**

```bash
df -h
```

**Memory Usage:**

```bash
free -h
```

**Load Average:**

```bash
uptime
```

**Zombie Processes:**

```bash
ps aux | awk '$8=="Z"'
```

#### Troubleshooting

**Maintenance Fails:**

```bash
# Check log for errors
tail -100 /var/log/system-maintenance.log

# Run manually to see output
sudo ./maintenance.sh
```

**Reboot Not Working:**

```bash
# Check reboot requirements
cat /var/run/reboot-required
cat /var/run/reboot-required.pkgs

# Manual reboot
sudo reboot
```

---

### docker-cleanup.sh

**Purpose:** Clean Docker resources to free disk space and improve performance.

#### Overview

Removes unused Docker containers, images, volumes, networks, and build cache with multiple cleanup modes.

#### Requirements

- Docker installed and running
- Sufficient permissions (user in docker group or root)

#### Usage

```bash
./docker-cleanup.sh [OPTIONS]
```

#### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-a, --all` | Aggressive cleanup (removes all unused) | Conservative |
| `-n, --dry-run` | Preview without making changes | Execute |
| `-f, --force` | Skip confirmation prompts | Interactive |
| `-k, --keep-recent <hrs>` | Keep images used within N hours | `24` |
| `--skip-containers` | Skip container cleanup | Clean all |
| `--skip-images` | Skip image cleanup | Clean all |
| `--skip-volumes` | Skip volume cleanup | Clean all |
| `--skip-networks` | Skip network cleanup | Clean all |
| `--skip-cache` | Skip build cache cleanup | Clean all |
| `-v, --verbose` | Detailed output | Normal |
| `-h, --help` | Show help | N/A |

#### Cleanup Modes

**Conservative Mode (default):**
- Removes stopped containers
- Removes dangling images (untagged)
- Removes unused volumes
- Removes unused networks
- Keeps tagged images

**Aggressive Mode (`-a`):**
- Removes all stopped containers
- Removes all unused images (including tagged)
- Removes all unused volumes
- Removes all unused networks
- Prunes all build cache

#### Examples

**Dry Run (Preview):**

```bash
./docker-cleanup.sh --dry-run
```

**Conservative Cleanup:**

```bash
./docker-cleanup.sh
```

**Aggressive Cleanup:**

```bash
./docker-cleanup.sh -a
```

**Aggressive + Force (No Prompts):**

```bash
./docker-cleanup.sh -a -f
```

**Keep Recent Images:**

```bash
./docker-cleanup.sh -a -k 48  # Keep images used in last 48 hours
```

**Cleanup Only Volumes:**

```bash
./docker-cleanup.sh --skip-containers --skip-images --skip-networks --skip-cache
```

**Verbose Dry Run:**

```bash
./docker-cleanup.sh -n -v
```

#### What It Does

**1. Containers:**
- Lists stopped containers
- Removes stopped containers
- Displays freed space

**2. Images:**
- **Conservative:** Removes dangling images only
- **Aggressive:** Removes all unused images
- Respects `--keep-recent` flag
- Displays freed space

**3. Volumes:**
- Lists unused volumes
- Removes unused volumes (with confirmation)
- Displays freed space

**4. Networks:**
- Lists unused networks
- Removes unused networks
- Preserves default networks

**5. Build Cache:**
- Displays cache usage
- Prunes build cache
- Displays freed space

#### Output

**Summary Format:**

```
🐳 Docker Cleanup Script
================================================================================

🔍 Analyzing Docker resources...

📦 Containers
  Found 5 stopped containers
  ✅ Removed 5 containers (123 MB freed)

🖼️  Images
  Found 12 unused images
  ✅ Removed 12 images (2.3 GB freed)

💾 Volumes
  Found 3 unused volumes
  ✅ Removed 3 volumes (456 MB freed)

🌐 Networks
  Found 2 unused networks
  ✅ Removed 2 networks

🔨 Build Cache
  Current cache size: 1.2 GB
  ✅ Pruned cache (1.2 GB freed)

================================================================================
✅ Cleanup completed successfully!
💾 Total space freed: 4.08 GB
================================================================================
```

#### Logging

**Log File:** `/tmp/docker-cleanup-YYYYMMDD-HHMMSS.log`

**View Logs:**

```bash
# Find latest log
ls -lt /tmp/docker-cleanup-*.log | head -1

# View log
cat /tmp/docker-cleanup-20240131-102345.log
```

#### Safety Features

**Confirmation Prompts:**

```
⚠️  WARNING: This will remove all unused images!
   Continue? (y/N):
```

**Dry Run Output:**

```
[DRY-RUN] Would remove container: abc123
[DRY-RUN] Would remove image: nginx:latest
[DRY-RUN] Would remove volume: mysql-data
```

**Protected Resources:**

- Running containers: Never removed
- Images used by running containers: Protected
- Named volumes: Require confirmation
- Default networks: Preserved

#### Best Practices

**Regular Cleanup:**

```bash
# Weekly scheduled cleanup
0 3 * * 0 /usr/local/bin/docker-cleanup.sh -f >> /var/log/docker-cleanup.log 2>&1
```

**Before Major Builds:**

```bash
# Free space before CI/CD builds
./docker-cleanup.sh -a -f
```

**Disk Space Alert:**

```bash
# When disk > 80% usage
if [ $(df -h / | awk 'NR==2 {print $5}' | sed 's/%//') -gt 80 ]; then
  ./docker-cleanup.sh -a -f
fi
```

#### Troubleshooting

**Permission Denied:**

```bash
# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Or run with sudo
sudo ./docker-cleanup.sh
```

**Cleanup Fails:**

```bash
# Check Docker status
docker info

# Check logs
tail -100 /tmp/docker-cleanup-*.log

# Manual cleanup
docker system prune -a --volumes -f
```

---

## Common Patterns

### Logging

All scripts use consistent logging with colored output:

```bash
# Color codes
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'  # No Color

# Usage
echo -e "${GREEN}✅ Success message${NC}"
echo -e "${YELLOW}⚠️  Warning message${NC}"
echo -e "${RED}❌ Error message${NC}"
echo -e "${BLUE}ℹ️  Info message${NC}"
```

### Error Handling

All scripts use strict error handling:

```bash
#!/bin/bash
set -euo pipefail

# -e: Exit on error
# -u: Exit on undefined variable
# -o pipefail: Exit on pipe failure
```

### Parameter Parsing

Consistent parameter parsing pattern:

```bash
while [[ $# -gt 0 ]]; do
  case $1 in
    -p|--path)
      DEPLOYMENT_PATH="$2"
      shift 2
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done
```

### Validation

All scripts validate prerequisites:

```bash
# Check root privileges
if [[ $EUID -ne 0 ]]; then
  echo "This script must be run as root"
  exit 1
fi

# Check file exists
if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Configuration file not found: $CONFIG_FILE"
  exit 1
fi

# Check command available
if ! command -v docker &> /dev/null; then
  echo "Docker is not installed"
  exit 1
fi
```

---

## Scheduling & Automation

### Cron Job Examples

**Weekly System Maintenance:**

```bash
# Every Sunday at 2 AM
0 2 * * 0 /root/scripts/maintenance.sh -r -d -q >> /var/log/weekly-maintenance.log 2>&1
```

**Daily Docker Cleanup:**

```bash
# Every day at 3 AM
0 3 * * * /root/scripts/docker-cleanup.sh -f >> /var/log/docker-cleanup.log 2>&1
```

**Monthly Full Maintenance:**

```bash
# First day of month at 4 AM
0 4 1 * * /root/scripts/maintenance.sh -r -d >> /var/log/monthly-maintenance.log 2>&1
```

**Disk Space Monitoring:**

```bash
# Every 6 hours
0 */6 * * * /root/scripts/check-disk-space.sh
```

### Systemd Timers

**Create Service:**

```bash
# /etc/systemd/system/maintenance.service
[Unit]
Description=System Maintenance
After=network.target

[Service]
Type=oneshot
ExecStart=/root/scripts/maintenance.sh -r -d -q
StandardOutput=journal
StandardError=journal
```

**Create Timer:**

```bash
# /etc/systemd/system/maintenance.timer
[Unit]
Description=Weekly System Maintenance
Requires=maintenance.service

[Timer]
OnCalendar=Sun *-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

**Enable Timer:**

```bash
sudo systemctl daemon-reload
sudo systemctl enable maintenance.timer
sudo systemctl start maintenance.timer

# Check status
sudo systemctl list-timers
```

---

## Best Practices

### Script Organization

**1. Keep Scripts in Version Control:**

```bash
# In repository
/scripts/*.sh

# Deployed to server
~/scripts/*.sh
```

**2. Use Symbolic Links:**

```bash
# Make scripts accessible globally
sudo ln -s ~/scripts/maintenance.sh /usr/local/bin/maintenance
sudo ln -s ~/scripts/docker-cleanup.sh /usr/local/bin/docker-cleanup
```

**3. Set Permissions:**

```bash
# Make executable
chmod +x ~/scripts/*.sh

# Restrict sensitive scripts
chmod 700 ~/scripts/traefik.sh
```

### Logging Best Practices

**1. Separate Log Files:**

```bash
# System logs
/var/log/system-maintenance.log
/var/log/docker-cleanup.log

# Application logs
/var/log/app/*.log
```

**2. Log Rotation:**

```bash
# /etc/logrotate.d/custom-scripts
/var/log/system-maintenance.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
}
```

**3. Monitor Logs:**

```bash
# Real-time monitoring
tail -f /var/log/system-maintenance.log

# Search logs
grep ERROR /var/log/*.log

# Analyze logs
journalctl -u maintenance --since "1 hour ago"
```

### Security Best Practices

**1. Protect Credentials:**

```bash
# Never hard-code secrets
GITHUB_TOKEN=${GITHUB_TOKEN:-}

# Use environment files
source ~/.secrets

# Restrict file permissions
chmod 600 ~/.secrets
```

**2. Validate Input:**

```bash
# Validate domain format
if [[ ! "$DOMAIN" =~ ^[a-zA-Z0-9.-]+$ ]]; then
  echo "Invalid domain format"
  exit 1
fi

# Validate path exists
if [[ ! -d "$PATH" ]]; then
  echo "Path does not exist"
  exit 1
fi
```

**3. Use Dry-Run Mode:**

```bash
# Test before executing
./script.sh --dry-run

# Then execute
./script.sh
```

---

## Troubleshooting

### Common Issues

#### Script Permission Denied

**Symptoms:**
```bash
bash: ./script.sh: Permission denied
```

**Solution:**

```bash
chmod +x script.sh
```

---

#### Command Not Found

**Symptoms:**
```bash
./script.sh: line 42: docker: command not found
```

**Solution:**

```bash
# Check if command exists
which docker

# Install if missing
sudo apt-get install docker.io

# Add to PATH
export PATH=$PATH:/usr/local/bin
```

---

#### Root Privileges Required

**Symptoms:**
```bash
This script must be run as root
```

**Solution:**

```bash
sudo ./script.sh
```

---

#### Configuration File Not Found

**Symptoms:**
```bash
Error: Configuration file not found: /path/to/config.yml
```

**Solution:**

```bash
# Check file exists
ls -l /path/to/config.yml

# Check working directory
pwd

# Use absolute paths
./script.sh -p /full/path/to/deployment
```

---

#### Docker Daemon Not Running

**Symptoms:**
```bash
Cannot connect to the Docker daemon
```

**Solution:**

```bash
# Start Docker
sudo systemctl start docker

# Enable on boot
sudo systemctl enable docker

# Check status
sudo systemctl status docker
```

---

### Debug Mode

**Enable Debug Output:**

```bash
# Run with bash -x
bash -x ./script.sh

# Or add to script
#!/bin/bash
set -x  # Enable debug mode
```

**Verbose Output:**

```bash
# Most scripts support verbose flag
./script.sh -v

# Or use verbose option
./script.sh --verbose
```

---

## Additional Resources

- [Bash Scripting Guide](https://www.gnu.org/software/bash/manual/)
- [Docker Documentation](https://docs.docker.com/)
- [Systemd Documentation](https://www.freedesktop.org/software/systemd/man/)
- [Cron Documentation](https://man7.org/linux/man-pages/man5/crontab.5.html)

---

## Summary

The scripts directory provides comprehensive automation for:

- **Infrastructure Setup**: Automated Docker installation
- **Service Deployment**: Traefik, GlitchTip, GitHub Runners
- **System Maintenance**: Updates, cleanup, health checks
- **Docker Management**: Resource cleanup and optimization

All scripts follow consistent patterns for:
- Colored, timestamped logging
- Comprehensive error handling
- Parameter validation
- Dry-run modes
- Detailed help documentation

These scripts are designed for both interactive use and automated scheduling, providing a robust foundation for infrastructure management and operational excellence.
