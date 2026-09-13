# Scripts — Maintenance

Scripts for ongoing system and Docker housekeeping.

---

## VPS-wide scripts moved to Infrastructure

`maintenance.sh`, `docker-cleanup.sh`, `install-docker.sh` and `setup-swap.sh` moved to the **Infrastructure** repo's
`scripts/` — they're generic host upkeep, not Kreditozrouti-specific, and this
VPS shares one Docker daemon and one disk across every repo deployed to it. Full docs:
`Infrastructure/scripts/CLAUDE.md`.

Once synced, they're reachable at the stable path `~/scripts/` on the VPS (a symlink to
`~/infrastructure/scripts/`, kept current by Infrastructure's `sync-scripts.yml`) regardless of which
repo owns them:

```bash
sudo ~/scripts/maintenance.sh --docker-cleanup
~/scripts/docker-cleanup.sh --dry-run
sudo ~/scripts/setup-automation.sh --status   # VPS-wide docker-cleanup + maintenance timers
```

---

## `setup-automation.sh` (this repo)

Installs a systemd timer for the daily MySQL backup only. VPS-wide docker-cleanup/maintenance timers are
Infrastructure's `scripts/setup-automation.sh` — run that once per VPS, not once per repo. Idempotent -
re-run this to change the backup schedule.

```bash
sudo ./setup-automation.sh [OPTIONS]
```

**Installs:**

| Timer                        | Schedule (default) | Runs                         |
|------------------------------|--------------------|------------------------------|
| `kreditozrouti-mysql-backup` | daily 02:00        | `backup-mysql.sh production` |

**Options:**

| Flag                    | Description                                               |
|-------------------------|-----------------------------------------------------------|
| `--backup-time <HH:MM>` | Daily MySQL backup time (default: 02:00)                  |
| `--backup-env <name>`   | Environment to back up (default: production)              |
| `--backup-user <name>`  | User the backup runs as (default: owner of `$SCRIPT_DIR`) |
| `-s, --status`          | Show installed timer status and exit                      |
| `-u, --uninstall`       | Remove installed timer and unit files                     |

Units are written to `/etc/systemd/system/` and point at the script's absolute path, so the repo must stay
checked out where it was when you ran the installer. Inspect with `sudo ./setup-automation.sh --status` or
`journalctl -u kreditozrouti-mysql-backup.service`.

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

| Variable                 | Default                                     | Purpose                                                        |
|--------------------------|---------------------------------------------|----------------------------------------------------------------|
| `BACKUP_REMOTE`          | unset                                       | rclone remote path, e.g. `storagebox:kreditozrouti/production` |
| `BACKUP_RETENTION_DAYS`  | 14                                          | Delete dumps older than this                                   |
| `BACKUP_MIN_KEEP`        | 5                                           | Never prune below this many dumps                              |
| `BACKUP_TEXTFILE_DIR`    | `/var/lib/kreditozrouti/textfile-collector` | Where the Prometheus metrics file is written                   |
| `BACKUP_COMPOSE_PROJECT` | `kreditozrouti` / `kreditozrouti-dev`       | Compose project name passed to `-p`                            |

**Off-site is opt-in and fails loudly.** With `BACKUP_REMOTE` unset the script says on every run that the dump
exists only on this VPS. With it set but rclone missing, or the copy failing, the script exits non-zero rather
than skipping quietly, so "off-site backups are configured" and "off-site backups are happening" cannot disagree.
After copying it re-lists the file on the remote, which catches a path that silently resolves somewhere else.

**Metrics.** `mysql-backup.prom` is written atomically on every exit path, including failures:

| Metric                                                | Meaning                                   |
|-------------------------------------------------------|-------------------------------------------|
| `kreditozrouti_backup_last_success_timestamp_seconds` | Advanced only on a fully successful run   |
| `kreditozrouti_backup_last_attempt_timestamp_seconds` | Advanced on every run, successful or not  |
| `kreditozrouti_backup_last_duration_seconds`          | Wall-clock duration of the run            |
| `kreditozrouti_backup_size_bytes`                     | Size of the dump just written             |
| `kreditozrouti_backup_offsite_replicated`             | 1 if replicated off-site this run, else 0 |

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
