# Kreditozrouti backups

Plain encrypted dumps to an Object-Locked Backblaze B2 bucket (`kreditozrouti-backups`), made by the pinned
toolkit (`deployment/toolkit backup`). This directory only says what to back up and how to drill it;
schedules are `BACKUP_*` in [`../toolkit.conf`](../toolkit.conf). Pipeline, host setup, debugging and drill:
[Toolkit backups guide](https://github.com/H7KZ/Toolkit/tree/main/docs/backups.md).

| Component        | Source                     | Cadence | Drill (`BACKUP_DRILL`)                                            |
| ---------------- | -------------------------- | ------- | ----------------------------------------------------------------- |
| `mysql`          | `mysqldump --databases`    | 4 h     | `mysql`, image from `production/docker-compose.production.yml`    |
| `umami-postgres` | `pg_dump --format=custom`  | 4 h     | `postgres`, image from `monitoring/docker-compose.monitoring.yml` |
| `redis`          | whole RDB over replication | 4 h     | `redis`, plus `drill_check_redis` (counts `share:*`/`ical:*`)     |

Schedules (UTC, :35): every four hours at 00, 04, 08, 12, 16 and 20 h; daily at 01:35. The Sunday daily run also
fills `weekly/`. Capture holds only the `kreditozrouti/production` repository lock (waits up to 30 minutes),
never the host lock, and releases it before upload. Detection budget is 14 days (Object Lock).

## Host setup (owner, once)

Follow the Toolkit guide: `/etc/toolkit/kreditozrouti.env` (root, 0600) with `BACKUP_BUCKET=kreditozrouti-backups`,
the writer key (`listBuckets,writeFiles` only), `BACKUP_AGE_RECIPIENT` and the Healthchecks URLs, then

```bash
sudo deployment/toolkit install --deploy-user deploy
sudo deployment/toolkit backup run daily && sudo deployment/toolkit backup list
sudo systemctl enable --now toolkit-kreditozrouti-backup@4h.timer toolkit-kreditozrouti-backup@daily.timer
```

Never put the age private key, a reader key or an admin key on the VPS.

## GitHub verification

`.github/workflows/backup-verify.yml` runs `backup check` daily and `backup drill` weekly on a GitHub runner.
Repository variable `BACKUP_BUCKET`; secrets `BACKUP_B2_READER_KEY_ID`, `BACKUP_B2_READER_KEY`
(`listBuckets,listFiles,readFiles`), `BACKUP_AGE_IDENTITY`, `BACKUP_HC_FRESHNESS_URL`, `BACKUP_HC_DRILL_URL`.

## Restore

Restoring is never automatic. You need the age identity, a reader (or admin) key and the bucket name. From a
machine with Docker and a checkout of this repository:

```bash
export BACKUP_BUCKET=kreditozrouti-backups BACKUP_B2_KEY_ID=<reader id> BACKUP_B2_KEY=<reader key>
export BACKUP_AGE_IDENTITY=/path/to/age-identity.txt
sudo TOOLKIT_DIRECT=1 bash deployment/toolkit backup install-tools    # once: age, rclone, zstd
bash deployment/toolkit backup list mysql
bash deployment/toolkit backup fetch mysql -o mysql.sql
bash deployment/toolkit backup fetch mysql --at 2026-10-12T04:00:00Z -o mysql.sql
bash deployment/toolkit backup fetch redis --tier weekly -o dump.rdb
```

After an attack on the writer key, read pre-attack versions with `--version-at <time before the attack>` (14-day
lock window). If an outage outlasts 14 days, copy the last good set to `pinned/` with the admin key before it
ages out.

| Component        | Restore                                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `mysql`          | Fresh `mysql:26.7.0` (production image), then `mysql < mysql.sql`. The dump creates and selects its own database (`--databases`). |
| `umami-postgres` | Fresh `postgres:18` container: `createdb`, then `pg_restore --exit-on-error --no-owner -d <db> umami.dump`.                       |
| `redis`          | Only `share:*` and `ical:*` come back, via a scratch Redis (below). Never load the RDB into production Redis.                     |

### Redis: restore only `share:*` and `ical:*`

The RDB holds everything, including queues, cache and counters, which must not come back. Load it into a scratch
Redis, then copy just the durable keys with their original absolute expiry into the fresh production Redis:

```bash
docker run -d --name scratch-redis -v "$PWD:/data" redis:8.10.1-alpine redis-server --appendonly no --dir /data --dbfilename dump.rdb
for key in $(docker exec scratch-redis redis-cli --scan --pattern 'share:*') $(docker exec scratch-redis redis-cli --scan --pattern 'ical:*'); do
    ttl=$(docker exec scratch-redis redis-cli PEXPIRETIME "$key")   # -1 = no expiry; skip keys already expired
    [ "$ttl" -eq -2 ] && continue
    [ "$ttl" -eq -1 ] && ttl=0
    # Copy with DUMP / RESTORE <key> <abs-ms or 0> <payload> ABSTTL, keeping the expiry absolute
    # so shares and calendars do not live longer than intended.
done
```

Delete the scratch container afterwards. Secrets are not in backups (`.env` values, API tokens, mail credentials):
restore them from GitHub secrets and the recovery kit. Losing the MySQL volume removes the scraped course catalog
until it is rebuilt from InSIS. Record elapsed times: that is the RTO.

## Legacy units (pre-0.11 hosts)

Remove after the toolkit units run: `toolkit-backup@kreditozrouti-4h.timer`, `toolkit-backup@kreditozrouti-daily.timer`,
the shared template `toolkit-backup@.service` (once every repository on the host is migrated),
`/usr/local/libexec/kreditozrouti-backup/` and `/etc/toolkit/backup/kreditozrouti.env` (moved to
`/etc/toolkit/kreditozrouti.env`). Steps: [Migrating a VPS to toolkit 0.11](../README.md#migrating-a-vps-to-toolkit-011).
