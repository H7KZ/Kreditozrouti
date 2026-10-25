# Monitoring

> **Superseded in part** (2026-10-25, [production hardening plan D5](https://github.com/H7KZ/Toolkit/tree/main/docs/plans/2026-10-production-hardening.md)): this repository no longer ships its own monitoring stack. One stack per host, owned and deployed by Infrastructure ([`monitoring/`](https://github.com/H7KZ/Infrastructure/tree/main/monitoring)), serves every repository on it; Kreditožrouti's rules, promtool tests, dashboards and Alloy module moved there unchanged. The collection contract below stands.

The [shared monitoring stack](https://github.com/H7KZ/Infrastructure/tree/main/monitoring/docker-compose.monitoring.yml) runs on the same VPS. Alloy (this project's module: [`alloy/kreditozrouti.alloy`](https://github.com/H7KZ/Infrastructure/tree/main/monitoring/alloy/kreditozrouti.alloy)) collects container and Traefik logs, API and scraper metrics, host and container metrics, browser Faro events, and route probes. It sends metrics to Prometheus and logs to Loki. Grafana serves dashboards at `https://monitoring.jankominek.com`; Alertmanager sends this project's alerts to its own Discord webhook (`DISCORD_WEBHOOK_URL_KREDITOZROUTI` in Infrastructure) and one host-wide Watchdog ping to healthchecks.io. Umami (one instance for every site, admin at `https://umami.jankominek.com`) provides product analytics through `/stats` on app domains.

Tracing is off unless `OTEL_EXPORTER_OTLP_ENDPOINT` is set. The current monitoring stack has no OTLP receiver or Tempo.

## Components and retention

| Component    | Role                                                |
| ------------ | --------------------------------------------------- |
| Alloy        | Collection, probes, Faro receiver                   |
| Prometheus   | Metrics, 15-day and 2 GB retention cap, alert rules |
| Alertmanager | Notification routing                                |
| Loki         | Logs, seven-day retention; Traefik logs three days  |
| Grafana      | Dashboards                                          |
| Umami        | Analytics (PostgreSQL storage)                      |

Image versions and retention settings live in Infrastructure's compose and config files. Umami retention (13 months) is Infrastructure's `umami-retention` toolkit job.

## Collection contract

This project's Alloy module keeps only the `kreditozrouti` and `kreditozrouti-dev` Compose projects. It derives `project`, `env`, `service`, `instance`, and `job` from Compose metadata. To expose metrics, a container joins `kreditozrouti-monitoring-network` and sets `prometheus.io/scrape=true` and `prometheus.io/port=<port>`. API serves `/metrics` on port 80; each scraper replica serves it on port 9101. Web and MCP do not expose metrics endpoints; Traefik metrics and probes cover their routes.

Traefik routers for the app use names matching `kreditozrouti-(api|web|mcp)-<suffix>` so Alloy can select their metrics and access logs. Changing those names requires a matching [Alloy module](https://github.com/H7KZ/Infrastructure/tree/main/monitoring/alloy/kreditozrouti.alloy) change in Infrastructure.

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

Prometheus rules are Infrastructure's [`prometheus/rules/kreditozrouti-*.yml`](https://github.com/H7KZ/Infrastructure/tree/main/monitoring/prometheus/rules) with promtool tests in [`prometheus/tests/kreditozrouti.test.yml`](https://github.com/H7KZ/Infrastructure/tree/main/monitoring/prometheus/tests); Loki rules are in [`loki/rules`](https://github.com/H7KZ/Infrastructure/tree/main/monitoring/loki/rules). Alertmanager [routes](https://github.com/H7KZ/Infrastructure/tree/main/monitoring/alertmanager/alertmanager.yml) this project's incidents to its Discord webhook. `Watchdog` pings healthchecks.io so a stopped alert pipeline becomes visible. Grafana-managed alerts are no longer used.

Provisioned [dashboards](https://github.com/H7KZ/Infrastructure/tree/main/monitoring/grafana/dashboards/Kreditozrouti) cover the overview, API, scraper, web, MCP, host, and monitoring stack. The web dashboard includes Faro and Umami data.

Run `bash monitoring/validate.sh` from an Infrastructure checkout after changing Alloy, Loki, Alertmanager, or Prometheus rules; its checks workflow runs it as well. A metric rename here must land together with the matching rule and dashboard change there.

## Deployment, secrets and troubleshooting

Deploying the stack, its secrets and recovery are Infrastructure's runbooks (deploy-and-release, secrets-and-config).
This repository's side: [Secrets and config](../runbooks/secrets-and-config.md#monitoring) and
[Troubleshooting](../runbooks/troubleshooting.md#monitoring).
