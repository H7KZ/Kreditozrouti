# Scripts — CLAUDE.md

> Full reference: [docs/dev/scripts/](../docs/scripts/README.md)

VPS-wide scripts (`install-docker.sh`, `maintenance.sh`, `docker-cleanup.sh`, `setup-swap.sh`) live in the
**Infrastructure** repo — this box shares one Docker daemon and one disk across every repo deployed to it,
so generic host upkeep is that repo's job. Reachable at `~/scripts/` on the VPS regardless of which repo
owns them.

---

## Scripts

| Script                   | Purpose                                                                   | Requires Root |
|--------------------------|---------------------------------------------------------------------------|---------------|
| `lib.sh`                 | Shared utilities — sourced by all scripts, not run directly               | No            |
| `setup-automation.sh`    | Install systemd timer for the daily MySQL backup                          | Yes           |
| `backup-mysql.sh`        | Dump MySQL, replicate off-site via rclone, emit Prometheus metrics        | No            |
| `clone-db.sh`            | Clone MySQL DB between dev and prod stacks on the same VPS                | Yes           |
| `sync-grafana-alerts.sh` | Delete Grafana alert rules orphaned from `rules.yml`, reload provisioning | No            |
| `check-em-dashes.sh`     | CI lint check (used by `_verify.yml`)                                     | No            |

---

## Critical Invariants

**Always source `lib.sh` first** in any new script:

```bash
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"
```

**`setup-automation.sh`** — prefer this over hand-written cron. It installs a systemd timer pointing at
`backup-mysql.sh`'s absolute path (`$SCRIPT_DIR`), so the repo must stay checked out at the deployed location.
Re-run to update the schedule; `--uninstall` removes the unit. Idempotent.

**`backup-mysql.sh`** — the only thing standing between a disk failure and losing every scraped row. Runs as the
**deploy user, not root**: a system unit would get `HOME=/root`, but the version directories and dumps live under
the SSH deploy user's home, so the unit sets `User=` and `Environment=HOME=` from the owner of `$SCRIPT_DIR`. That
user must be in the `docker` group or the dump cannot reach the mysql container. Credentials are never read on the
host - `mysqldump` runs inside the container against its own env.

Off-site replication is opt-in via `BACKUP_REMOTE` in `/etc/default/kreditozrouti-backup`. Unset means dumps exist
**only on this VPS** and the script says so on every run. Set-but-broken is a hard error, never a silent skip, so
"configured" and "happening" cannot quietly disagree.

It writes `mysql-backup.prom` atomically to the Prometheus textfile directory on every exit path. The success
timestamp is only advanced on a fully successful run and is carried forward from the previous file on failure - a
failing run must never look like a successful one, because the Grafana alert is staleness-based.

---

## Key Docs

| Topic                                                                      | Doc                                              |
|----------------------------------------------------------------------------|--------------------------------------------------|
| VPS-wide scripts (install-docker, maintenance, docker-cleanup, setup-swap) | `Infrastructure/scripts/CLAUDE.md`               |
| backup-mysql, clone-db — all flags + examples                              | [MAINTENANCE.md](../docs/scripts/MAINTENANCE.md) |
