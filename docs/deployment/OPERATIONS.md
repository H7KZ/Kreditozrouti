# Deployment — Operations

Monitoring, security, backup, maintenance, and troubleshooting for running environments.

---

## Monitoring & Logging

> Full observability stack reference: [MONITORING.md](MONITORING.md)

### Prometheus + Grafana

The monitoring stack (`../../deployment/monitoring`) provides metrics collection, log aggregation, and dashboards.

- **Prometheus** scrapes `GET /metrics` from each API container every 15 s. Metrics include HTTP request counts, latency
  histograms, and default Node.js runtime metrics (event loop lag, GC, memory) via `prom-client`.
- **Loki** receives structured logs from all app containers via Alloy (reads Docker stdout over the Docker socket).
- **Alloy** collects container logs (Docker stdout) and receives browser Faro telemetry. Trace export to Tempo is
  not deployed (see [MONITORING.md](MONITORING.md)).
- **Grafana** is available at `/grafana` (internal) and is pre-provisioned with Loki as the default datasource.

> Prometheus and Alloy read the Docker socket for service discovery and log tailing. Their `group_add` GID in
> `docker-compose.monitoring.yml` must match the host's `docker` group (default `988`, override with `DOCKER_GID`).
> A wrong GID = zero targets + no logs = empty dashboards.

```bash
# Check monitoring stack status (deploys under project name `kreditozrouti-monitoring`)
docker compose -p kreditozrouti-monitoring ps

# Restart after config changes (e.g. prometheus.yml edits)
docker compose -p kreditozrouti-monitoring -f deployment/monitoring/docker-compose.monitoring.yml up -d --force-recreate
```

### Alert Rules

Grafana alerting is provisioned from `../../deployment/monitoring/grafana/provisioning/alerting/rules.yml`. All rules
route to the Discord contact point via the default notification policy.

| Rule                             | Group          | Condition                                                          | Severity |
|----------------------------------|----------------|-------------------------------------------------------------------|----------|
| `container-down` (**API Down**)  | infrastructure | Prod API `up==0` or absent for 5 min (scoped to the API, not other targets) | critical |
| `scraper-jobs-failed`            | scraper        | `bullmq_queue_depth{queue=~"Scraper.*", status="failed"} > 0` for 5 min | critical |
| `scraper-stale`                  | scraper        | No scraper run in > 24 h                                          | warning  |
| `scraper-silent-failures-rising` | scraper        | `> 5` silent failures in 30 min (dampened `for: 15m`)             | warning  |
| `scraper-failure-rate-high`      | scraper        | Item failure rate > 10% over 5 min                                | warning  |
| `api-error-rate-high`            | application    | 5xx > 5% of all requests over 5 min (`for: 10m`)                  | warning  |
| `api-p99-latency-high`           | application    | API p99 latency > 2 s over 5 min (`for: 10m`)                     | warning  |

### Faro Browser Telemetry

Browser telemetry from `@grafana/faro-web-sdk` is collected at `https://<domain>/faro/collect`.

**Routing:** Browser → Traefik (`/faro` stripprefix rule) → Alloy port 12347 → Loki

**Query in Grafana:** use the Loki datasource. Alloy labels Faro logs with `app="kreditozrouti"` and a `kind` label
derived from the Faro signal type. Example selectors:

```logql
# All browser telemetry
{app="kreditozrouti"}

# JS exceptions only
{app="kreditozrouti", kind="exception"}

# Web Vitals
{app="kreditozrouti", kind="measurement"}
```

**Local dev:** set `VITE_FARO_COLLECTOR_URL=http://localhost:41247/collect` in your local env to enable Faro in
development. Requires the monitoring stack to be running locally.

---

### Container logs

```bash
# All services
docker compose -p kreditozrouti logs -f

# Single service, last 100 lines
docker compose -p kreditozrouti logs --tail=100 -f api

# Only errors/warnings
docker compose -p kreditozrouti logs -f api | grep -E "(ERROR|WARN)"
```

Log rotation is pre-configured in docker-compose (`max-size: 10m`, `max-file: 3`).

### Traefik access logs

```bash
docker exec traefik cat /var/log/traefik/access.log

# Filter 4xx/5xx
docker exec traefik cat /var/log/traefik/access.log | grep -E "\" [45][0-9]{2} "
```

### Health checks

```bash
# API
curl https://example.com/api/health   # expect HTTP 200

# Traefik
curl -I http://localhost:8080/ping    # expect HTTP 200

# MySQL
docker exec -it kreditozrouti-mysql-1 mysqladmin ping -h localhost -u root -p

# Redis
docker exec -it kreditozrouti-redis-1 redis-cli ping   # expect PONG
```

### Resource usage

```bash
docker stats                          # live per-container CPU/memory
docker system df                      # disk usage breakdown
```

---

## Security

### Firewall (UFW)

```bash
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (redirect only)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw status verbose
```

### TLS certificates

- Issued automatically by Let's Encrypt via Cloudflare DNS-01 challenge
- 90-day certificates with auto-renewal managed by Traefik
- Stored in `traefik-certificates-volume` (`/certs/acme.json`)

```bash
# Verify certificate
openssl s_client -connect example.com:443 -servername example.com
```

### Container hardening

Traefik and sensitive containers run with:

```yaml
security_opt:
	- no-new-privileges:true
```

### Secrets hygiene

- Never commit `.env` files — they live in `~/variables/` on the VPS only
- Restrict file permissions: `chmod 600 ~/variables/.env.prod`
- Rotate `API_SESSION_SECRET` and `API_COMMAND_TOKEN` quarterly

---

### Database backup

`scripts/backup-mysql.sh` runs daily at 02:00 via the `kreditozrouti-mysql-backup` systemd timer, installed by
`setup-automation.sh`. It dumps MySQL from inside the container, gzips it to
`~/kreditozrouti/backups/<environment>/`, replicates off-site if configured, and prunes old dumps (14 days, never
below 5 files). Full reference: [scripts/MAINTENANCE.md](../scripts/MAINTENANCE.md).

```bash
sudo ./scripts/setup-automation.sh          # install the timer (idempotent)
./scripts/backup-mysql.sh production        # run one by hand
systemctl status kreditozrouti-mysql-backup.timer
```

**Off-site replication is opt-in and is the part that actually matters.** A local dump protects against an
accidental `DROP` or a corrupt table. It does **not** protect against losing the VPS, which is the failure this
database cannot survive: one server, one volume. Set `BACKUP_REMOTE` to an rclone remote path in
`/etc/default/kreditozrouti-backup`:

```bash
BACKUP_REMOTE=storagebox:kreditozrouti/production
```

rclone reads its own credentials from `~/.config/rclone/rclone.conf`, so no secret passes through the script or its
environment, and `BACKUP_REMOTE` itself is just a path. With it unset, the script reports on every run that the dump
exists only on this VPS. With it set but broken, the script fails rather than skipping quietly.

### Restore drill

Run this against development at least once, before you need it against production. A backup you have never restored
is a hypothesis, not a backup.

```bash
# 1. Pick a dump
ls -lh ~/kreditozrouti/backups/production/

# 2. Restore it into the running mysql container
gunzip -c ~/kreditozrouti/backups/production/kreditozrouti-production-<stamp>.sql.gz \
  | docker compose -p kreditozrouti --env-file ~/kreditozrouti/versions/production/current/.env \
      -f ~/kreditozrouti/versions/production/current/production/networks.yml \
      -f ~/kreditozrouti/versions/production/current/production/volumes.yml \
      -f ~/kreditozrouti/versions/production/current/production/docker-compose.production.yml \
      exec -T mysql sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'

# 3. Confirm
docker compose -p kreditozrouti ... exec -T mysql sh -c \
  'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SELECT COUNT(*) FROM insis_courses" "$MYSQL_DATABASE"'
```

Redis is deliberately **not** backed up. It holds BullMQ queue state and sessions, both of which regenerate; the
authoritative data is all in MySQL.

### Backup monitoring

The script writes Prometheus textfile metrics on every exit path, shipped by Alloy. Grafana alerts to Discord if
there has been no **successful** backup in 36 hours, and the alert also fires when the metric is absent entirely, so
a timer that was never installed or a host that is down pages the same way a failing dump does. See
[ADR 0001](../adr/0001-backup-health-via-alloy-textfile.md) for why this path is push while everything else is pull.

### Volume backup

Volume-level snapshots are a coarser complement to the MySQL dumps above, useful before a risky upgrade:

```bash
for volume in kreditozrouti-mysql-volume-prod kreditozrouti-redis-volume-prod; do
  docker run --rm \
    -v $volume:/data \
    -v /backups/volumes:/backup \
    alpine tar czf /backup/$volume-$(date +%Y%m%d).tar.gz /data
done
```

### Disaster recovery checklist

1. Provision new VPS
2. Install Docker: `sudo bash scripts/install-docker.sh` (log out and back in after)
3. Set up GitHub runner: `GITHUB_REPO_URL=... GITHUB_ACCESS_TOKEN=... bash deployment/github-runner/deploy.sh`
4. Restore `~/variables/.env.prod`
5. Deploy the shared Traefik from the **Infrastructure** repo (it owns Traefik + `public-network`)
6. Push to `deployment/monitoring/**` or trigger `deploy-monitoring.yml` (`workflow_dispatch`) — Monitoring up
7. Restore the database: bring the stack up empty, then replay the newest dump from
   `~/kreditozrouti/backups/production/` (or pull it from `BACKUP_REMOTE` with `rclone copy` if the old VPS is gone)
   using the restore drill above. Redis is not restored; its queue state regenerates.
8. Run `deploy-all.yml` (`workflow_dispatch`) for the first app deployment — or push to `main`/`develop` and let the
   path-triggered workflows deploy each service
9. `curl https://example.com/api/health`

Estimated RTO: 2-4 hours. RPO: 24 hours, delivered by the daily `kreditozrouti-mysql-backup` timer. That figure is
only true while `BACKUP_REMOTE` is set: without off-site replication the dumps share the disk they are protecting,
so a VPS loss is a total loss regardless of how recent they are.

---

## Maintenance

### Routine schedule

| Cadence   | Task                                                            |
|-----------|-----------------------------------------------------------------|
| Monthly   | Run `maintenance.sh`; check `kreditozrouti-mysql-backup.timer`; Docker cleanup |
| Quarterly | Restore drill: replay the newest dump into development and check the row count |
| Quarterly | Rotate secrets; review Traefik access logs; update dependencies |

### System updates

```bash
sudo ./scripts/maintenance.sh --auto-reboot --docker-cleanup
```

See [scripts/MAINTENANCE.md](../scripts/MAINTENANCE.md) for full reference.

### Docker cleanup

```bash
./scripts/docker-cleanup.sh --all --keep-recent 48 --force
```

---

## Troubleshooting

### Containers not starting

```bash
docker compose -p kreditozrouti logs api        # check for startup errors

# Common causes: missing env vars, port conflict, network misconfiguration
sudo netstat -tulpn | grep -E ":(80|443|3306|6379)"
docker compose -p kreditozrouti up -d --force-recreate api
```

### TLS certificate issues

```bash
docker logs traefik | grep -i error

# Verify Cloudflare token
curl -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer $CLOUDFLARE_DNS_API_TOKEN"

# Reset certificates
docker compose -p traefik down
docker volume rm traefik-certificates-volume
docker volume create traefik-certificates-volume
docker compose -p traefik up -d
```

### Database connection errors

```bash
docker exec -it kreditozrouti-mysql-1 mysqladmin ping -u root -p
docker network inspect kreditozrouti-mysql-network-prod
docker compose -p kreditozrouti restart mysql
```

### Redis connection errors

```bash
docker exec -it kreditozrouti-redis-1 redis-cli ping
docker compose -p kreditozrouti restart redis

# Clear Redis if jobs are stuck (⚠️ drops all queued jobs)
docker exec -it kreditozrouti-redis-1 redis-cli FLUSHDB
```

### Disk space

```bash
df -h
docker system df

# Free space
docker image prune -a -f
sudo journalctl --vacuum-time=3d
docker builder prune -f
```

### High memory usage

```bash
docker stats
# Reduce scraper replicas if memory is tight
# Edit docker-compose.production.yml → scraper.deploy.replicas: 3
docker compose -p kreditozrouti up -d
```

### Rollback

Rollback is done by re-triggering the relevant per-service workflow with a previous image SHA:

1. GitHub → Actions → `Deploy API` (or `Deploy Client` / `Deploy Scraper`)
2. **Run workflow** → set `image_tag` to the old short SHA (e.g. `a1b2c3d4`)
3. Set `skip_build: true` (the image already exists in GHCR)
4. Select the target environment and run

To roll back all services at once, use `Deploy All Services` (`deploy-all.yml`) with the same inputs.
