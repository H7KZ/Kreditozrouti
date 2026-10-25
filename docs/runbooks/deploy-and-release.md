# Deploy and release

Use this to ship code to the VPS, to stage a release without activating it, or to understand what each workflow does.
Everything runs from the GitHub **Actions** tab (runs on GitHub-hosted runners, connects by SSH). A first deployment on a
clean server starts at [Fresh server](fresh-server.md). Undoing a release: [Rollback and recovery](rollback-and-recovery.md).

## Workflows

| Workflow         | File                                       | Trigger                                      | Does                                                                                                    |
| ---------------- | ------------------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Verify Code      | `verify.yml`                               | pull request, manual, call                   | Lint, boundaries, tests, type-check, builds, migration lint, plus toolkit pin                           |
| Deploy           | `deploy.yml`                               | push to `main`, manual                       | Resolve source and images, verify, build, Host Sync, deploy a complete app environment                  |
| Host Sync        | `host-sync.yml`                            | push to `main` (toolkit files), manual, call | Install the pinned toolkit, units and `/etc/toolkit/kreditozrouti.env` on the VPS ([below](#host-sync)) |
| Deploy Ingress   | `deploy-ingress.yml`                       | manual                                       | Deploy this repository's own Traefik. **Standalone servers only**                                       |
| Rollback         | `rollback.yml`                             | manual                                       | Restore, activate or reconcile a saved snapshot of any environment                                      |
| Backup Verify    | `backup-verify.yml`                        | daily and weekly, manual                     | Off-VPS proof that backups are fresh and restore                                                        |
| Cleanup Registry | `registry-cleanup.yml`                     | weekly, manual (dry run)                     | Prune old GHCR image versions; digests retained on the VPS are protected                                |
| (reusable)       | `_build.yml`, `_deploy.yml`, `_verify.yml` | `workflow_call`                              | One image build; one complete environment deploy; the verification steps                                |

Each deploying workflow runs `bash deployment/toolkit verify` before it opens an SSH connection, and deploys of one
environment queue behind each other (`deploy-<environment>` concurrency group, never cancelled). Deploy, Host Sync and
Rollback post to `ALERT_DISCORD_WEBHOOK_URL` when they fail.

Environments (GitHub Environments and toolkit release targets): `production`, `development`, `ingress`.
Compose projects: `kreditozrouti`, `kreditozrouti-dev`, and `global` for ingress. Monitoring (Grafana, Prometheus, Loki,
Alloy, Alertmanager, Umami) is the host's shared stack, deployed from Infrastructure: [Monitoring](../architecture/MONITORING.md).

## Deploy the app

Pushing to `main` verifies, builds and deploys a complete **development** release automatically, then runs three
consecutive public HTTPS health observations from the VPS and publishes a development qualification manifest.
Production is never automatic.

Dispatch **Deploy** (`deploy.yml`) for anything else:

| Input         | Values (default first)                  | Meaning                                                                                                                |
| ------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `environment` | `development`, `production`             | What to deploy                                                                                                         |
| `ref`         | empty                                   | Branch, tag or SHA. Empty = the workflow ref (promote mode: the latest qualified release). Resolved once to a full SHA |
| `operation`   | `deploy`, `stage`                       | `deploy` activates after health; `stage` saves an immutable snapshot without applying it                               |
| `mode`        | `reuse`, `build`, `existing`, `promote` | Where images come from (below)                                                                                         |
| `image_tag`   | empty                                   | `reuse` and `existing` only: tag to look up (default `<environment>-<sourceSHA>`)                                      |
| `run_id`      | empty                                   | `promote` only: exact successful development run (empty = latest qualifying run)                                       |
| `digests`     | empty                                   | `existing` only: complete JSON map of `api`, `web`, `scraper`, `mcp` to `sha256:` digests, instead of a tag            |
| `verify`      | `true`                                  | Run the full verification on the selected source first. Pushes always verify                                           |
| `no_cache`    | `false`                                 | Disable the Docker build cache                                                                                         |

### Modes

- `reuse` - use existing images tagged for that source, build only the missing ones.
- `build` - rebuild all four images.
- `existing` - every image must already exist (by tag or by `digests`); nothing is built.
- `promote` - redeploy the exact digests of a qualified development release. A qualification is the artifact published by
  a successful development deploy; it names the source commit and all four digests, which must be used together.
  With an empty `ref` it takes the latest qualified source across all branches; with a `ref` it needs a qualification for
  that source. Artifacts expire after 90 days; staging never publishes one.

Production build, reuse and existing runs need no qualification: manual dispatch accepts any source ref for either
environment. `promote` is the way to ship exactly what was tested.

Typical flows:

```text
Merge to main                       -> development deploys itself
Production = what development ran  -> Deploy: environment=production, mode=promote
Production from a hotfix branch    -> Deploy: environment=production, ref=<branch>, mode=reuse
Test a branch on development       -> Deploy: environment=development, ref=<branch>
Prepare, switch later              -> Deploy: operation=stage, then Rollback: operation=activate, release_id=<id>
```

### Stage and activate

`operation=stage` verifies the source, pins every image to a digest and saves the snapshot under its release version
without touching running containers. Activate it later with **Rollback**
(`operation=activate`, that `release_id`). The release ID is printed in the run summary. Staging never counts as a
qualification.

## Host Sync

`host-sync.yml` keeps the VPS in line with this repository's toolkit integration: it packs the pinned toolkit, `toolkit.conf`
and `deployment/backup/`, renders `/etc/toolkit/kreditozrouti.env` from GitHub secrets (`BACKUP_BUCKET` variable,
`BACKUP_B2_KEY_ID`, `BACKUP_B2_KEY`, `BACKUP_AGE_RECIPIENT`, `HC_PING_KEY`, `ALERT_DISCORD_WEBHOOK_URL`) and runs
`deployment/toolkit install --env-file` on the host, then `doctor`. Install refreshes `/opt/toolkit/kreditozrouti`, enables
the declared units (boot reconcile, backup timer after one successful backup) and removes undeclared ones. It runs as the
first job of every Deploy, on every push to `main` that touches the pin, `toolkit.conf` or `deployment/backup/`, and by hand
(`gh workflow run host-sync.yml`). The toolkit refuses a deploy on an unsynced host (`host is not synced`); rollback never
needs it.

## Deploy ingress (standalone servers only)

Dispatch **Deploy Ingress** with `ref` and `operation`. It deploys [`deployment/ingress/`](../../deployment/ingress/):
Traefik, a read-only Docker socket proxy and CrowdSec under compose project `global`, owning `public-network` and
ports 80/443. **Never run it on a host where Infrastructure's Traefik runs.** Choosing the mode: [Fresh server](fresh-server.md#0-choose-the-ingress-mode).
Dashboard credentials and the CrowdSec bouncer key are rendered at staging into private runtime files, never into the
source archive.

## Transport and snapshots

`_deploy.yml` checks out the selected source, renders the environment's dotenv from GitHub secrets
(`deployment/render-env.sh`), packages the deployment directory (`deployment/package-release.py`), uploads it with a
private registry login to `~/kreditozrouti/incoming/<environment>/<run>-<attempt>/` and runs the **deployed revision's**
pinned `deployment/toolkit` on the VPS. Each run removes only its own incoming directory; look for leftovers after
interrupted runs. Toolkit holds one repository lock for all environments, backups and jobs, saves immutable snapshots
under `~/kreditozrouti/versions/<environment>/`, and moves `current` and `previous` only after health. Mechanics:
[Toolkit consumer guide](https://github.com/H7KZ/Toolkit/tree/main/docs/consumers.md) and the
[release contract](https://github.com/H7KZ/Toolkit/tree/main/toolkit/contracts/deployment-release-v1.md).

Facts specific to this repository:

- Compose files per environment are `deployment/<environment>/networks.yml`, `volumes.yml` and
  `docker-compose.<environment>.yml`. Only that directory and `toolkit.lock` enter the archive.
- Application images must be complete: all four digests, always together. Third-party images are pinned to digests at
  staging. A changed MySQL, Redis or PostgreSQL image fails the deploy until a reviewed data upgrade
  ([Troubleshooting](troubleshooting.md#a-deploy-fails-on-a-data-image-mismatch)).
- Dotenv values are literal single-quoted: `$`, `#` and backticks stay literal. A single quote, control character or
  trailing backslash in any secret fails the deploy without printing it.
- Health: production and development need three consecutive `2xx` from `/`, `/api/health` and `/mcp/health`, probed
  through the host's own Traefik (`127.0.0.1:443` with the real hostname), so a release qualifies before DNS points at the
  host. The api container's healthcheck is `/ready` (MySQL and Redis). When the gate fails the toolkit re-applies `current`
  and the run fails with `rolled back automatically`. Ingress is checked on the host by its post-deploy hook.
- `web` runs two replicas, replaced start-first; the other services are single.
- Images of the newest three snapshots plus `current` and `previous` stay on the host; a rollback pulls nothing.
- Migrations are expand-only: `scripts/migration-lint.mjs` (CI) rejects a new migration that drops, renames or modifies.
  A production deploy over a running release takes a backup first.

## Images and tags

`_build.yml` pushes each service to `ghcr.io/<owner>/<repo>/<service>` tagged with the **release version** (CalVer
`YYYY.MM.DD-<run number>`, also `APP_VERSION` and the OCI version label), the full SHA, an `<environment>-<fullSHA>` tag and a
floating `latest` (production) or `dev-latest`. Deploys reference `name:version@sha256:digest`: `docker ps` shows the version,
Docker resolves the digest. The version is also the release ID (a rerun attempt appends `.<attempt>`); a promotion keeps the
version of the development build, so promoting the same build twice is refused (`release ID already exists`): activate it
with Rollback instead. Builds run on GitHub-hosted runners (the VPS is too small to build) and use the GitHub token only.

**Cleanup Registry** keeps the newest `keep_newest` (6) tagged versions, anything younger than `min_age_days` (7), floating
tags and untagged manifests, every digest in `protected_digests`, and every digest a snapshot retained on the VPS
references (read over SSH; if that read fails nothing is deleted). Scheduled runs delete; a manual run is a dry run unless
`dry_run` is unticked.

## Verify

After any deploy:

```bash
curl -fsS https://kreditozrouti.cz/api/health     # local
curl -fsS https://kreditozrouti.cz/mcp/health
docker ps --filter label=com.docker.compose.project=kreditozrouti   # VPS as deploy
ls -l ~/kreditozrouti/versions/production/current                    # points at the new release, e.g. 2026.10.25-87
```

The run summary of **Deploy** names the snapshot. For development the publish job must also be green; that is the
qualification a later `promote` needs.
