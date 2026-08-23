# Scripts — CLAUDE.md

> Full reference: [docs/dev/scripts/](../docs/scripts/README.md)

---

## Scripts

| Script                | Purpose                                                       | Requires Root |
|-----------------------|---------------------------------------------------------------|---------------|
| `lib.sh`              | Shared utilities — sourced by all scripts, not run directly   | No            |
| `install-docker.sh`   | Install Docker Engine on Ubuntu/Debian                        | Yes           |
| `maintenance.sh`      | System maintenance (apt, cleanup, security, health)           | Yes           |
| `docker-cleanup.sh`   | Clean unused Docker resources                                 | No            |
| `setup-automation.sh` | Install systemd timers for daily cleanup + weekly maintenance | Yes           |
| `setup-swap.sh`       | Create/resize a swapfile (mitigates OOM on low-RAM hosts)     | Yes           |
| `clone-db.sh`         | Clone MySQL DB between dev and prod stacks on the same VPS    | Yes           |

---

## Critical Invariants

**Always source `lib.sh` first** in any new script:

```bash
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"
```

**`docker-cleanup.sh`** — always run `--dry-run` before `--force`. The `--all` flag removes ALL unused images, not just
dangling ones.

**`maintenance.sh`** — sets `--auto-reboot` only in automated cron contexts; interactive use should omit it to avoid
unexpected reboots.

**`setup-automation.sh`** — prefer this over hand-written cron. It installs systemd timers pointing at the scripts'
absolute paths (`$SCRIPT_DIR`), so the repo must stay checked out at the deployed location. Re-run to update schedules;
`--uninstall` removes the units. Idempotent.

---

## Key Docs

| Topic                                                             | Doc                                                    |
|-------------------------------------------------------------------|--------------------------------------------------------|
| install-docker — all flags                                        | [INFRASTRUCTURE.md](../docs/scripts/INFRASTRUCTURE.md) |
| maintenance, docker-cleanup, clone-db — all flags + cron examples | [MAINTENANCE.md](../docs/scripts/MAINTENANCE.md)       |
