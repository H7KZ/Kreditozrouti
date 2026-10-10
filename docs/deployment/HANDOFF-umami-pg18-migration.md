# Historical database migration procedure

The naming and PostgreSQL18 migration entrypoints are retired and fail closed. Existing data
image/layout changes require a reviewed owner procedure; snapshot deploy deliberately refuses
to replace existing data containers whose digest differs.

Before migration: identify exact existing engine/volume layout, record source/target digest,
produce encrypted logical backup and prove a scratch restore. Keep the old volume and recovery
images until the owner accepts the result. PostgreSQL18 uses `/var/lib/postgresql/<major>/docker`;
an old flat cluster needs an actual dump/restore migration, not a PGDATA workaround.

Run the approved migration procedure with toolkit's repository-wide lock and explicit host window:

```bash
sudo -n /usr/local/bin/toolkit with-lock --repository kreditozrouti --environment monitoring \
  --action maintenance --timeout 1800 --host-window -- /absolute/reviewed-owner-procedure
```

After migration, stage a complete monitoring snapshot, activate by explicit ID, verify historical
data and Grafana access, and retain the rollback volume/backup until separately approved removal.
No migration, volume wipe, timer activation or host execution is authorized by this document alone.
