# Monitoring

The [monitoring stack](../../deployment/monitoring/docker-compose.monitoring.yml) runs alongside the app on the shared VPS. [Alloy](../../deployment/monitoring/alloy/config.alloy) collects container and Traefik logs, API and scraper metrics, host and container metrics, browser Faro events, and route probes. It sends metrics to Prometheus and logs to Loki. Grafana serves dashboards at `https://kreditozrouti.cz/grafana/`; Alertmanager sends alerts to Discord and a Watchdog ping to healthchecks.io. Umami provides product analytics through `/stats` on app domains.

Tracing is off unless `OTEL_EXPORTER_OTLP_ENDPOINT` is set. The current monitoring stack has no OTLP receiver or Tempo.

## Components and retention

| Component | Current image | Role |
| --- | --- | --- |
| Alloy | `grafana/alloy:v1.19.2` | Collection, probes, Faro receiver |
| Prometheus | `prom/prometheus:v3.14.0` | Metrics, 15-day and 2 GB retention cap, alert rules |
| Alertmanager | `prom/alertmanager:v0.34.0` | Notification routing |
| Loki | `grafana/loki:3.7.7` | Logs, seven-day retention; Traefik logs three days |
| Grafana | `grafana/grafana:13.2.1` | Dashboards |
| Umami | `ghcr.io/umami-software/umami:3.3.1` | Analytics |
| Umami DB | `postgres:18.6-alpine` | Analytics storage |

Umami event retention runs through [`.github/workflows/umami-retention.yml`](../../.github/workflows/umami-retention.yml), using the [retention SQL](../../deployment/monitoring/umami/retention.sql). Check the workflow schedule before relying on it for data expiry.

## Collection contract

Alloy keeps only the `kreditozrouti`, `kreditozrouti-dev`, and `kreditozrouti-monitoring` Compose projects. It derives `project`, `env`, `service`, `instance`, and `job` from Compose metadata. To expose metrics, a container joins `kreditozrouti-monitoring-network` and sets `prometheus.io/scrape=true` and `prometheus.io/port=<port>`. API serves `/metrics` on port 80; each scraper replica serves it on port 9101. Web and MCP do not expose metrics endpoints; Traefik metrics and probes cover their routes.

Traefik routers for the app use names matching `kreditozrouti-(api|web|mcp)-<suffix>` so Alloy can select their metrics and access logs. Changing those names requires a matching [Alloy configuration](../../deployment/monitoring/alloy/config.alloy) change.

Alloy removes client IPs, query strings, and private share or calendar path segments before storing logs. The web app strips sensitive URL parts before Faro and Umami send them. Container health and metrics request logs are dropped. Faro Web Vitals become `faro_web_vitals_*` metrics.

## Logs and metrics

API and scraper log structured JSON. Keep fields such as `request_id`, `trace_id`, and `job_name` in log events for correlation. Loki indexes `project`, `env`, `service`, `source`, and `level`; request identifiers remain structured metadata rather than high-cardinality labels.

Useful LogQL queries:

```logql
{project="kreditozrouti", service="api", env="production", level="ERROR"}
{project="kreditozrouti", service="scraper", level="ERROR"}
{project="kreditozrouti", source="faro", kind="exception"}
```

Application metrics include HTTP request duration, BullMQ job counts and outcomes, worker success timestamps, scraper silent failures, and `app_build_info`. Alloy also collects Traefik, node, cAdvisor, and blackbox probe metrics. API `/metrics` rejects requests with proxy headers so it is not exposed through the public `/api` route.

## Alerts and dashboards

Prometheus rules are in [`prometheus/rules`](../../deployment/monitoring/prometheus/rules); Loki rules are in [`loki/rules`](../../deployment/monitoring/loki/rules). Alertmanager [routes](../../deployment/monitoring/alertmanager/alertmanager.yml) incidents to Discord. `Watchdog` pings healthchecks.io so a stopped alert pipeline becomes visible. Grafana-managed alerts are no longer used.

Provisioned [dashboards](../../deployment/monitoring/grafana/dashboards/Kreditozrouti) cover the overview, API, scraper, web, MCP, host, and monitoring stack. The web dashboard includes Faro and Umami data.

Run `bash deployment/monitoring/validate.sh` from a checkout after changing Alloy, Loki, Alertmanager, or Prometheus rules. The repository's reusable verification workflow runs it as well.

## Deployment and secrets

Run **Actions > Deploy Monitoring** manually. The workflow uploads the deployment files to `~/kreditozrouti/versions/monitoring/<sha>/`, runs `monitoring/deploy.sh`, and updates the `current` link. It does not deploy on push. The script computes the Docker socket group ID, writes Alertmanager webhook files, pulls images, starts containers, waits for readiness, and grants Grafana read-only access to Umami's database.

Repository secrets used by this workflow are `GRAFANA_ADMIN_USER`, `GRAFANA_ADMIN_PASSWORD`, `DISCORD_WEBHOOK_URL`, `HEALTHCHECKS_PING_URL`, `UMAMI_DB_NAME`, `UMAMI_DB_USER`, `UMAMI_DB_PASSWORD`, and `UMAMI_APP_SECRET`, plus SSH credentials. Do not print these values or commit generated `.secrets/` files.

## Troubleshooting

If dashboards are empty, inspect `docker ps --filter label=com.docker.compose.project=kreditozrouti-monitoring` and Alloy logs. Check the Docker socket group, scrape labels, monitoring network, and Compose project name. If Faro or Umami data is missing, verify the browser's `VITE_*` settings and the `/faro/collect` or `/stats/stats.js` route on the relevant app domain. See [Docker images](DOCKER.md#web-runtime-configuration) for runtime replacement of web settings.

For a crash-looping Umami database after a PostgreSQL image upgrade, diagnose the volume before changing it. See the [PostgreSQL 18 runbook](HANDOFF-umami-pg18-migration.md).
