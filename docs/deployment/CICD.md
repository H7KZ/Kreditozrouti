# CI/CD

Canonical workflow, source/digest qualification, private transport and snapshot operations:
[snapshot operations](../../deployment/README.md). `deploy-all.yml` verifies/builds complete development releases on `main`;
production dispatch promotes every digest from a successful qualified development run.
`_deploy-service.yml` is one reusable full environment job. Rollback uses complete saved snapshots.

GitHub-hosted build/verify jobs remain. SSH/SCP actions require SHA pins and trusted fingerprint.
Application configuration is scoped to production/development; monitoring uses its own Environment.
The exact variable/secret mapping lives in `_deploy-service.yml` and `deployment/render-env.sh`.
Literal dotenv quoting preserves dollar signs; unsafe quotes/control characters/trailing backslashes fail.

## Rollback

Dispatch `rollback.yml` from `main` with environment and `release_id=previous|<fullSHA-run-attempt>`.
Toolkit verifies saved model/runtime/inventory and restores all images/config together. Current
application secrets are not rendered. Database changes are not reversed.

Registry cleanup is deferred until live, rollback and retained-backup digest references are protected.
The scheduled Umami workflow is removed; retention uses the disabled host timer and repository lock.
