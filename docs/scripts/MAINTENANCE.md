# Database maintenance

`scripts/clone-db.sh` copies the MySQL database between the `dev` and `prod` stacks on the same VPS. It replaces the target database, so run it interactively only after checking the direction.

```bash
sudo ./scripts/clone-db.sh dev-to-prod
sudo ./scripts/clone-db.sh prod-to-dev
```

The script requires both deployed `.env` files, makes a timestamped gzip backup of the target in `~/backups/db-clones/`, and asks you to type the target Compose project name before replacing it. It checks the target `insis_courses` row count afterward. Redis queues and sessions are not copied.

For deployment recovery and monitoring, use [operations](../deployment/OPERATIONS.md). Host-wide Docker cleanup belongs to the separate Infrastructure repository.
