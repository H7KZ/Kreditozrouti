# Scripts — Maintenance

Scripts for ongoing system and Docker housekeeping.

---

## `maintenance.sh`

Ubuntu/Debian system maintenance. Logs to `/var/log/system-maintenance.log`. Requires root.

```bash
sudo ./maintenance.sh [OPTIONS]
```

**Options:**

| Flag                   | Description                                 |
|------------------------|---------------------------------------------|
| `-r, --auto-reboot`    | Reboot if required (60 s warning countdown) |
| `-s, --skip-security`  | Skip Lynis security audit                   |
| `-d, --docker-cleanup` | Also prune Docker resources                 |
| `-q, --quiet`          | Suppress stdout (still logs to file)        |

**Steps:**

1. `apt-get update && upgrade && dist-upgrade && autoremove`
2. Vacuum systemd journal (7-day retention)
3. Delete `/tmp` files older than 7 days
4. Docker prune (if `--docker-cleanup`)
5. `unattended-upgrades --dry-run` + Lynis security audit (unless `--skip-security`)
6. Health check — reports on:
    - Failed systemd services
    - Disk usage > 80 %
    - Memory usage > 90 %
    - Load average > CPU count
    - Zombie processes
7. Reboot handling (warns, then reboots with `--auto-reboot`)

### Scheduling

Prefer `setup-automation.sh` (systemd timers) over hand-written cron - see below.
If you must use cron, weekly, Sunday at 3 AM:

```
0 3 * * 0 sudo /opt/scripts/maintenance.sh --auto-reboot --docker-cleanup >> /var/log/cron-maintenance.log 2>&1
```

---

## `setup-automation.sh`

Installs systemd services + timers so cleanup and maintenance run unattended. Requires root.
This is the recommended way to keep the host from filling up on disk/logs (the usual trigger for the
Prometheus `DatasourceNoData` and container-down alert cascade). Idempotent - re-run to change schedules.

```bash
sudo ./setup-automation.sh [OPTIONS]
```

**Installs three timers:**

| Timer                            | Schedule (default) | Runs                                                  |
|----------------------------------|--------------------|-------------------------------------------------------|
| `kreditozrouti-mysql-backup`     | daily 02:00        | `backup-mysql.sh production`                          |
| `kreditozrouti-docker-cleanup`   | daily 03:30        | `docker-cleanup.sh --all --force --keep-recent 48`    |
| `kreditozrouti-maintenance`      | weekly Sun 04:00   | `maintenance.sh --docker-cleanup [--auto-reboot]`     |

**Options:**

| Flag                        | Description                                               |
|-----------------------------|-----------------------------------------------------------|
| `-r, --auto-reboot`         | Weekly maintenance may reboot when packages require it     |
| `--swap-size <GB>`          | Swap file size to ensure exists (default: 4)               |
| `--skip-swap`               | Do not ensure a swap file exists                          |
| `--cleanup-time <HH:MM>`    | Daily cleanup time (default: 03:30)                        |
| `--maintenance-time <spec>` | Weekly `OnCalendar` spec (default: `Sun *-*-* 04:00:00`)   |
| `--keep-recent <hrs>`       | Keep images newer than N hours in daily cleanup (def: 48)  |
| `--backup-time <HH:MM>`     | Daily MySQL backup time (default: 02:00)                   |
| `--backup-env <name>`       | Environment to back up (default: production)               |
| `--backup-user <name>`      | User the backup runs as (default: owner of `$SCRIPT_DIR`)  |
| `-s, --status`              | Show installed timer status and exit                      |
| `-u, --uninstall`           | Remove installed timers and unit files                    |

On install it also ensures a swap file exists (runs `setup-swap.sh` if no swap is active) - the memory cushion that
prevents the OOM cascade on a low-RAM host. Units are written to `/etc/systemd/system/` and point at the scripts'
absolute paths, so the repo must stay checked out where it was when you ran the installer. Inspect with `sudo ./setup-automation.sh --status` or
`journalctl -u kreditozrouti-docker-cleanup.service`.

---

## `docker-cleanup.sh`

Selective Docker resource cleanup. Always run `--dry-run` first.

```bash
./docker-cleanup.sh --dry-run              # preview — no changes made
./docker-cleanup.sh                        # dangling resources, interactive
./docker-cleanup.sh --all --force          # aggressive, no prompt
./docker-cleanup.sh --skip-volumes -f      # everything except volumes
./docker-cleanup.sh -a -k 48              # unused images older than 48 h
```

**Key flags:**

| Flag                      | Purpose                                                           |
|---------------------------|-------------------------------------------------------------------|
| `-a, --all`               | Remove ALL unused images (not just dangling)                      |
| `-n, --dry-run`           | Preview without removing                                          |
| `-f, --force`             | Skip confirmation prompt                                          |
| `-k, --keep-recent <hrs>` | With `--all`: only remove images older than N hours (default: 24) |
| `--skip-containers`       | Skip container cleanup                                            |
| `--skip-images`           | Skip image cleanup                                                |
| `--skip-volumes`          | Skip volume cleanup                                               |
| `--skip-networks`         | Skip network cleanup                                              |
| `--skip-cache`            | Skip build cache cleanup                                          |
| `--skip-logs`             | Skip container log truncation                                     |
| `-v, --verbose`           | Show individual item names                                        |

Container json-file logs (`/var/lib/docker/containers/*/*-json.log`) live outside `docker system df` accounting, so
`docker system prune` never reclaims them. The log-truncation step zeroes them in place - running containers keep
logging. Requires root to reach the Docker root dir.

`--keep-recent` uses `docker image prune --filter "until=<N>h"` — useful for preserving recently deployed images during
CI cleanup cycles.

Logs to `/tmp/docker-cleanup-<timestamp>.log`.

### Common usage patterns

```bash
# Weekly CI runner cleanup: remove images unused for more than 48 h
./docker-cleanup.sh --all --keep-recent 48 --force

# Safe pre-deployment cleanup: only dangling resources, skip volumes
./docker-cleanup.sh --skip-volumes --force

# Full system prune (⚠️ removes all stopped containers and unused volumes)
./docker-cleanup.sh --all --force
```

---

## `backup-mysql.sh`

Dumps the production MySQL database, optionally replicates it off-site, prunes old dumps, and writes Prometheus
metrics describing the run. Installed as a daily timer by `setup-automation.sh`; can also be run by hand.

```bash
./scripts/backup-mysql.sh [environment]   # environment defaults to "production"
```

Every course, schedule and user row exists only in one MySQL volume on one VPS. This script is the only thing
between a disk failure and losing all of it.

**Runs as the deploy user, not root.** A systemd system unit gets `HOME=/root`, but the version directories and
dumps live under the SSH deploy user's home, so the unit sets `User=` and `Environment=HOME=` from the owner of
`scripts/`. That user must be in the `docker` group, or the dump cannot reach the mysql container.
`--backup-user <name>` overrides the detection.

**Credentials never touch the host.** `mysqldump` runs inside the mysql container and reads `MYSQL_ROOT_PASSWORD`
and `MYSQL_DATABASE` from the container's own environment.

**Settings** live in `/etc/default/kreditozrouti-backup`, created with a commented template on first install and
deliberately left behind by `--uninstall`:

| Variable                 | Default                                      | Purpose                                          |
|--------------------------|----------------------------------------------|--------------------------------------------------|
| `BACKUP_REMOTE`          | unset                                        | rclone remote path, e.g. `storagebox:kreditozrouti/production` |
| `BACKUP_RETENTION_DAYS`  | 14                                           | Delete dumps older than this                     |
| `BACKUP_MIN_KEEP`        | 5                                            | Never prune below this many dumps                |
| `BACKUP_TEXTFILE_DIR`    | `/var/lib/kreditozrouti/textfile-collector`  | Where the Prometheus metrics file is written     |
| `BACKUP_COMPOSE_PROJECT` | `kreditozrouti` / `kreditozrouti-dev`        | Compose project name passed to `-p`              |

**Off-site is opt-in and fails loudly.** With `BACKUP_REMOTE` unset the script says on every run that the dump
exists only on this VPS. With it set but rclone missing, or the copy failing, the script exits non-zero rather
than skipping quietly, so "off-site backups are configured" and "off-site backups are happening" cannot disagree.
After copying it re-lists the file on the remote, which catches a path that silently resolves somewhere else.

**Metrics.** `mysql-backup.prom` is written atomically on every exit path, including failures:

| Metric                                                | Meaning                                            |
|-------------------------------------------------------|----------------------------------------------------|
| `kreditozrouti_backup_last_success_timestamp_seconds` | Advanced only on a fully successful run            |
| `kreditozrouti_backup_last_attempt_timestamp_seconds` | Advanced on every run, successful or not           |
| `kreditozrouti_backup_last_duration_seconds`          | Wall-clock duration of the run                     |
| `kreditozrouti_backup_size_bytes`                     | Size of the dump just written                      |
| `kreditozrouti_backup_offsite_replicated`             | 1 if replicated off-site this run, else 0          |

On failure the success timestamp is carried forward from the previous file rather than updated, so a failing run
cannot look like a successful one. Alloy ships these to Prometheus and Grafana alerts if no success in 36 hours.
See [OPERATIONS.md](../deployment/OPERATIONS.md) for the restore drill.

---


## `clone-db.sh`

Clones the MySQL database between the `dev` and `prod` Docker Compose stacks on the same VPS. Use this to seed an
environment from the other's already-scraped InSIS data without triggering a full re-scrape.

```bash
sudo ./scripts/clone-db.sh <dev-to-prod|prod-to-dev>
```

| Argument      | Description                                  |
|---------------|----------------------------------------------|
| `dev-to-prod` | Copy the dev database into the prod database |
| `prod-to-dev` | Copy the prod database into the dev database |

**Safety:**

- Before wiping the target database, takes a timestamped gzip backup to `~/backups/db-clones/`.
- Prompts the operator to type the target environment's Docker Compose project name before proceeding — no automated
  confirmation is possible.
- Redis/BullMQ queue data is **not** cloned (by design — queues belong to each environment independently).

**Verification:**

After the clone, the script runs a row-count check on the `insis_courses` table in the target database and prints the
result so the operator can confirm the data landed correctly.

**Example:**

```bash
# Seed prod from dev after a successful dev scrape
sudo ./scripts/clone-db.sh dev-to-prod
```
