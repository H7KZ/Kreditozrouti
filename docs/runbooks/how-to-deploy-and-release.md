# How to deploy and release

How code gets from `develop` to the VPS, which parts are automatic, which need a person, and how this repo relates to the host repos. Read this before the first production deploy or when a deploy behaves oddly.

Last verified: 2026-10-10 (repository state on `develop` at `bf21b5d4`; development deploys run on `main` only; production not yet deployed).

## End state

- `main` is the only branch that deploys.
- Every push to `main` is verified, built and deployed to **development** automatically.
- **Production** changes only when a person dispatches `deploy-all.yml` with a development run that already passed.
- **Rollback** is a manual dispatch of `rollback.yml`.
- Every deployed version lives under `~/kreditozrouti/versions/<environment>/`, and `current` points at the live one.
- The host survives a reboot without a deploy, via `kreditozrouti-reconcile.service`.

## The repositories on the VPS

| Repo                                   | Owns                                                                                                                     | Notes                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `Infrastructure` (`../Infrastructure`) | The VPS as a whole: shared Traefik, CrowdSec, origin firewall, `public-network`, the toolkit CLI                         | Must be deployed before any app. Apps join its network.             |
| `Ohlidame` (`../Ohlidame`)             | The `ohlidame` (production) and `ohlidame-dev` (development) Compose projects, backups, boot recovery                    | Same shape as this repo, separate stack. Pins its own toolkit copy. |
| `Kreditozrouti` (this repo)            | The `kreditozrouti` (production) and `kreditozrouti-dev` (development) Compose projects, backups scaffold, boot recovery | Pins a copy of the toolkit. Never upgrades the host toolkit itself. |

The apps share a host, so they share:

- `public-network`: app web containers join it. Traefik routes by hostname. Traefik is **not** deployed by this repo; `deployment/AGENTS.md` records that boundary.
- The toolkit and its locks: deploys, rollbacks, backup capture, monitoring deploys and reconcile all run under `toolkit with-lock`.
- Nothing else. Database networks and volumes are per project. Names are fixed by Infrastructure's `docs/NAMING.md`; renaming a populated volume needs a migration first.

## The toolkit

- Shared host plumbing: locks, pinned install, Docker log limits, firewall inventory.
- Current version **0.6.3**. Source and build live in `Infrastructure/toolkit/`. Releases are `toolkit-X.Y.Z.tar.gz` plus `.sha256`.
- This repo pins it in `deployment/toolkit.lock` (`TOOLKIT_VERSION`, `TOOLKIT_SOURCE_COMMIT`, `TOOLKIT_ARCHIVE_SHA256`). The tarballs are vendored in `deployment/vendor/toolkit/` (0.2.2 through 0.6.3 are kept; only the locked one is used).
- On the host, `/usr/local/bin/toolkit` points at the active version. Install puts a version in `/opt/toolkit/releases/<version>/` inactive. `toolkit activate <version>` switches it. Copying files changes nothing.
- Locks: `/run/lock/toolkit/host.lock` (host-wide), plus one per repo and environment. Take the host lock first.
- Contracts (`toolkit/contracts/*.schema.json`) define shared formats. Changing one needs a toolkit bump and a repin in every consumer.

Pin checks that must pass:

```bash
bash deployment/verify-toolkit-pin.sh      # lock matches the vendored tarball (CI and every deploy run it)
toolkit version                            # on the VPS: must equal TOOLKIT_VERSION in the lock
```

`_deploy-service.yml` refuses to deploy when the host's `toolkit version` differs from the lock. The host install must be done by a person before the first deploy.

### Repinning the toolkit

1. Take the new release tarball and `.sha256` from `Infrastructure/toolkit/` and copy both into `deployment/vendor/toolkit/`.
2. Update `deployment/toolkit.lock` with the new version, source commit and archive SHA-256. Use the values the release publishes; do not copy them from another repo without checking.
3. Run `bash deployment/verify-toolkit-pin.sh`.
4. Commit as `chore(deploy): pin toolkit X.Y.Z`. The deploy then fails until the host runs the same version.
5. On the VPS, install and activate under the locks:

```bash
sudo bash deployment/install-toolkit.sh
sudo /opt/toolkit/releases/<version>/bin/toolkit activate <version>
toolkit version
```

## How a deploy runs

1. **Verify.** `_verify.yml` runs on GitHub-hosted runners: em-dash check, shellcheck (`-x -P SCRIPTDIR`), Prettier `format:check`, monitoring config validation (promtool, amtool, loki, alloy), then `make verify` (lint, boundaries, tests, type-check, build). On pull requests only affected packages run; `deploy-all.yml` always runs the full suite.
2. **Validate.** `deploy-all.yml` validates the dispatch inputs. For production it also checks the development run and its manifest (see below).
3. **Build.** `_build-service.yml` builds `api`, `web`, `scraper` and `mcp` images from the exact commit and pushes them to GHCR, pinned by digest.
4. **Ship.** `_deploy-service.yml` checks the toolkit pin, copies `deployment/` to `~/kreditozrouti/versions/<environment>/<release-id>/` over SSH (pinned host fingerprint), writes that environment's `.env` from GitHub Environment secrets, and runs `deploy.sh` under `toolkit with-lock`.
5. **Switch.** `deploy.sh` pulls the pinned digests, starts Compose, waits for health, then repoints `current`. The previous release stays for rollback. Old release directories older than 14 days are removed, keeping at least five.
6. **Qualify (development only).** Six rounds at most, 10 seconds apart, of 2xx checks on `/api/health`, `/mcp/health` and `/` against the development domain. Three consecutive healthy rounds publish a `qualified-development-release` artifact with the digests and the commit. The workflow notes that business smoke tests and zero-downtime checks are not covered by this gate.

Development deploy: automatic on push to `main`, or manual dispatch of `deploy-all.yml` with `environment=development`.

Production deploy: manual dispatch of `deploy-all.yml` from `main` with:

- `environment=production`
- `development_run_id=<successful development run on main>`
- `skip_build=true` (production uses the qualified run's digests; it never rebuilds)

The workflow then requires that the development run completed successfully, was on `main`, came from `deploy-all.yml`, and has a valid manifest whose commit is an ancestor of `origin/main`.

Rollback: dispatch `rollback.yml` with a release ID (`<commit>-<development-run-id>-<attempt>`) or a full commit SHA, the service, and the environment.

## Why deploys run in GitHub Actions

- **Reproducible.** The image is built from the commit that passed verification, pinned by digest. A laptop can't drift from `main`.
- **Gated.** Verify must pass before any build, and production requires a passed development run from `main` ancestry.
- **Secrets stay out of the repo.** Each GitHub Environment holds its own secrets. The host `.env` is written at deploy time.
- **No shell on the VPS needed.** The runner connects over SSH with a pinned host fingerprint.
- **Audit trail.** Every deploy is a run with an author, inputs and logs.

## Should deploys be manual?

- Development: automatic on `main`. Keep. It is a test environment and easy to redeploy.
- Production: manual dispatch. Keep. It is user-facing.
- Rollback: manual. Keep.

**Gap:** the GitHub `production` environment has no protection rules (checked 2026-10-10 with `gh api repos/H7KZ/Kreditozrouti/environments/production`). Anyone with write access can dispatch a production deploy or a production rollback. Adding a required reviewer to `production` (and to `rollback` runs, which also target that environment) turns "manual" into an enforced rule. This is a repository settings change and needs the owner's go-ahead.

## Monitoring and scheduled jobs

- `deploy-monitoring.yml`: manual dispatch. Uploads the whole `deployment/` tree to `~/kreditozrouti/versions/monitoring/<sha>/`, runs `monitoring/deploy.sh` under `toolkit with-lock`, then repoints `versions/monitoring/current`.
- Alerts are Prometheus and Loki rule files with promtool unit tests. Run `bash deployment/monitoring/validate.sh` after any rule change.
- `umami-retention.yml`: daily at 03:17 UTC, plus manual dispatch. Runs the Umami retention SQL on the VPS under the toolkit lock.

## Boot recovery

`kreditozrouti-reconcile.service` runs after Docker starts. It starts stopped containers from `versions/{production,development,monitoring}/current` that declare a restart policy, waiting on MySQL and Redis health. It never pulls, builds, recreates or removes. The installer validates the deploy user and copies the script root-owned to `/usr/local/libexec/kreditozrouti-reconcile/`. Re-run the installer after changing `reconcile.sh`.

```bash
sudo bash deployment/boot-recovery/install.sh --user <deploy-user>
systemctl status kreditozrouti-reconcile
```

Unlike Infrastructure, this repo's deploy workflow does not check that the unit is enabled. Check it by hand before the first deploy.

## Backups

- The backup scaffold is in `deployment/backups/`. It captures MySQL, the Umami PostgreSQL database, and only Redis `share:*` and `ical:*` records, with their original absolute expiry.
- Production only, as decided in the cross-repository backup research (`Infrastructure/docs/research/2026-10-cross-repository-backups.md`).
- **Not enabled.** `deployment/backups/README.md` states that no systemd timer or scheduled workflow is installed by the change. Do not enable it until the host toolkit is installed, Object Lock and off-site credentials are configured, Discord and Healthchecks alerts are set up, and an isolated restore has been rehearsed.
- Recovery images come from the registry by digest. Docker images are not archived.

## Checklist before the first production deploy

- [ ] Toolkit `0.6.3` installed and activated on the VPS; `toolkit version` matches `deployment/toolkit.lock`.
- [ ] `kreditozrouti-reconcile.service` installed and enabled.
- [ ] Infrastructure deployed first: `traefik` running and `public-network` exists.
- [ ] `production` GitHub Environment has its secrets and variables, and required reviewers are set (see the gap above).
- [ ] Named MySQL and Redis volumes created on the host (commands in `deployment/AGENTS.md`).
- [ ] A successful development run on `main` that published a qualified release.
- [ ] Backup decision recorded. Production currently has no enabled backup timer.

## Known limits

- Nothing in this repo has been verified on the real VPS. Toolkit version, reconcile unit and volume creation must be checked there.
- The development qualification gate covers public HTTP health only.
- The repo has no secret scanning (no gitleaks) and no dependency audit gate in CI. `pnpm audit --prod` is clean at the time of writing; the two remaining dev-only findings have no patched versions.
- The Docker images build locally (verified 2026-10-10) and in CI; the production images have not been pulled from GHCR and run on the VPS.
