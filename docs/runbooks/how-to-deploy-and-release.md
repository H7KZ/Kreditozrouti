# How to deploy and release

Read [snapshot operations](../../deployment/README.md) for the complete workflow, manifest, transport, rollback, recovery and retention contract.

Push `main` to verify/build/deploy a complete development release. For production, dispatch
`deploy-all.yml` from `main` with `environment=production` and a successful `development_run_id`.
Production reuses every qualified application digest and its source bundle. Subsets/tag-only
deploys are removed. Dispatch `rollback.yml` with `release_id` and environment
to restore a complete immutable snapshot and its saved configuration.

Manual development deploys work from any branch: dispatch `deploy-all.yml` with `environment=development`
from the branch you want to test. The dispatched commit is built and deployed. To redeploy without
rebuilding, pass all four `image_digest_*` inputs (`sha256:...`, shown in the build job's step summary).
Each digest must equal the image tagged with the dispatched commit SHA, or the run stops before any build
or deploy. Digest inputs are development-only; production always uses the qualified release. Reused
digests still deploy and publish a qualified development manifest.

Infrastructure owns shared Traefik and public-network. CI executes this repository's toolkit bundle,
pinned by `deployment/toolkit.lock`, through the independent CI runner. Manual admin, boot recovery
and scheduled jobs use the separately activated compatible host toolkit (>=0.8.1, <1.0.0).
The root-owned boot unit passes the installed deploy account explicitly and needs no account sudo rule.
Toolkit holds one repository-wide lock across environments/backups and opens the host window only
for Compose/health. Existing legacy current roots need snapshot migration.
No registry cleanup or timer activation occurs during deploy. Remaining host/settings/live gates
require separate owner action; these source changes do not claim zero downtime or live validation.
