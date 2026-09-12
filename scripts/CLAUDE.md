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
| `setup-automation.sh` | Install systemd timers for daily backup + cleanup, weekly maintenance | Yes    |
| `backup-mysql.sh`     | Dump MySQL, replicate off-site via rclone, emit Prometheus metrics | No       |
| `setup-swap.sh`       | Create/resize a swapfile (mitigates OOM on low-RAM hosts)     | Yes           |
| `clone-db.sh`         | Clone MySQL DB between dev and prod stacks on the same VPS    | Yes           |
| `sync-grafana-alerts.sh` | Delete Grafana alert rules orphaned from `rules.yml`, reload provisioning | No |

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

**`backup-mysql.sh`** — the only thing standing between a disk failure and losing every scraped row. Runs as the
**deploy user, not root**: a system unit would get `HOME=/root`, but the version directories and dumps live under the
SSH deploy user's home, so the unit sets `User=` and `Environment=HOME=` from the owner of `$SCRIPT_DIR`. That user
must be in the `docker` group or the dump cannot reach the mysql container. Credentials are never read on the host -
`mysqldump` runs inside the container against its own env.

Off-site replication is opt-in via `BACKUP_REMOTE` in `/etc/default/kreditozrouti-backup`. Unset means dumps exist
**only on this VPS** and the script says so on every run. Set-but-broken is a hard error, never a silent skip, so
"configured" and "happening" cannot quietly disagree.

It writes `mysql-backup.prom` atomically to the Prometheus textfile directory on every exit path. The success
timestamp is only advanced on a fully successful run and is carried forward from the previous file on failure - a
failing run must never look like a successful one, because the Grafana alert is staleness-based.

---

## Key Docs

| Topic                                                             | Doc                                                    |
|-------------------------------------------------------------------|--------------------------------------------------------|
| install-docker — all flags                                        | [INFRASTRUCTURE.md](../docs/scripts/INFRASTRUCTURE.md) |
| maintenance, docker-cleanup, clone-db — all flags + cron examples | [MAINTENANCE.md](../docs/scripts/MAINTENANCE.md)       |
