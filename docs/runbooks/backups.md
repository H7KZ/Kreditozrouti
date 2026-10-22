# Backups

Use this to set up backups on a server, to check that they work, and to restore from them. Backups are plain encrypted
dumps in an Object-Locked Backblaze B2 bucket (`kreditozrouti-backups`), made by the pinned toolkit
(`deployment/toolkit backup`). The pipeline, host setup and debugging are Toolkit mechanics:
[Toolkit backups guide](https://github.com/H7KZ/Toolkit/tree/main/docs/backups.md). This page covers what is specific to
this repository. What to back up is declared in [`deployment/backup/components.sh`](../../deployment/backup/components.sh);
schedules are `BACKUP_*` in [`deployment/toolkit.conf`](../../deployment/toolkit.conf).

## What is backed up

| Component        | Source                     | Cadence | Drill (`BACKUP_DRILL`)                                            |
| ---------------- | -------------------------- | ------- | ----------------------------------------------------------------- |
| `mysql`          | `mysqldump --databases`    | 4 h     | `mysql`, image from `production/docker-compose.production.yml`    |
| `umami-postgres` | `pg_dump --format=custom`  | 4 h     | `postgres`, image from `monitoring/docker-compose.monitoring.yml` |
| `redis`          | whole RDB over replication | 4 h     | `redis`, plus a check that counts `share:*` and `ical:*`          |

Schedules (UTC, minute :35 so repositories sharing a host do not collide): every four hours at 00, 04, 08, 12, 16 and 20 h,
and daily at 01:35. The Sunday daily run also fills `weekly/`. A capture holds only this repository's lock (waits up to 30
minutes), never the host lock, and releases it before uploading. Object Lock gives a 14-day detection budget.

Not in backups: secrets (`.env` values, API tokens, mail credentials, B2 keys, the age identity). Restore them from GitHub
secrets and the offline recovery kit ([Secrets and config](secrets-and-config.md)). Development data is not backed up.

## Set up a new bucket

Once per bucket (local, with a B2 admin key). The Toolkit guide has the full procedure; the shape is:

1. One Object-Lock bucket (default COMPLIANCE, 14 days) with lifecycle rules for `daily/`, `weekly/`.
2. A **writer** key restricted to that bucket with `listBuckets,writeFiles` only (goes on the VPS).
3. A **reader** key with `listBuckets,listFiles,readFiles` (goes into GitHub secrets).
4. An age key pair (`age-keygen`). The public key goes on the VPS; the private key stays off the VPS (GitHub secret and
   offline recovery kit).
5. Healthchecks.io checks for `4h`, `daily`, `freshness` and `drill`.

## Host setup

On the VPS, once per server, after [Fresh server](fresh-server.md) step 3. Never put the age private key, a reader key or an
admin key on the VPS.

```bash
# VPS as root
sudo install -d -m 0755 /etc/toolkit
sudo install -m 0600 /dev/null /etc/toolkit/kreditozrouti.env && sudoedit /etc/toolkit/kreditozrouti.env
```

```ini
BACKUP_BUCKET=kreditozrouti-backups
BACKUP_B2_KEY_ID=<writer key id>
BACKUP_B2_KEY=<writer key>
BACKUP_AGE_RECIPIENT=age1...
BACKUP_HC_4H_URL=https://hc-ping.com/...
BACKUP_HC_DAILY_URL=https://hc-ping.com/...
```

```bash
# VPS as root, from the toolkit checkout
cd /home/deploy/kreditozrouti-checkout
sudo deployment/toolkit install --deploy-user deploy
sudo deployment/toolkit backup run daily && sudo deployment/toolkit backup list
sudo systemctl enable --now toolkit-kreditozrouti-backup@4h.timer toolkit-kreditozrouti-backup@daily.timer
deployment/toolkit doctor
```

Do not enable the timers until a restore has been rehearsed once ([Drill](#drill)).

## GitHub verification

`backup-verify.yml` (**Backup Verify**) runs `backup check` daily (newest object per component exists, is fresh and above its
size floor) and `backup drill` weekly (restore every component into throwaway containers), on a GitHub runner, never on the
VPS. Run it manually with `check=freshness`, `drill` or `both`. It needs the repository variable `BACKUP_BUCKET` and the
secrets `BACKUP_B2_READER_KEY_ID`, `BACKUP_B2_READER_KEY`, `BACKUP_AGE_IDENTITY`, `BACKUP_HC_FRESHNESS_URL` and
`BACKUP_HC_DRILL_URL`. A workflow that stops running alerts through its missing Healthchecks ping.

## Drill

A full restore rehearsal on a machine with Docker, the age identity and a reader key (never the VPS):

```bash
export BACKUP_BUCKET=kreditozrouti-backups BACKUP_B2_KEY_ID=<reader id> BACKUP_B2_KEY=<reader key>
export BACKUP_AGE_IDENTITY=/path/to/age-identity.txt
sudo TOOLKIT_DIRECT=1 bash deployment/toolkit backup install-tools     # once: age, rclone, zstd
bash deployment/toolkit backup drill                                   # every component; or: drill mysql
```

Record how long it takes: that is your recovery time.

## Restore

Restoring is never automatic. Fetch on a trusted machine, then load into the running production containers.

```bash
# local: fetch (same environment variables as the drill)
bash deployment/toolkit backup list mysql
bash deployment/toolkit backup fetch mysql -o mysql.sql
bash deployment/toolkit backup fetch umami-postgres -o umami.dump
bash deployment/toolkit backup fetch redis -o dump.rdb
bash deployment/toolkit backup fetch mysql --at 2026-10-12T04:00:00Z -o mysql.sql     # newest at or before a time
bash deployment/toolkit backup fetch redis --tier weekly -o dump.rdb
scp mysql.sql umami.dump dump.rdb deploy@<host>:/tmp/                                 # data leaves your machine: delete afterwards
```

After an attack on the writer key, read pre-attack object versions with `--version-at <time before the attack>` (inside the
14-day lock window). If an outage outlasts 14 days, copy the last good set to `pinned/` with the admin key before it ages out.

### MySQL

The dump creates and selects its own database (`--databases`) and drops tables before creating them, so it can load over
the empty schema the API migrations created on first start. Stop the writers first.

```bash
# VPS as deploy
svc() { docker ps -q --filter label=com.docker.compose.project="$1" --filter label=com.docker.compose.service="$2"; }
writers="$(svc kreditozrouti api) $(svc kreditozrouti mcp) $(svc kreditozrouti scraper)"
docker stop $writers
docker exec -i "$(svc kreditozrouti mysql)" sh -c 'export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"; exec mysql --user=root' < /tmp/mysql.sql
docker start $writers
```

### Umami PostgreSQL

```bash
# VPS as deploy (svc function as above)
umami="$(svc kreditozrouti-monitoring umami)"
docker stop $umami
docker exec -i "$(svc kreditozrouti-monitoring umami-db)" sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" exec pg_restore --clean --if-exists --no-owner --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' < /tmp/umami.dump
docker start $umami
```

Then dispatch **Deploy Monitoring** (`operation=deploy`) once to reapply Grafana's read-only role on the restored tables.

### Redis: only `share:*` and `ical:*`

The RDB holds everything, including queues, cache and counters, which must not come back. Load it into a scratch Redis on
the production Redis network and copy just the durable keys with `MIGRATE`, which keeps their expiry:

```bash
# VPS as deploy, in the directory holding dump.rdb
docker run -d --name scratch-redis --network kreditozrouti-redis-network-prod -v "$PWD:/data" \
  redis:8.10.1-alpine redis-server --appendonly no --dir /data --dbfilename dump.rdb
read -rs REDIS_PASSWORD && export REDIS_PASSWORD
for pattern in 'share:*' 'ical:*'; do
  docker exec scratch-redis redis-cli --scan --pattern "$pattern" |
    docker exec -i -e REDIS_PASSWORD scratch-redis sh -c 'xargs -r -n 100 redis-cli MIGRATE redis 6379 "" 0 10000 COPY REPLACE AUTH "$REDIS_PASSWORD" KEYS'
done
docker rm -f scratch-redis
shred -u dump.rdb /tmp/mysql.sql /tmp/umami.dump 2>/dev/null || rm -f dump.rdb /tmp/mysql.sql /tmp/umami.dump
```

Never load the RDB into the production Redis itself.

## Verify

`bash deployment/toolkit backup list` shows fresh objects for all three components, Healthchecks received the last ping,
**Backup Verify** is green, and after a restore `curl -fsS https://kreditozrouti.cz/api/health` passes and a course search
returns data.
