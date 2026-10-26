# Rollback and recovery

Use this when a release misbehaves, a container is missing after a reboot or crash, or data is lost. Ordered from least
to most severe: roll back an image set, reconcile what should be running, restore data from backup. A deploy whose health
gate fails needs none of this: the toolkit already re-applied `current`, and the run failed and alerted Discord.

## Roll back a release (GitHub)

Dispatch **Rollback** (`rollback.yml`), from any branch:

| Input         | Values (default first)                    | Meaning                                                                                      |
| ------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| `environment` | `production`, `development`, `monitoring` | What to act on                                                                               |
| `ref`         | empty                                     | Controller branch, tag or SHA whose pinned toolkit runs the operation                        |
| `operation`   | `rollback`, `activate`, `reconcile`       | Restore a saved snapshot, activate a staged one, or reconcile the current one                |
| `release_id`  | `previous`                                | `previous`, `current` or a release version such as `2026.10.25-87` (ignored for `reconcile`) |

- The standalone `ingress` target is rolled back from **Deploy Ingress** with `operation=rollback` (restores `previous`). To activate a specific snapshot, run on the VPS: `bash deployment/toolkit release activate ingress --release-id <id> --registry-config <dir>`.
- `rollback` with `previous` returns to the snapshot that was current before the last successful deploy.
- `activate` with an explicit ID applies a snapshot saved by `operation=stage` or an older deploy.
- Rollback restores the **complete** saved model: images by digest, configuration and the private runtime files it was
  staged with. It never renders today's secrets, so a rotated secret needs a new deploy, not a rollback.
- `current` re-applies the running snapshot exactly (images by digest, saved secrets).
- Images of the newest three snapshots plus `current` and `previous` stay on the host, so a rollback pulls nothing.
- Image rollback does not undo schema or data changes. Migrations are expand-only (CI rejects drops and renames in the same
  release), so `previous` accepts the current schema; for older snapshots check first, or restore data as well (below).
- Rollback needs no Host Sync and alerts Discord when it fails.
- Snapshot IDs: the Deploy run summary, or on the VPS `ls ~/kreditozrouti/versions/<environment>/`. Snapshots from before
  the toolkit snapshot format fail closed: stage a new complete release and activate it by ID.

A failed apply may have changed some containers while `current` still names the last healthy snapshot. Inspect with
`docker ps` and the diagnostic path in the run log before retrying or rolling back. Failed-command output is kept in
root-private `.operation-logs/` on the VPS; it can contain secrets, so never paste it into a ticket.

## Reconcile: bring back what should run

Reconcile brings `current` back: it starts the declared containers and recreates application containers whose image or
configuration drifted from `current` (MySQL and Redis are never recreated), then waits for health. Use it after a reboot, a
`docker rm`, or a stopped service:

```bash
# GitHub: Rollback, operation=reconcile, environment=<env>
# VPS as root: boot-time equivalent, all environments
sudo systemctl start toolkit-kreditozrouti-reconcile.service
systemctl status toolkit-kreditozrouti-reconcile.service
```

The generated `toolkit-kreditozrouti-reconcile.service` runs at boot (Host Sync enables it; a failure alerts Discord) and, when
`RECONCILE_BEFORE` is configured on a standalone server, re-applies the Cloudflare origin firewall first. A missing
`current` is skipped; a corrupt or legacy pointer fails visibly. Intentionally stopped declared services start again; to
keep one down, remove it from the Compose file and stage a new release.

## Manual release commands (VPS as deploy)

Only for recovery when Actions cannot be used. The entrypoint takes repository, environment and root from
`toolkit.conf`; run from a checkout of the revision you trust:

```bash
cd ~/kreditozrouti-checkout && git pull && bash deployment/toolkit verify
mkdir -m 700 /tmp/registry && docker --config /tmp/registry login ghcr.io          # private images need it
bash deployment/toolkit release rollback production --release-id previous --registry-config /tmp/registry
bash deployment/toolkit release activate production --release-id <saved-id> --registry-config /tmp/registry
bash deployment/toolkit release reconcile production
rm -rf /tmp/registry
```

Reference: [Toolkit commands](https://github.com/H7KZ/Toolkit/tree/main/docs/commands.md#releases).

## Restore data from backup

Backups are encrypted dumps of MySQL, the Umami database and the whole Redis RDB every four hours, kept in an Object-Locked B2 bucket.
Restore steps for every component: [Backups: restore](backups.md#restore). Order for a total loss:

1. Rebuild the host: [Fresh server](fresh-server.md).
2. Host Sync, then deploy monitoring and production (and ingress when standalone).
3. Restore MySQL, then the Umami database, then the durable Redis keys.
4. Restart `api`, `mcp` and `scraper`; check `/api/health`, run one scraper job.

Losing the MySQL volume removes the scraped course and study-plan catalog until the next InSIS crawl rebuilds it; user
schedules live in browsers. Redis restore brings back only `share:*` and `ical:*` keys. Retain all named volumes during
Docker cleanup.

## Database image or volume problems

Never replace a data container by hand. Snapshot deploys refuse to recreate MySQL or Redis when the
resolved image differs from the running one. A major-version change needs an explicit, reviewed migration:

1. Identify the exact engine and volume layout; record source and target image digests.
2. Take an encrypted logical backup and prove a scratch restore ([Backups](backups.md#drill)).
3. Run the approved procedure under the host lock:

    ```bash
    sudo bash ~/kreditozrouti-checkout/deployment/toolkit with-lock --repository kreditozrouti --environment production \
      --action maintenance --timeout 1800 --host-window -- /absolute/path/to/reviewed-procedure
    ```

4. Stage a complete new release, activate it by ID, verify the old data and Grafana access, and keep the old volume and
   images until the owner accepts the result.

PostgreSQL 18 mounts `/var/lib/postgresql` and stores the cluster in `/var/lib/postgresql/<major>/docker`. A flat cluster
from an older image needs a dump and restore, not a data-directory workaround. No migration, volume deletion or timer
activation happens as a side effect of any workflow.

## Drills

- **Rollback drill** (quarterly, and after toolkit changes): on development, Rollback with `release_id=previous`, then
  `operation=activate` back to the newer release; both green and `docker ps` shows the expected version tags.
- **Reboot drill** (after host changes): `sudo reboot`; every container of `current` comes back, `doctor` is clean.

## Verify

After any recovery: public health returns 200 (`curl -fsS https://kreditozrouti.cz/api/health`), `docker ps` shows the
expected containers healthy, `deployment/toolkit doctor` has no `fail` lines, and the next scheduled backup pings
Healthchecks.
