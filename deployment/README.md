# Snapshot deployment operations

**Deploy App** (`deploy.yml`) releases the complete application set (api, web, scraper, mcp).
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

CI sends the exact archive/checksum and `deployment/toolkit.lock` from the selected source bundle
with every deploy; rollback sends the checked-out control pin. The root-installed stable
`/usr/local/libexec/toolkit-run-bundle` validates and runs that bundle without using or activating
the host toolkit. One-time setup from this trusted checkout:

```bash
sudo bash deployment/install-toolkit.sh --ci-only --deploy-user YOUR_DEPLOY_USER
```

Manual deploy, boot reconcile, backup and retention use the independently activated host toolkit
(>=0.8.1, <1.0.0 shared lock/snapshot API). Omit `--ci-only` to install the pinned host CLI inactive;
add `--activate` only to explicitly change the administrator version. Refresh existing boot and
retention scripts through their owner installers to remove old pin equality checks. No CI deploy
changes `/opt/toolkit/current`. See [bundle installation](vendor/toolkit/README.md).
Install/activate it separately; app workflows never upgrade the host. Toolkit holds one
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

`deployment/deploy.sh` is a thin toolkit wrapper. It requires separately authorized passwordless
sudo for `/usr/local/bin/toolkit release` and `reconcile` (Infrastructure bootstrap provides this
for its deployment account). The CI-only installer authorizes the bundle runner only. From an
approved checkout, as deployment user:

```bash
bash deployment/deploy.sh deploy development \
  --archive /absolute/release.tar.gz --checksum /absolute/release.sha256 \
  --manifest /absolute/manifest.json --env-file /absolute/release.env \
  --registry-config /absolute/operation-docker-config
bash deployment/deploy.sh stage development <same-arguments>
bash deployment/deploy.sh activate development --release-id <saved-id> --registry-config /absolute/operation-docker-config
bash deployment/deploy.sh rollback production --release-id previous --registry-config /absolute/operation-docker-config
bash deployment/deploy.sh reconcile development
```

Create isolated registry config with `umask 077`; use `docker --config <dir> login` before sudo,
then remove that operation's directory after the synchronous command. **Restore Release** (`rollback.yml`) accepts any controller `ref`, `environment` (including monitoring),
`operation=rollback|activate|reconcile`, and `release_id=previous|current|<saved-id>` (ignored for reconcile).
It transfers fresh auth
only and restores the complete saved model/env/runtime; it never renders current application
secrets. Legacy directories without snapshot metadata fail closed: stage/deploy a new complete
snapshot, then select it explicitly. Image rollback does not undo schema/data changes.

## Monitoring and recovery

**Deploy Monitoring** (`deploy-monitoring.yml`) accepts any `ref` and `operation=deploy|stage` through
the identical reusable transport/controller. **Verify** accepts a manual `ref` for full verification.
**Verify Backups** accepts `ref` and `check=freshness|drill|both`; its inventory remains production
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

The root-owned boot unit runs `boot-recovery/reconcile.sh` as root with the installed deployment
account and home passed explicitly; no deployment-account sudo rule is needed for boot recovery.
It synchronously calls `toolkit reconcile` for production, development and monitoring separately.
Toolkit validates snapshots and uses
`up -d --no-recreate --pull never --no-build`. Missing pointer is a no-op; legacy/corrupt pointer
fails visibly. Removed containers can be restored from cached images; intentionally stopped
declared services restart. Install the root-owned script/pin/unit with
`sudo bash deployment/boot-recovery/install.sh --user <deploy-user>`, then manually reconcile
before separately enabling the unit. Installers do not enable units/timers.

## Umami retention

The scheduled GitHub workflow is removed. Install the disabled host timer/service with
`sudo bash deployment/monitoring/umami/install.sh --user <deploy-user>`.
The service holds the repository lock and runs a root-only worker that checks snapshot identity
and SQL inventory, reading database credentials inside the existing container.
Direct `bash deployment/monitoring/umami/retain.sh` always acquires the same repository lock.
Run the installed service manually and inspect results before an owner separately enables
`kreditozrouti-umami-retention.timer`. Until then automatic retention is inactive.

No host deployment, migration, timer activation or recovery rehearsal is implied by repository
checks. Verify the CI runner, sudoers, environment secrets, data compatibility and public health
before the first owner-authorized deployment. Zero downtime/capacity/live rollout gates remain
open; snapshot health alone does not prove business behavior or uninterrupted availability.
