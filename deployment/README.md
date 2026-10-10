# Snapshot deployment operations

`deploy-all.yml` verifies/builds on GitHub-hosted runners. Pushes to `main` deploy the complete
application set (api, web, scraper, mcp) to development through one reusable environment job.
Production dispatch from `main` takes `environment=production` and `development_run_id`.
It requires a successful main development run, matching workflow/run attempt/source commit,
main ancestry, the exact artifact checksum and every application digest. No production rebuild
or subset promotion is supported. The qualified artifact expires after 90 days.

Development always builds the complete set.

## Transport and snapshots

`_deploy-service.yml` is a full environment job despite its retained filename. It checks out
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

The host toolkit must exactly match `deployment/toolkit.lock` and support snapshot API >=0.8.1.
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

`deployment/deploy.sh` is a thin toolkit wrapper. From an approved checkout, as deployment user:

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
then remove that operation's directory after the synchronous command. Rollback workflow takes
`release_id=previous|<saved-id>` and `environment`, including monitoring. It transfers fresh auth
only and restores the complete saved model/env/runtime; it never renders current application
secrets. Legacy directories without snapshot metadata fail closed: stage/deploy a new complete
snapshot, then select it explicitly. Image rollback does not undo schema/data changes.

## Monitoring and recovery

Manual `deploy-monitoring.yml` uses the identical reusable transport/controller.
`monitoring/prepare.sh` writes webhook files through `monitoring/.secrets` into private runtime,
and writes derived Docker socket GID/Grafana password to `TOOLKIT_RUNTIME_DIR/extra.env`.
`monitoring/post-deploy.sh` uses exported saved values for internal readiness and Grafana grants;
it never rewrites the frozen source/runtime inventory. Monitoring health is checked inside the
Docker network; development qualification still requires three public HTTPS observations.

`boot-recovery/reconcile.sh` synchronously calls `toolkit reconcile` for production, development
and monitoring separately. Toolkit validates snapshots and uses
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
checks. Verify host toolkit, sudoers, environment secrets, data compatibility and public health
before the first owner-authorized deployment. Zero downtime/capacity/live rollout gates remain
open; snapshot health alone does not prove business behavior or uninterrupted availability.
