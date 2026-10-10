# CI/CD

The active workflows live in [`.github/workflows`](../../.github/workflows/). The `Deploy` workflow builds and deploys API, web, scraper, and MCP. The `Rollback Deployment` workflow redeploys a previously deployed image tag.

## Workflow map

| Workflow | Trigger | Action |
| --- | --- | --- |
| [`verify.yml`](../../.github/workflows/verify.yml) | Pull request | Calls `_verify.yml` with `affected: true`: lint, tests, type check, and build run only for packages changed against the base branch and their dependents (`pnpm verify:affected`, turbo `--affected`). Changes to `turbo.json`, root `package.json`, `pnpm-workspace.yaml`, `.dependency-cruiser.cjs`, `.npmrc`, `.pnpmfile.cjs`, or `_verify.yml` force the full `make verify`. Monitoring validation runs only when `deployment/monitoring/` changes. Runs on `ubuntu-latest` |
| [`deploy-all.yml`](../../.github/workflows/deploy-all.yml) | Push to `main` affecting `apps/api/`, `apps/web/`, `apps/scraper/`, `apps/mcp/`, or `packages/`; manual dispatch | Builds and deploys only affected or selected services |
| [`rollback.yml`](../../.github/workflows/rollback.yml) | Manual dispatch | Checks an eight-character SHA version directory exists, then redeploys the selected service or all four |
| [`deploy-monitoring.yml`](../../.github/workflows/deploy-monitoring.yml) | Manual dispatch | Uploads and deploys the monitoring stack |

`_build-service.yml` and `_deploy-service.yml` are reusable jobs. There are no separate `deploy-api.yml`, `deploy-web.yml`, or `deploy-scraper.yml` workflows. The app deploy workflow does not call `_verify.yml`; protect `main` with the pull request check if verification must gate production changes.

## App deploys

Pushes to `main` select changed services. A change under `packages/` selects all four. For a first deploy or selected redeploy, run **Actions > Deploy > Run workflow**, choose `production` or `development`, and select services. Automated pushes target production; development is a manual dispatch target.

Builds push `ghcr.io/<owner>/<repo>/<service>:<sha8>` and a floating tag (`latest` or `dev-latest`). Deploys use the short SHA. Set `image_tag` to an existing tag to skip the build; `skip_build` requires `image_tag`.

Builds stamp the full source commit as `org.opencontainers.image.revision`. Every deployment validates the vendored toolkit archive against `deployment/toolkit.lock`; updating the host toolkit remains a separate reviewed operator action.

The reusable deploy job uploads `deployment/` to `~/kreditozrouti/versions/<environment>/<sha>/`, writes `.env` from GitHub environment values with permission `600`, runs `deploy.sh`, and moves `current` to that directory. The script removes old version directories after seven days while retaining at least three. A service-only deploy brings up API, scraper, or MCP infrastructure dependencies; web deploys with `--no-deps` so it does not replace the running API image.

`image_tag` dispatches check out the selected workflow ref, which may differ from the commit that built the existing image. Confirm the chosen tag and configuration before redeploying.

Production backups are not triggered by app deployment workflows. Deploy and rollback use the Infrastructure toolkit host/repository locks and status records whenever `/usr/local/bin/toolkit` is installed. Set the GitHub Environment variable `TOOLKIT_LOCKS_REQUIRED=true` to fail closed if the host toolkit is missing. Until the toolkit is installed, deploy retains the legacy unlocked path and logs a warning; keep backup scheduling disabled. The [backup runbook](../../deployment/backups/README.md) also requires B2 Object Lock, trusted hosted retention maintenance, and an isolated restore rehearsal.

The cleanup workflow is dry-run only. GHCR deletion is disabled until it consumes the union of retained backup recovery references and deployment rollback references.

## Required configuration

Configure `SSH_HOST`, `SSH_USER`, `SSH_PORT`, and `SSH_PRIVATE_KEY` for the target GitHub environment. The automatic `GITHUB_TOKEN` authenticates to GHCR. App values such as `PROJECT` and `DOMAIN` are GitHub environment variables; database, Redis, and application credentials are environment secrets. The complete names are in [Infrastructure](INFRASTRUCTURE.md#configuration-and-secrets) and [`_deploy-service.yml`](../../.github/workflows/_deploy-service.yml).

The deploy job rejects credential values containing `$` or backticks before writing `.env`, since Compose interpolation can change them. Keep secrets out of commits and terminal output. The monitoring workflow has a separate secret set; see [monitoring](MONITORING.md#deployment-and-secrets).

## Rollback

Run **Actions > Rollback Deployment > Run workflow**. Enter an existing lowercase eight-character SHA, select `api`, `web`, `scraper`, `mcp`, or `all`, and choose the environment. The workflow requires that SHA's version directory on the VPS and deploys the corresponding image tag. If cleanup already removed the directory, this workflow refuses the rollback; a manual `Deploy` dispatch with a retained GHCR `image_tag` is a separate path.

Rolling back an image does not reverse database migrations or data changes. Check those before choosing a tag.
