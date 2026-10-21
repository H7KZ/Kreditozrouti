# Snapshot deployment operations

**Deploy** (`deploy.yml`) releases the complete application set (api, web, scraper, mcp).
Pushes to `main` always verify and build development. Manual runs accept any source branch, tag
or SHA for either target; `ref` defaults to the selected workflow ref and resolves once to a full SHA.
Verification and builds use that selected source. The controller comes from the dispatch ref.

| Input         | Behavior                                                                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `environment` | `development` (default) or `production`                                                                                                       |
| `mode`        | `build` rebuilds all; `reuse` (default) builds missing images; `existing` requires every image; `promote` restores every qualified app digest |
| `image_tag`   | `reuse`/`existing` lookup tag; default `<environment>-<sourceSHA>`                                                                            |
| `digests`     | `existing` only: complete JSON map of all four service names to `sha256:` digests, instead of `image_tag`                                     |
| `run_id`      | `promote` only: exact successful development run; empty discovers the latest matching published release across all branches/pages             |
| `verify`      | Manual verification switch, default true; automatic pushes always verify                                                                      |
| `no_cache`    | Disable cache for build/reuse builds, default false                                                                                           |
| `operation`   | `deploy` (default) activates after health; `stage` saves the immutable snapshot without applying it                                           |

Promotion with a nonempty `ref` selects only a qualification for that resolved source. Empty `ref`
selects the latest qualified source, independently of the dispatch branch. Promotion validates the
artifact archive checksum, canonical manifest, repository/workflow/run/attempt, source and complete
app digest set; it does not require main ancestry. Production build/reuse/existing runs need no development
qualification. Only successful development deployments publish qualifications; staging never does.
Artifacts expire after 90 days. Use `image_tag` for legacy SHA tags; new default lookup tags separate targets.

## Transport and snapshots

`_deploy.yml` is a reusable full environment job; `_build.yml` builds one image. Deployment checks out
the selected source bundle, renders app values using `render-env.sh`, packages deployment
contents at archive root with `package-release.py`, and uploads archive/checksum/manifest,
private dotenv and isolated registry auth to `~/kreditozrouti/incoming/<environment>/<run>-<attempt>/`.
SSH/SCP actions are SHA-pinned and require `SSH_HOST_FINGERPRINT`. The incoming leaf must be
new; uploads never target an existing release/current. Each operation removes only its own
incoming credentials. Inspect abandoned incoming directories after interrupted jobs.

Use GitHub Environments `production`, `development`, and `monitoring`; configure each target's
SSH credentials/fingerprint and relevant application or monitoring secrets before dispatch.
The renderer's workflow environment mapping is the configuration inventory. `PROJECT` must
differ between app environments (`prod`/`dev` recommended); Compose projects are `kreditozrouti`,
`kreditozrouti-dev`, and `kreditozrouti-monitoring`.
Dotenv values use literal single quotes: dollar signs, hashes and backticks stay literal.
Single quotes, control characters and trailing backslashes fail without printing values.

This repository runs only its pinned toolkit; it never calls a toolkit installed on the server. The managed files
are `deployment/toolkit` (entrypoint), `deployment/toolkit.lock` and `deployment/vendor/toolkit/`; hand edits fail
`bash deployment/toolkit verify`. Repin with `npm run vendor -- ../Kreditozrouti` in a
[Toolkit](https://github.com/H7KZ/Toolkit/tree/main/docs/consumers.md) checkout, then commit the result here.
Everything the toolkit does for this repository is declared in [`toolkit.conf`](toolkit.conf): the release targets
(`production`, `development`, `monitoring` under `~/kreditozrouti/versions/`), the backup component list and
schedules, and the `umami-retention` job. `toolkit install` turns that file into the boot-recovery, backup and job
units; no unit file or installer lives in this repository.

CI ships the selected source's `deployment/toolkit`, `toolkit.conf`, `toolkit.lock` and `vendor/toolkit/` with every
deploy (rollback ships the checked-out control pin) and runs them on the VPS as the deploy user:

```bash
bash "$incoming/deployment/toolkit" release deploy production --archive ... --checksum ... --manifest ... --env-file ...
```

The entrypoint verifies the pin and, as a non-root user, runs the pinned archive through the root-owned loader
`/usr/local/libexec/toolkit-run-bundle` (the deploy user's only sudo permission). One-time setup from a trusted
checkout on the VPS, rerun after each pin change:

```bash
sudo deployment/toolkit install --deploy-user YOUR_DEPLOY_USER
```

Guides: [consumers](https://github.com/H7KZ/Toolkit/tree/main/docs/consumers.md),
[host](https://github.com/H7KZ/Toolkit/tree/main/docs/host.md),
[commands](https://github.com/H7KZ/Toolkit/tree/main/docs/commands.md). See also [bundle installation](vendor/toolkit/README.md).

App workflows never change the host. Toolkit holds one
repository-wide lock for all environments, monitoring, backups and retention, opening the host
window only for Compose changes/health. Apps require Infrastructure's existing `public-network`.
Toolkit creates missing owned networks/volumes and resolves ALL service images, including
inactive profiles, to immutable digests. Existing MySQL/Redis/Umami database image mismatch
requires an explicit data upgrade. No automatic data container replacement occurs.

Release IDs are `<full-source-SHA>-<deploy-run>-<attempt>`. Toolkit saves immutable source,
`.toolkit-release.json`, `.toolkit-inventory.json`, `compose.resolved.json`, image evidence and
private `.runtime/<id>/` env/config. After health, it advances `current`/`previous`. Failed apply
may have changed containers while `current` still names the last healthy snapshot: inspect
before retry/rollback. Root-private `.operation-logs` retain diagnostics; never publish secret logs.
Registry/release cleanup is deferred until live, rollback and retained-backup references are
protected. Keep snapshot runtime and registry digests for recovery; age alone is insufficient.

## Manual commands and rollback

From an approved checkout on the VPS, as the deployment user (the entrypoint fills repository, environment, root and
user from `toolkit.conf`):

```bash
bash deployment/toolkit release deploy development \
  --archive /absolute/release.tar.gz --checksum /absolute/release.sha256 \
  --manifest /absolute/manifest.json --env-file /absolute/release.env \
  --registry-config /absolute/operation-docker-config
bash deployment/toolkit release stage development <same-arguments>
bash deployment/toolkit release activate development --release-id <saved-id> --registry-config /absolute/operation-docker-config
bash deployment/toolkit release rollback production --release-id previous --registry-config /absolute/operation-docker-config
bash deployment/toolkit release reconcile development
```

Create isolated registry config with `umask 077`; use `docker --config <dir> login` before sudo,
then remove that operation's directory after the synchronous command. **Rollback** (`rollback.yml`) accepts any controller `ref`, `environment` (including monitoring),
`operation=rollback|activate|reconcile`, and `release_id=previous|current|<saved-id>` (ignored for reconcile).
It transfers fresh auth
only and restores the complete saved model/env/runtime; it never renders current application
secrets. Legacy directories without snapshot metadata fail closed: stage/deploy a new complete
snapshot, then select it explicitly. Image rollback does not undo schema/data changes.

## Monitoring and recovery

**Deploy Monitoring** (`deploy-monitoring.yml`) accepts any `ref` and `operation=deploy|stage` through
the identical reusable transport/controller. **Verify** accepts a manual `ref` for full verification.
**Backup Verify** (`backup-verify.yml`) accepts `ref` and `check=freshness|drill|both`; its inventory remains production
MySQL/Redis plus monitoring Umami, rather than an application environment selector.
**Cleanup Registry** accepts `dry_run`, complete `protected_digests`, `keep_newest` (6), `min_age_days` (7)
and optional comma/space separated service names in `packages`. It preserves untagged versions,
protected tags/digests and young images; scheduled runs always simulate deletion. Supply every live,
previous and retained recovery digest before enabling deletion. Deploy/restore/stage requests share
one queued concurrency group per target.
`monitoring/prepare.sh` writes webhook files through `monitoring/.secrets` into private runtime,
and writes derived Docker socket GID/Grafana password to `TOOLKIT_RUNTIME_DIR/extra.env`.
`monitoring/post-deploy.sh` uses exported saved values for internal readiness and Grafana grants;
it never rewrites the frozen source/runtime inventory. Monitoring health is checked inside the
Docker network; development qualification still requires three public HTTPS observations.
Public health requests identify as `toolkit-public-health/1`; edge rules must allow this agent
for the configured health URLs. Toolkit 0.9.3 avoids the default Python agent blocked at the edge.
The final workflow observations run over the pinned SSH connection from the deployment host,
against the public HTTPS URLs. GitHub-hosted runner traffic is rejected by the edge; these
observations verify the public route from the host, not reachability from every client network.

The generated `toolkit-kreditozrouti-reconcile.service` runs at boot as root and calls `toolkit reconcile` for
production, development and monitoring separately (no deployment-account sudo rule needed). Toolkit validates
snapshots and uses `up -d --no-recreate --pull never --no-build`. Missing pointer is a no-op; legacy/corrupt pointer
fails visibly. Removed containers can be restored from cached images; intentionally stopped declared services
restart. After `toolkit install`, run `sudo systemctl start toolkit-kreditozrouti-reconcile.service` manually,
then separately `systemctl enable` it. Install never enables units/timers.

## Umami retention

The scheduled GitHub workflow is removed. The `umami-retention` job in `toolkit.conf` runs
[`monitoring/umami/retain.sh`](monitoring/umami/retain.sh) daily at 03:17 UTC as root under the
`kreditozrouti`/`monitoring` repository lock. The script checks snapshot identity and SQL inventory, then reads
database credentials inside the existing container. Run it by hand, as the deploy user, with
`deployment/toolkit job umami-retention`, and inspect the result before an owner separately enables
`toolkit-kreditozrouti-umami-retention.timer`. Until then automatic retention is inactive.

## Backups

Component list, schedules, restore steps and drill: [backup/README.md](backup/README.md). The daily and weekly
off-host verification is **Backup Verify**; it runs the pinned toolkit on a GitHub runner.

## Migrating a VPS to toolkit 0.11

Once, after this repository's 0.11 pin is merged and pulled on the VPS. Run from a checkout of this repository:

```bash
deployment/toolkit doctor                      # lists what is legacy
# 1. Disable and remove the legacy units this repository installed before 0.11
sudo systemctl disable --now kreditozrouti-reconcile.service kreditozrouti-umami-retention.timer \
  toolkit-backup@kreditozrouti-4h.timer toolkit-backup@kreditozrouti-daily.timer
sudo rm -f /etc/systemd/system/kreditozrouti-reconcile.service \
  /etc/systemd/system/kreditozrouti-umami-retention.service /etc/systemd/system/kreditozrouti-umami-retention.timer \
  /etc/systemd/system/toolkit-backup@kreditozrouti-4h.timer /etc/systemd/system/toolkit-backup@kreditozrouti-daily.timer
sudo rm -rf /usr/local/libexec/kreditozrouti-reconcile /usr/local/libexec/kreditozrouti-umami-retention \
  /usr/local/libexec/kreditozrouti-backup
sudo systemctl daemon-reload
# 2. Move the backup settings and drop BACKUP_COMPONENTS_FILE from them (now from toolkit.conf)
sudo mv /etc/toolkit/backup/kreditozrouti.env /etc/toolkit/kreditozrouti.env
sudoedit /etc/toolkit/kreditozrouti.env
# 3. Install the pinned toolkit, then enable the generated units
sudo deployment/toolkit install --deploy-user deploy
sudo systemctl enable toolkit-kreditozrouti-reconcile.service
sudo deployment/toolkit backup run daily && sudo deployment/toolkit backup list
sudo systemctl enable --now toolkit-kreditozrouti-backup@4h.timer toolkit-kreditozrouti-backup@daily.timer
deployment/toolkit job umami-retention         # once by hand, then:
sudo systemctl enable --now toolkit-kreditozrouti-umami-retention.timer
deployment/toolkit doctor
```

The shared template `toolkit-backup@.service` and the old host CLI (`/usr/local/bin/toolkit`, `/opt/toolkit/current`)
go away only when every repository on the host is migrated; see the
[Toolkit host guide](https://github.com/H7KZ/Toolkit/tree/main/docs/host.md#migrating-a-host-from-010-or-older).
Deploy workflows need only the loader that `toolkit install` places, so run it before the first deploy of this pin.

No host deployment, migration, timer activation or recovery rehearsal is implied by repository
checks. Verify the CI runner, sudoers, environment secrets, data compatibility and public health
before the first owner-authorized deployment. Zero downtime/capacity/live rollout gates remain
open; snapshot health alone does not prove business behavior or uninterrupted availability.
