# Deployment — Operations

Monitoring, security, backup, maintenance, and troubleshooting for running environments.

---

## Monitoring & Logging

### Prometheus + Grafana

The monitoring stack (`deployment/monitoring/`) provides metrics collection and dashboards.

- **Prometheus** scrapes `GET /metrics` from each API container every 15 s. Metrics include HTTP request counts,
  latency histograms, and default Node.js runtime metrics (event loop lag, GC, memory) via `prom-client`.
- **Grafana** is available at `/grafana` (internal) and is pre-provisioned with Prometheus as the default datasource.

```bash
# Check monitoring stack status
docker compose -p monitoring ps

# Restart after config changes (e.g. prometheus.yml edits)
docker compose -p monitoring -f deployment/monitoring/docker-compose.monitoring.yml up -d --force-recreate
```

### Faro Browser Telemetry

Browser telemetry from `@grafana/faro-web-sdk` is collected at `https://<domain>/faro/collect`.

**Routing:** Browser → Traefik (`/faro` stripprefix rule) → Alloy port 12347 → Loki

**Query in Grafana:** use the Loki datasource with label selector `{app=~".*alloy.*"}` to find browser telemetry
entries (errors, Web Vitals, route navigations).

**Local dev:** set `VITE_FARO_COLLECTOR_URL=http://localhost:41247/collect` in your local env to enable Faro in
development.

---

### Container logs

```bash
# All services
docker compose -p prod logs -f

# Single service, last 100 lines
docker compose -p prod logs --tail=100 -f api

# Only errors/warnings
docker compose -p prod logs -f api | grep -E "(ERROR|WARN)"
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
docker exec -it prod-mysql-1 mysqladmin ping -h localhost -u root -p

# Redis
docker exec -it prod-redis-1 redis-cli ping   # expect PONG
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

## Backup & Recovery

### MySQL — manual backup

```bash
docker exec prod-mysql-1 mysqldump \
  -u root -p${MYSQL_ROOT_PASSWORD} \
  kreditozrouti > backup-$(date +%Y%m%d).sql
```

### MySQL — automated daily backup

```bash
#!/bin/bash
# /root/scripts/mysql-backup.sh
BACKUP_DIR="/backups/mysql"
RETENTION_DAYS=30
mkdir -p $BACKUP_DIR

docker exec prod-mysql-1 mysqldump \
  -u root -p${MYSQL_ROOT_PASSWORD} \
  kreditozrouti | gzip > $BACKUP_DIR/kreditozrouti-$(date +%Y%m%d).sql.gz

find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
```

Cron (daily at 2 AM):

```
0 2 * * * /root/scripts/mysql-backup.sh >> /var/log/mysql-backup.log 2>&1
```

### MySQL — restore

```bash
gunzip < backup-20240131.sql.gz | \
  docker exec -i prod-mysql-1 mysql \
    -u root -p${MYSQL_ROOT_PASSWORD} \
    kreditozrouti
```

### Volume backup

```bash
for volume in mysql-data-volume traefik-certificates-volume; do
  docker run --rm \
    -v $volume:/data \
    -v /backups/volumes:/backup \
    alpine tar czf /backup/$volume-$(date +%Y%m%d).tar.gz /data
done
```

### Disaster recovery checklist

1. Provision new VPS
2. Install Docker (run `sudo bash scripts/install-docker.sh` or use a Docker-ready VPS image; log out and back in after)
3. Restore `~/variables/.env.prod`
4. Run the **`bootstrap.yml`** workflow (`workflow_dispatch`) — it deploys Traefik, Monitoring, GitHub Runner, and
   installs the backup cron automatically
5. Restore `mysql-data-volume` and `traefik-certificates-volume` from backup
6. Run `deploy-all.yml` (`workflow_dispatch`) for the first app deployment — or push to `main`/`develop` and let the
   path-triggered workflows deploy each service
7. `curl https://example.com/api/health`

Estimated RTO: 2–4 hours. RPO: 24 hours (daily backups).

---

## Maintenance

### Routine schedule

| Cadence   | Task                                                            |
|-----------|-----------------------------------------------------------------|
| Monthly   | Run `maintenance.sh`; verify backups; Docker cleanup            |
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
docker compose -p prod logs api        # check for startup errors

# Common causes: missing env vars, port conflict, network misconfiguration
sudo netstat -tulpn | grep -E ":(80|443|3306|6379)"
docker compose -p prod up -d --force-recreate api
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
docker exec -it prod-mysql-1 mysqladmin ping -u root -p
docker network inspect mysql-network
docker compose -p prod restart mysql
```

### Redis connection errors

```bash
docker exec -it prod-redis-1 redis-cli ping
docker compose -p prod restart redis

# Clear Redis if jobs are stuck (⚠️ drops all queued jobs)
docker exec -it prod-redis-1 redis-cli FLUSHDB
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
docker compose -p prod up -d
```

### Rollback

Rollback is done by re-triggering the relevant per-service workflow with a previous image SHA:

1. GitHub → Actions → `Deploy API` (or `Deploy Client` / `Deploy Scraper`)
2. **Run workflow** → set `image_tag` to the old short SHA (e.g. `a1b2c3d4`)
3. Set `skip_build: true` (the image already exists in GHCR)
4. Select the target environment and run

To roll back all services at once, use `Deploy All Services` (`deploy-all.yml`) with the same inputs.
