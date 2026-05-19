# Scripts — CLAUDE.md

> Full reference: [docs/scripts/](../docs/scripts/README.md)

---

## Scripts

| Script | Purpose | Requires Root |
|--------|---------|---------------|
| `lib.sh` | Shared utilities — sourced by all scripts, not run directly | No |
| `install-docker.sh` | Install Docker Engine on Ubuntu/Debian | Yes |
| `traefik.sh` | Deploy Traefik reverse proxy | No |
| `glitchtip.sh` | Deploy GlitchTip error tracking | No |
| `github-runner.sh` | Deploy self-hosted GitHub Actions runners | No |
| `maintenance.sh` | System maintenance (apt, cleanup, security, health) | Yes |
| `docker-cleanup.sh` | Clean unused Docker resources | No |

---

## Critical Invariants

**Always source `lib.sh` first** in any new script:
```bash
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"
```

**`docker-cleanup.sh`** — always run `--dry-run` before `--force`. The `--all` flag removes ALL unused images, not just dangling ones.

**`maintenance.sh`** — sets `--auto-reboot` only in automated cron contexts; interactive use should omit it to avoid unexpected reboots.

---

## Key Docs

| Topic | Doc |
|-------|-----|
| install-docker, traefik, glitchtip, github-runner — all flags | [INFRASTRUCTURE.md](../docs/scripts/INFRASTRUCTURE.md) |
| maintenance, docker-cleanup — all flags + cron examples | [MAINTENANCE.md](../docs/scripts/MAINTENANCE.md) |
