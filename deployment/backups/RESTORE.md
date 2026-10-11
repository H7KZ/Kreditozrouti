# Restoring Kreditozrouti from backup

You need the **age identity** (private key), the **reader key** (or admin), the bucket name, `rclone`, `age`, `zstd`
and the pinned toolkit (`tar -xzf deployment/vendor/toolkit/toolkit-<version>.tar.gz`). Restoring is never automatic.

```bash
export BACKUP_BUCKET=kreditozrouti-backups BACKUP_B2_KEY_ID=<reader id> BACKUP_B2_KEY=<reader key>
export BACKUP_AGE_IDENTITY=/path/to/age-identity.txt
toolkit backup list kreditozrouti mysql
toolkit backup fetch kreditozrouti mysql -o mysql.sql
toolkit backup fetch kreditozrouti mysql --at 2026-10-12T04:00:00Z -o mysql.sql
toolkit backup fetch kreditozrouti redis --tier weekly -o dump.rdb
```

After an attack on the writer key, read pre-attack versions: `--version-at <time before the attack>` (14-day lock window).
If an outage outlasts 14 days, copy the last good set to `pinned/` with the admin key before it ages out.

| Component        | Restore                                                                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `mysql`          | Fresh `mysql:26.7.0` (same image as production), then `mysql < mysql.sql`. The dump creates and selects its own database (`--databases`). |
| `umami-postgres` | Fresh `postgres:18` container: `createdb`, then `pg_restore --exit-on-error --no-owner -d <db> umami.dump`.                               |
| `redis`          | See below. Never load the RDB into production Redis.                                                                                      |

## Redis: restore only `share:*` and `ical:*`

The RDB holds everything, including queues, cache and counters, which must not come back. Load it into a scratch Redis,
then copy just the durable keys with their original absolute expiry into the fresh production Redis:

```bash
docker run -d --name scratch-redis -v "$PWD:/data" redis:8.10.1-alpine redis-server --appendonly no --dir /data --dbfilename dump.rdb
for key in $(docker exec scratch-redis redis-cli --scan --pattern 'share:*') $(docker exec scratch-redis redis-cli --scan --pattern 'ical:*'); do
    ttl=$(docker exec scratch-redis redis-cli PEXPIRETIME "$key")   # -1 = no expiry; skip keys already expired
    [ "$ttl" -eq -2 ] && continue
    [ "$ttl" -eq -1 ] && ttl=0
    docker exec scratch-redis redis-cli --no-raw DUMP "$key" >/dev/null   # existence check
    # Copy with redis-cli --pipe or a small script: RESTORE <key> <abs-ms or 0> <payload> ABSTTL
done
```

Use the same `DUMP` / `RESTORE ... ABSTTL` approach as `redis-restore` in the old scaffold if you need a script; keep the
expiry absolute so shares and calendars do not live longer than intended. Delete the scratch container afterwards.

Secrets are not in backups (`.env` values, API tokens, mail credentials): restore them from GitHub secrets and the
recovery kit. Losing the MySQL volume removes the scraped course catalog until it is rebuilt from InSIS. Record elapsed
times: that is the RTO.
