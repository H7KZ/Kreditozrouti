# CI/CD

Canonical workflow, source/digest qualification, private transport and snapshot operations:
[snapshot operations](../../deployment/README.md). `deploy.yml` (**Deploy App**) always verifies/builds complete development releases on pushes to `main`.
Manual dispatch accepts any source `ref` for production/development, build/reuse/existing/promote modes,
verification and cache controls, image tag or complete digests, optional qualification `run_id`, and deploy/stage.
See snapshot operations for the input contract. Promotion checks published development qualification
identity and digests across all source branches; other modes can deploy directly to either target.
`_deploy.yml` applies complete environments; `_build.yml` builds selected source images.

GitHub-hosted build/verify jobs remain. SSH/SCP actions require SHA pins and trusted fingerprint.
Application configuration is scoped to production/development; monitoring uses its own Environment.
The exact variable/secret mapping lives in `_deploy.yml` and `deployment/render-env.sh`.
Literal dotenv quoting preserves dollar signs; unsafe quotes/control characters/trailing backslashes fail.

## Rollback

Dispatch **Restore Release** (`rollback.yml`) from any branch, with controller `ref`, target environment,
`operation=rollback|activate|reconcile` and `release_id=previous|current|<fullSHA-run-attempt>`.
Reconcile uses current and ignores the release ID.
Toolkit verifies saved model/runtime/inventory and restores all images/config together. Current
application secrets are not rendered. Database changes are not reversed.

**Deploy Monitoring** accepts any `ref` and deploy/stage. **Verify** accepts a manual source `ref`.
**Verify Backups** accepts `ref` and check selection without changing the backup inventory.
**Cleanup Registry** exposes newest-count, minimum-age and package selection; scheduled runs stay dry-run.
Supply every live, rollback and retained-backup digest before a deletion run.
The scheduled Umami workflow is removed; retention uses the disabled host timer and repository lock.
