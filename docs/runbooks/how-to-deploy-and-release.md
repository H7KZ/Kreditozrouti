# How to deploy and release

Read [snapshot operations](../../deployment/README.md) for the complete workflow, manifest, transport, rollback, recovery and retention contract.

Push `main` to verify/build/deploy a complete development release. For production, dispatch
`deploy.yml` from `main` with `environment=production`. It promotes the last successful development
deploy; pass `commit` (SHA) only to promote a specific older one.
Production reuses every qualified application digest and its source bundle. Subsets/tag-only
deploys are removed. Dispatch `rollback.yml` with `release_id` and environment
to restore a complete immutable snapshot and its saved configuration.

Manual development deploys work from any branch: dispatch `deploy.yml` with `environment=development`
from the branch you want to test. The dispatched commit is built and deployed. To redeploy without
rebuilding, tick `reuse_images`. Digests are resolved from the ghcr images tagged with the dispatched
commit SHA; any service without such an image is built. The option is development-only; production
always uses the qualified release. Reused digests still deploy and publish a qualified development manifest.

Infrastructure owns shared Traefik and public-network. CI ships the deployed revision's pinned toolkit (`deployment/toolkit`, `toolkit.conf`, `toolkit.lock`, `vendor/toolkit/`)
and runs it on the VPS. Manual admin, boot recovery, backups and scheduled jobs run the same pinned toolkit
(`deployment/toolkit`, declared in `toolkit.conf`); nothing uses a toolkit installed on the server.
The generated boot unit passes the installed deploy account explicitly and needs no account sudo rule.
Toolkit holds one repository-wide lock across environments/backups and opens the host window only
for Compose/health. Existing legacy current roots need snapshot migration.
No registry cleanup or timer activation occurs during deploy. Remaining host/settings/live gates
require separate owner action; these source changes do not claim zero downtime or live validation.
