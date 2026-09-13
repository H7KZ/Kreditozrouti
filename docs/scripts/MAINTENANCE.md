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

- Before wiping the target database, takes its own one-off timestamped gzip dump to `~/backups/db-clones/` as a
  rollback safety net (independent of the removed automated MySQL backup system).
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
