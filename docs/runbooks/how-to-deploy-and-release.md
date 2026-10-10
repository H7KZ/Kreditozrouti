# How to deploy and release

Read [snapshot operations](../../deployment/README.md) for the complete workflow, manifest, transport, rollback, recovery and retention contract.

Push `main` to verify/build/deploy a complete development release. For production, dispatch
`deploy-all.yml` from `main` with `environment=production` and a successful `development_run_id`.
Production reuses every qualified application digest and its source bundle. Subsets/tag-only
deploys and `skip_build` inputs are removed. Dispatch `rollback.yml` with `release_id` and environment
to restore a complete immutable snapshot and its saved configuration.

Infrastructure owns shared Traefik, public-network and toolkit installation. Toolkit matches
`deployment/toolkit.lock`, holds one repository-wide lock across environments/backups, and opens
the host window only for Compose/health. Existing legacy current roots need snapshot migration.
No registry cleanup or timer activation occurs during deploy. Remaining host/settings/live gates
require separate owner action; these source changes do not claim zero downtime or live validation.
