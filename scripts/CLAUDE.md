# scripts/ — CLAUDE.md

Server management and infrastructure deployment scripts. All scripts source `lib.sh` for shared logging, file validation, and Docker utilities.

---

## Scripts Overview

| Script | Purpose | Requires Root |
|---|---|---|
| `lib.sh` | Shared utilities (logging, `validate_files`, `create_networks`, `create_volumes`) | No |
| `install-docker.sh` | Install Docker Engine on Ubuntu/Debian | Yes (`sudo`) |
| `traefik.sh` | Deploy Traefik reverse proxy | No |
| `glitchtip.sh` | Deploy GlitchTip error tracking | No |
| `github-runner.sh` | Deploy self-hosted GitHub Actions runners | No |
| `maintenance.sh` | System maintenance (apt, cleanup, security, health) | Yes (`sudo`) |
| `docker-cleanup.sh` | Clean unused Docker resources | No |

---

## lib.sh

Shared library sourced by all scripts. Not executable on its own.

**Provides:**

- Color variables: `RED`, `GREEN`, `YELLOW`, `BLUE`, `CYAN`, `DIM`, `NC`
- `log <msg>` — blue timestamp prefix
- `log_success <msg>` — green timestamp prefix
- `log_warning <msg>` — yellow timestamp prefix
- `log_error <msg>` — red timestamp prefix, writes to stderr
- If `LOG_FILE` is set before first log call, all output tees to that file automatically
- `validate_files <file...>` — exits 1 with a clear error if any file is missing
- `create_networks <networks.yml>` — creates external Docker networks if they don't exist
- `create_volumes <volumes.yml>` — creates Docker volumes if they don't exist

**Source pattern:**

```bash
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"
```

---

## install-docker.sh

Installs Docker Engine on Ubuntu 20.04+ / Debian 11+. Run once on a fresh server.

```bash
sudo ./install-docker.sh [--user <username>] [--skip-test]
```

What it does:
1. Removes conflicting old Docker packages
2. Installs prerequisites (`curl`, `gnupg`, etc.)
3. Adds Docker's official apt repository with GPG key
4. Installs `docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-compose-plugin`
5. Runs `docker run hello-world` to verify (skip with `--skip-test`)
6. Adds `$SUDO_USER` (or `--user`) to the `docker` group
7. Enables and starts the Docker systemd service

After install, log out and back in for group membership to apply.

---

## traefik.sh

Deploys the global Traefik reverse proxy. Reads config from `deployment/traefik/`.

```bash
./traefik.sh \
  --path ~/deployment \
  --domain traefik.example.com \
  --credentials ~/.htpasswd \
  --cf-email user@example.com \
  --cf-token CF_TOKEN
```

**Required:** `--path`, `--domain`, `--credentials`, `--cf-email`, `--cf-token`

Cloudflare token must have `Zone → DNS → Edit` permission. Generate htpasswd:

```bash
htpasswd -c ~/.htpasswd admin
```

Also supports env vars: `DEPLOYMENT_PATH`, `TRAEFIK_DOMAIN`, `TRAEFIK_CREDENTIALS_PATH`, `CF_API_EMAIL`, `CF_DNS_API_TOKEN`, `ACME_EMAIL`.

---

## glitchtip.sh

Deploys GlitchTip self-hosted error tracking. Reads config from `deployment/glitchtip/`.

```bash
./glitchtip.sh \
  --path ~/deployment \
  --domain glitchtip.example.com \
  --secret "$(openssl rand -hex 32)" \
  --postgres-password "securepass"
```

**Required:** `--path`, `--domain`, `--secret`, `--postgres-password`

**Optional flags:**

| Flag | Default | Purpose |
|---|---|---|
| `-e, --email <url>` | `consolemail://` | SMTP connection URL |
| `--from-email <addr>` | `noreply@<domain>` | Sender email |
| `--max-event-days <n>` | `90` | Event retention (days) |
| `--disable-registration` | (registration enabled) | Disable new user sign-ups |

After deployment, create a superuser:

```bash
docker compose -p glitchtip exec web python manage.py createsuperuser
```

Also supports env vars: `DEPLOYMENT_PATH`, `GLITCHTIP_DOMAIN`, `SECRET_KEY`, `POSTGRES_PASSWORD`, `EMAIL_URL`, `DEFAULT_FROM_EMAIL`, `GLITCHTIP_MAX_EVENT_LIFE_DAYS`, `ENABLE_USER_REGISTRATION`.

---

## github-runner.sh

Deploys self-hosted GitHub Actions runners. Runners auto-register to the repo on startup.

```bash
./github-runner.sh \
  --path ~/deployment \
  --repo https://github.com/owner/repo \
  --token ghp_xxx \
  --replicas 3
```

**Required:** `--path`, `--repo`, `--token`

Runners share the Docker socket (needed for container image builds in CI workflows). Labels default to `docker,self-hosted`; add more with `--labels`.

Also supports env vars: `DEPLOYMENT_PATH`, `GITHUB_REPO_URL`, `GITHUB_ACCESS_TOKEN`, `PROJECT`, `RUNNER_REPLICAS`, `RUNNER_LABELS`.

---

## maintenance.sh

Ubuntu/Debian system maintenance. Logs to `/var/log/system-maintenance.log`.

```bash
sudo ./maintenance.sh [OPTIONS]

Options:
  -r, --auto-reboot     Reboot if required (60s warning)
  -s, --skip-security   Skip Lynis security audit
  -d, --docker-cleanup  Also prune Docker resources
  -q, --quiet           Suppress stdout (still logs to file)
```

**What it does:**

1. `apt-get update && upgrade && dist-upgrade && autoremove`
2. Vacuums systemd journal (7-day retention)
3. Deletes tmp files older than 7 days
4. Docker prune (if `--docker-cleanup`)
5. `unattended-upgrades --dry-run` + Lynis security audit
6. Health check: failed systemd services, disk, memory, load, zombies
7. Reboot handling

**Recommended cron** (weekly, Sunday 3 AM):

```
0 3 * * 0 sudo /opt/scripts/maintenance.sh --auto-reboot --docker-cleanup >> /var/log/cron-maintenance.log 2>&1
```

---

## docker-cleanup.sh

Selective Docker resource cleanup. Always run `--dry-run` first.

```bash
./docker-cleanup.sh --dry-run              # preview (no changes)
./docker-cleanup.sh                        # dangling resources, interactive
./docker-cleanup.sh --all --force          # aggressive, no prompt
./docker-cleanup.sh --skip-volumes -f      # everything except volumes
./docker-cleanup.sh -a -k 48              # unused images older than 48h
```

**Key flags:**

| Flag | Purpose |
|---|---|
| `-a, --all` | Remove ALL unused (not just dangling) images |
| `-n, --dry-run` | Preview without removing |
| `-f, --force` | Skip confirmation prompt |
| `-k, --keep-recent <hrs>` | With `--all`: only remove images older than N hours (default: 24) |
| `--skip-containers/images/volumes/networks/cache` | Selective skipping |
| `-v, --verbose` | Show individual item names |

`--keep-recent` uses `docker image prune --filter "until=<N>h"` — preserves recently deployed images during CI cleanup cycles.

Logs to `/tmp/docker-cleanup-<timestamp>.log`.
