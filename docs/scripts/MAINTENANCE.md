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

### Recommended cron

Weekly, Sunday at 3 AM:

```
0 3 * * 0 sudo /opt/scripts/maintenance.sh --auto-reboot --docker-cleanup >> /var/log/cron-maintenance.log 2>&1
```

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
| `-v, --verbose`           | Show individual item names                                        |

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

## `clone-db.sh`

Clones the MySQL database between the `dev` and `prod` Docker Compose stacks on the same VPS. Use this to seed an
environment from the other's already-scraped InSIS data without triggering a full re-scrape.

```bash
sudo ./scripts/clone-db.sh <dev-to-prod|prod-to-dev>
```

| Argument        | Description                                      |
|-----------------|--------------------------------------------------|
| `dev-to-prod`   | Copy the dev database into the prod database     |
| `prod-to-dev`   | Copy the prod database into the dev database     |

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
