# Monitoring

The [monitoring stack](../../deployment/monitoring/docker-compose.monitoring.yml) runs alongside the app on the same VPS. [Alloy](../../deployment/monitoring/alloy/config.alloy) collects container and Traefik logs, API and scraper metrics, host and container metrics, browser Faro events, and route probes. It sends metrics to Prometheus and logs to Loki. Grafana serves dashboards at `https://kreditozrouti.cz/grafana/`; Alertmanager sends alerts to Discord and a Watchdog ping to healthchecks.io. Umami provides product analytics through `/stats` on app domains.

Tracing is off unless `OTEL_EXPORTER_OTLP_ENDPOINT` is set. The current monitoring stack has no OTLP receiver or Tempo.

## Components and retention

| Component    | Current image                        | Role                                                |
| ------------ | ------------------------------------ | --------------------------------------------------- |
| Alloy        | `grafana/alloy:v1.20.1`              | Collection, probes, Faro receiver                   |
| Prometheus   | `prom/prometheus:v3.15.0`            | Metrics, 15-day and 2 GB retention cap, alert rules |
| Alertmanager | `prom/alertmanager:v0.34.1`          | Notification routing                                |
| Loki         | `grafana/loki:3.7.8`                 | Logs, seven-day retention; Traefik logs three days  |
| Grafana      | `grafana/grafana:13.2.4`             | Dashboards                                          |
| Umami        | `ghcr.io/umami-software/umami:3.4.0` | Analytics                                           |
| Umami DB     | `postgres:18.6-alpine`               | Analytics storage                                   |

Umami retention is the `umami-retention` toolkit job (`deployment/monitoring/umami/retain.sh`, declared in `deployment/toolkit.conf`). Host Sync installs and enables its timer (daily 03:17 Europe/Prague); run `sudo deployment/toolkit job umami-retention` once by hand to validate it.

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

## Deployment, secrets and troubleshooting

Deploying the stack, its secrets and recovery are operational procedures: [Deploy and release](../runbooks/deploy-and-release.md#deploy-monitoring),
[Secrets and config](../runbooks/secrets-and-config.md#monitoring-monitoring) and [Troubleshooting](../runbooks/troubleshooting.md#monitoring).
Moving monitoring to another host is a [draft](../runbooks/split-to-own-server.md#monitoring-on-a-separate-host-not-implemented).
