# Deployment — Operations

Monitoring, security, maintenance, and troubleshooting for running environments.

---

## Monitoring & Logging

> Full observability stack reference: [MONITORING.md](MONITORING.md)

### Monitoring stack

The monitoring stack (`../../deployment/monitoring`, project `kreditozrouti-monitoring`) is deployed by
`deploy-monitoring.yml` (manual dispatch). Alloy is the only collector: it scrapes every container labelled
`prometheus.io/scrape=true` (api, each scraper replica), Traefik, the host and cAdvisor,
probes the public routes through Traefik, tails container logs and the Traefik access log, and receives Faro.
Prometheus stores metrics and evaluates the rules, Alertmanager sends to Discord, Loki stores logs, Grafana
(`/grafana`) shows the dashboards. Full reference: [MONITORING.md](MONITORING.md).

```bash
docker compose -p kreditozrouti-monitoring ps
# Validate config changes before deploying (promtool rule tests, amtool, loki, alloy)
bash deployment/monitoring/validate.sh
```

### Alert rules

Prometheus and Loki rule files with promtool unit tests (`deployment/monitoring/prometheus/tests/alerts.test.yml`),
delivered by Alertmanager to Discord. An always-firing `Watchdog` pings healthchecks.io; if the pings stop,
healthchecks.io e-mails. The catalogue is listed in [MONITORING.md](MONITORING.md#alerting). Grafana-managed alerts no
longer exist, so `scripts/sync-grafana-alerts.sh` is not needed.

### Faro browser telemetry

Collected at `https://<domain>/faro/collect` (Traefik `/faro` router, prefix stripped, to Alloy :12347, then Loki).
Page URLs arrive with share link ids and query strings removed.

```logql
# All browser telemetry
{project="kreditozrouti", source="faro"}

# JS exceptions only
{project="kreditozrouti", source="faro", kind="exception"}
```

Web Vitals are also exported as Prometheus histograms (`faro_web_vitals_*`) and shown on the Service: client dashboard.

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

### Disaster recovery checklist

There is currently no MySQL backup mechanism (removed for disk-space reasons - see git history if reinstating it).
Recovery after losing the database means re-scraping from InSIS rather than restoring a dump.

1. Provision new VPS
2. Install Docker: `sudo bash scripts/install-docker.sh` (log out and back in after)
3. Set up GitHub runner: `GITHUB_REPO_URL=... GITHUB_ACCESS_TOKEN=... bash deployment/github-runner/deploy.sh`
4. Restore `~/variables/.env.prod`
5. Deploy the shared Traefik from the **Infrastructure** repo (it owns Traefik + `public-network`)
6. Push to `deployment/monitoring/**` or trigger `deploy-monitoring.yml` (`workflow_dispatch`) — Monitoring up
7. Run `deploy-all.yml` (`workflow_dispatch`) for the first app deployment — or push to `main`/`develop` and let the
   path-triggered workflows deploy each service. The database starts empty; let the scraper repopulate it from InSIS.
   Redis is not restored; its queue state regenerates.
8. `curl https://example.com/api/health`

Estimated RTO: however long a full InSIS re-scrape takes, since there is no dump to replay.

---

## Maintenance

### Routine schedule

| Cadence   | Task                                                            |
| --------- | --------------------------------------------------------------- |
| Monthly   | Run `maintenance.sh`; Docker cleanup                            |
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
