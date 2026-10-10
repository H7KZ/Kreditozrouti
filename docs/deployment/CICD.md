# CI/CD

The active workflows live in [`.github/workflows`](../../.github/workflows/). The `Deploy` workflow builds and deploys API, web, scraper, and MCP. The `Rollback Deployment` workflow redeploys a previously deployed image tag.

## Workflow map

| Workflow | Trigger | Action |
| --- | --- | --- |
| [`verify.yml`](../../.github/workflows/verify.yml) | Pull request | Calls `_verify.yml` with `affected: true`: lint, tests, type check, and build run only for packages changed against the base branch and their dependents (`pnpm verify:affected`, turbo `--affected`). Changes to `turbo.json`, root `package.json`, `pnpm-workspace.yaml`, `.dependency-cruiser.cjs`, `.npmrc`, `.pnpmfile.cjs`, or `_verify.yml` force the full `make verify`. Monitoring validation runs only when `deployment/monitoring/` changes. Runs on `ubuntu-latest` |
| [`deploy-all.yml`](../../.github/workflows/deploy-all.yml) | Push to `main`; manual dispatch | Runs full verification, then deploys changed services to development. Manual dispatch builds/deploys selected services to the chosen environment |
| [`rollback.yml`](../../.github/workflows/rollback.yml) | Manual dispatch | Checks an eight-character legacy or full-SHA version directory exists, then redeploys the selected service or all four |
| [`deploy-monitoring.yml`](../../.github/workflows/deploy-monitoring.yml) | Manual dispatch | Uploads and deploys the monitoring stack |

`_build-service.yml`, `_deploy-service.yml`, and `_verify.yml` are reusable jobs. There are no separate `deploy-api.yml`, `deploy-web.yml`, or `deploy-scraper.yml` workflows. All workflow jobs use GitHub-hosted runners. Remote SSH and SCP actions require the pinned `SSH_HOST_FINGERPRINT` secret.

## App deploys

Pushes to `main` run full verification, then deploy changed services to the development environment using the commit SHA image tags. Production remains manual-only. A production dispatch must run from `main`, set `skip_build=true`, and provide a full 40-character main commit SHA as `image_tag`; it cannot build a new production image. The reusable build workflow publishes both short and full commit SHA tags. Each reusable deploy validates that its image tag is a safe Docker tag before using it in remote paths. Exact digest-level proof that the selected image was the successfully qualified development image remains open.

Builds push `ghcr.io/<owner>/<repo>/<service>:<sha8>`, the full `github.sha`, and a floating tag (`latest` or `dev-latest`). Development deploys use the short SHA. Production deploys use the supplied full SHA tag and require it to be a commit reachable from `main`. For manual development dispatches, set `image_tag` to an existing tag to skip the build; `skip_build` requires `image_tag`.

Builds stamp the full source commit as `org.opencontainers.image.revision`. Every deployment validates the vendored toolkit archive against `deployment/toolkit.lock`; updating the host toolkit remains a separate reviewed operator action.

The reusable deploy job uploads `deployment/` to `~/kreditozrouti/versions/<environment>/<sha>/`, writes `.env` from GitHub environment values with permission `600`, runs `deploy.sh`, and moves `current` to that directory. The script removes old version directories after seven days while retaining at least three. A service-only deploy brings up API, scraper, or MCP infrastructure dependencies; web deploys with `--no-deps` so it does not replace the running API image.

`image_tag` dispatches check out the selected workflow ref, which may differ from the commit that built the existing image. Confirm the chosen tag and configuration before redeploying.

Production backups are not triggered by app deployment workflows. Deploy and rollback use the Infrastructure toolkit host/repository locks and status records whenever `/usr/local/bin/toolkit` is installed. Set the GitHub Environment variable `TOOLKIT_LOCKS_REQUIRED=true` to fail closed if the host toolkit is missing. Until the toolkit is installed, deploy retains the legacy unlocked path and logs a warning; keep backup scheduling disabled. The [backup runbook](../../deployment/backups/README.md) also requires B2 Object Lock, trusted hosted retention maintenance, and an isolated restore rehearsal.

The cleanup workflow is dry-run only. GHCR deletion is disabled until it consumes the union of retained backup recovery references and deployment rollback references.

## Required configuration

Configure `SSH_HOST`, `SSH_USER`, `SSH_PORT`, `SSH_PRIVATE_KEY`, and the out-of-band trusted `SHA256:` value in `SSH_HOST_FINGERPRINT` as repository secrets; environment secrets may override them for a distinct host. The automatic `GITHUB_TOKEN` authenticates to GHCR. App values such as `PROJECT` and `DOMAIN` are GitHub environment variables; database, Redis, and application credentials are environment secrets. The complete names are in [Infrastructure](INFRASTRUCTURE.md#configuration-and-secrets) and [`_deploy-service.yml`](../../.github/workflows/_deploy-service.yml).

The deploy job rejects credential values containing `$` or backticks before writing `.env`, since Compose interpolation can change them. Keep secrets out of commits and terminal output. The monitoring workflow has a separate secret set; see [monitoring](MONITORING.md#deployment-and-secrets).

## Rollback

Run **Actions > Rollback Deployment > Run workflow**. Enter an existing lowercase eight-character legacy tag or full 40-character SHA, select `api`, `web`, `scraper`, `mcp`, or `all`, and choose the environment. The workflow requires that SHA's version directory on the VPS and deploys the corresponding image tag. If cleanup already removed the directory, this workflow refuses the rollback; a manual `Deploy` dispatch with a retained GHCR `image_tag` is a separate path.

Rolling back an image does not reverse database migrations or data changes. Check those before choosing a tag.
