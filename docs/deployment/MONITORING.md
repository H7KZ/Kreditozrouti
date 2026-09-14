# Deployment - Observability Stack

End-to-end reference for metrics, logs, alerting and browser telemetry. The stack lives in
`../../deployment/monitoring/` and is deployed by `deploy-monitoring.yml` (manual dispatch only). It has the same
shape as the Ohlidame repository's stack (same components, label contract, dashboards, alert catalogue and Discord
template), written for this repository: there is no shared package or generator.

---

## Pipeline Overview

```
 app containers (api, scraper x2, mysqld-exporter, redis-exporter)      browser (Vue client)
 prometheus.io/scrape=true + prometheus.io/port=<n>                     Faro -> /faro/collect
 pino JSON on stdout                                                    Umami -> /stats
            |                                                                  |
            v                                                                  v
 +--------------------------------------------------------------+     Traefik (Infrastructure)
 | Alloy (the only collector)                                   | <-- /faro -> :12347 faro.receiver
 |  docker SD scrape, cAdvisor, node (host), blackbox probes,   |     /stats -> umami:3000
 |  Traefik metrics :8082 + access log, container logs          |
 +---------------------------+----------------------------------+
             remote_write    |    loki push
                  v          v
            Prometheus      Loki  ---- log rules ----+
                  |                                  v
            rule files ---------------------> Alertmanager --> Discord (one webhook)
                  |                                  +-------> healthchecks.io (Watchdog)
                  v
               Grafana (/grafana): dashboards over Prometheus, Loki, Alertmanager, Umami (read-only role)
```

No tracing: the api and scraper embed an OpenTelemetry SDK that is opt-in and off (`OTEL_EXPORTER_OTLP_ENDPOINT`
unset), and there is no OTLP receiver or Tempo.

---

## Components

| Component    | Image                                | Role                                                                            |
| ------------ | ------------------------------------ | ------------------------------------------------------------------------------- |
| Alloy        | `grafana/alloy:v1.19.2`              | All collection: scrapes, host/container metrics, probes, logs, Faro receiver    |
| Prometheus   | `prom/prometheus:v3.14.0`            | Metrics storage (15 days, 2 GB cap), recording + alert rules, remote-write sink |
| Alertmanager | `prom/alertmanager:v0.34.0`          | Routing, grouping, inhibition; Discord + healthchecks.io                        |
| Loki         | `grafana/loki:3.7.7`                 | Logs (7 days; Traefik access log 3 days), log alert rules                       |
| Grafana      | `grafana/grafana:13.2.1`             | Dashboards only (no Grafana-managed alerts), served at `/grafana`               |
| Umami        | `ghcr.io/umami-software/umami:3.3.1` | Product analytics, first-party at `/stats` on the app domains                   |
| umami-db     | `postgres:18.6-alpine`               | Umami storage (13-month retention, `umami-retention.yml`)                       |

The VPS (2 vCPU, 3.8 GB) also runs the Ohlidame stack, so every container has a lean memory limit and the collectors
are embedded in Alloy instead of separate exporter containers. Adding a component or raising a limit needs a reason.

Only Alloy reads `/var/run/docker.sock` (plus `/proc`, `/sys`, `/var/lib/docker` and the containerd socket for
cAdvisor). `deploy.sh` sets `DOCKER_GID` from the socket's group, so a wrong GID no longer silently empties everything.

### Label contract

Alloy keeps compose projects `kreditozrouti`, `kreditozrouti-dev` and `kreditozrouti-monitoring` only and drops every
other container on the VPS before any pipeline. Target labels come from compose metadata, never from the app:

| Label      | Value                                                                          |
| ---------- | ------------------------------------------------------------------------------ |
| `project`  | `kreditozrouti`                                                                |
| `env`      | `production`, `development` (the `-dev` compose project) or `ops` (monitoring) |
| `service`  | compose service name (`api`, `scraper`, `mysqld-exporter`, ...)                |
| `instance` | container name (`kreditozrouti-scraper-2`)                                     |
| `job`      | `kreditozrouti/<service>`                                                      |

A container only declares `prometheus.io/scrape=true` and `prometheus.io/port=<n>` and joins
`kreditozrouti-monitoring-network`. It is addressed by container name, because Docker SD reports only a container's
first network alphabetically.

Traefik series and access-log lines are kept only for routers named `kreditozrouti-(api|client|mcp)-<suffix>@docker`;
`env=development` is derived from a `dev` suffix. A new routed service needs adding to that regex in `config.alloy`.

### Redaction before storage

Client IPs, query strings and private path segments (`/s/<id>`, `/share/<id>`, `/ical/<id>`) are removed in Alloy
from Traefik access logs, container logs and Faro payloads. The client also redacts `/s/<id>` and query strings before
Faro or Umami send anything (`client/src/analytics.ts`). The privacy policy describes exactly this.

---

## Logging Standard

### Fields emitted by pino

Every log line carries these base fields (set in `../../api/src/logger.ts` and `../../scraper/src/logger.ts`):

| Field     | Type   | Example                      | Notes                                        |
| --------- | ------ | ---------------------------- | -------------------------------------------- |
| `level`   | string | `"INFO"`                     | Uppercase via `formatters.level`             |
| `service` | string | `"api"` / `"scraper"`        | Set as pino `base`                           |
| `env`     | string | `"production"`               | Set as pino `base` from `Config.env`         |
| `time`    | string | `"2024-01-15T10:23:00.000Z"` | ISO-8601 via `pino.stdTimeFunctions.isoTime` |
| `msg`     | string | `"http.request"`             |                                              |

HTTP request logs also carry (via `LoggerAPIContext`):

| Field         | Type   | Notes                                             |
| ------------- | ------ | ------------------------------------------------- |
| `context`     | string | `"http"` (JSON body field, not a Loki label)      |
| `request_id`  | string | UUID per request (structured metadata in Loki)    |
| `method`      | string | HTTP method                                       |
| `path`        | string | Request path (used by Alloy drop rule)            |
| `status_code` | number |                                                   |
| `duration_ms` | number |                                                   |
| `trace_id`    | string | Injected by `@opentelemetry/instrumentation-pino` |
| `span_id`     | string | Injected by `@opentelemetry/instrumentation-pino` |

Job logs carry (via `LoggerJobContext`):

| Field         | Type   | Notes                                                           |
| ------------- | ------ | --------------------------------------------------------------- |
| `context`     | string | `"job"` (JSON body field, not a Loki label)                     |
| `queue_name`  | string | BullMQ queue name (scraper); API `withJobLogger` emits `queue`) |
| `job_id`      | string |                                                                 |
| `job_name`    | string |                                                                 |
| `attempt`     | number |                                                                 |
| `duration_ms` | number |                                                                 |

### Log levels

| Level   | When to use                                           |
| ------- | ----------------------------------------------------- |
| `debug` | Routine details (dropped in production, level=`info`) |
| `info`  | Normal lifecycle events                               |
| `warn`  | 4xx responses, unexpected-but-recoverable situations  |
| `error` | 5xx responses, job failures, unhandled exceptions     |
| `fatal` | Startup failures that kill the process                |

### How to add logging in new code

```typescript
import { logger } from '@api/logger' // or @scraper/logger

// Root logger - for startup / module-level events
logger.info({ port: Config.port }, 'server.started')

// HTTP child logger (adds context: 'http' to the JSON body)
import LoggerAPIContext from '@api/Context/LoggerAPIContext'

LoggerAPIContext.log.warn({ user_id }, 'auth.forbidden')

// Job child logger (adds context: 'job' to the JSON body)
import LoggerJobContext from '@api/Context/LoggerJobContext'

LoggerJobContext.log.error({ err, duration_ms }, 'job.failed')

// Add fields to the current request's wide event
LoggerAPIContext.add({ user_id: session.userId })
// ... they are merged and emitted once on res.finish
```

**What not to do:**

- `console.log` - bypasses structured logging, not parsed as JSON by Alloy
- Raw `logger.info(message)` string only - always pass a data object as the first argument

---

## Logs in Loki

Config: `../../deployment/monitoring/alloy/config.alloy`, `../../deployment/monitoring/loki/loki.yml`.

| Label     | Values                                           | Source                                    |
| --------- | ------------------------------------------------ | ----------------------------------------- |
| `project` | `kreditozrouti`                                  | Alloy                                     |
| `env`     | `production`, `development`, `ops`               | compose project (Faro: `app_environment`) |
| `service` | compose service; `client` for Faro               | compose metadata                          |
| `source`  | `docker`, `traefik`, `faro`                      | pipeline                                  |
| `level`   | pino `level`; Traefik derives it from the status | log line                                  |
| `kind`    | `exception`, `measurement`, ... (Faro only)      | Faro                                      |

Structured metadata (not indexed): `request_id`, `trace_id`, `job_name` for container logs; `router`, `status`,
`method` for Traefik lines. Everything else (including `context`, `path`, `status_code`) stays in the JSON body.

Container log lines whose `path` is `/health` or `/metrics` are dropped. Web Vitals from Faro are also turned into
Prometheus histograms (`faro_web_vitals_*`) by Alloy.

```logql
# Errors from the production api
{project="kreditozrouti", service="api", env="production", level="ERROR"}

# HTTP 5xx with request id
{project="kreditozrouti", service="api", source="docker"} | json | context="http" | status_code >= 500

# Scraper job failures
{project="kreditozrouti", service="scraper", level="ERROR"} | json | context="job"

# One request by id (structured metadata)
{project="kreditozrouti", service="api"} | request_id="550e8400-e29b-41d4-a716-446655440000"

# Browser exceptions
{project="kreditozrouti", source="faro", kind="exception", env="production"}
```

---

## Metrics

| Metric                                                 | Type      | Labels                           | Where                                                      |
| ------------------------------------------------------ | --------- | -------------------------------- | ---------------------------------------------------------- |
| `app_build_info`                                       | Gauge     | `app`, `version`, `commit`       | api, scraper (build args `APP_VERSION`, `GIT_SHA`)         |
| `http_server_request_duration_seconds`                 | Histogram | `method`, `route`, `status_code` | api; `route` is the mounted pattern or `unmatched`         |
| `bullmq_job_count`                                     | Gauge     | `queue`, `state`                 | api only (both queues, read at scrape time)                |
| `worker_jobs_total`                                    | Counter   | `queue`, `job_name`, `outcome`   | api (response worker), each scraper replica (request)      |
| `worker_job_duration_seconds`                          | Histogram | `queue`, `job_name`              | same                                                       |
| `worker_last_success_timestamp_seconds`                | Gauge     | `queue`, `job_name`              | same; feeds `ScheduledJobStale`                            |
| `scraper_silent_failures_total`                        | Counter   | `job_type`                       | scraper; jobs that caught an InSIS error and returned null |
| Node.js defaults                                       | various   |                                  | `collectDefaultMetrics`                                    |
| `traefik_router_*`, `node_*`, `container_*`, `probe_*` | various   |                                  | Alloy (Traefik, host, cAdvisor, blackbox)                  |
| `mysql_*`, `redis_*`                                   | various   |                                  | `mysqld-exporter`, `redis-exporter` containers             |

Nothing is mirrored through Redis any more: counters live in the process that does the work, so a restart resets
them and the rules use `increase()`. `/metrics` answers 404 to any request carrying a proxy header (`x-forwarded-for`,
`x-real-ip`, `cf-connecting-ip`, `cf-ray`), so `https://<domain>/api/metrics` is never public. Each scraper replica
serves its own endpoint on port 9101; keep one worker process per container (cluster mode would make forks share it).

The client (nginx) and mcp expose no `/metrics`; their traffic, errors and latency come from Traefik router metrics.

---

## Alerting

Rules: `../../deployment/monitoring/prometheus/rules/{alerts,recording}.yml` and
`../../deployment/monitoring/loki/rules/fake/alerts.yml`. Routing: `../../deployment/monitoring/alertmanager/`.

- **Every alert has promtool unit tests** in `prometheus/tests/alerts.test.yml`, run by
  `deployment/monitoring/validate.sh` (promtool, amtool, `loki -verify-config`, `alloy validate`, with the deployed
  images). CI runs it in `_verify.yml`. Annotations may template only `{{ $labels.x }}`, because promtool compares them
  exactly.
- **Catalogue:** `ServiceDown` (uses `absent()`, a stopped container's series vanish), `OriginProbeFailing`,
  `EdgeErrorBudgetBurnFast/Slow`, `ApiSlowRequests` (over 1 s), `WorkerJobsFailing`, `QueueBacklog`,
  `ScheduledJobStale` (Gap Sweep every 4 h, Academic Schedules daily), `MySQLDown`, `MySQLConnectionsHigh`,
  `RedisDown`, `RedisMemoryHigh`, host disk/memory/swap, `ContainerOOMKilled`, `ContainerRestartLoop`, monitoring
  self-checks, `LogErrorBurst`, `FrontendErrorSpike`, `Watchdog`.
- **Dead-man's switch:** `Watchdog` always fires; Alertmanager pings healthchecks.io with it every minute, and
  healthchecks.io e-mails if the pings stop. `AlertDeliveryFailing` inhibits Watchdog, so a broken Discord webhook
  also ends up as an e-mail.
- **Probes go to Traefik internally** (`https://traefik` with Host + SNI): Cloudflare 403s the VPS's own IP.
- **Discord:** grouped by `alertname, project, service, env`; critical alerts repeat every 4 h and mention `@here`.
- Grafana-managed alerting is gone. `grafana/provisioning/alerting/legacy-cleanup.yml` deletes the old rules, contact
  point and templates on the first deploy, so `scripts/sync-grafana-alerts.sh` is no longer needed.

Secrets (repository-level): `GRAFANA_ADMIN_USER`, `GRAFANA_ADMIN_PASSWORD`, `DISCORD_WEBHOOK_URL`,
`HEALTHCHECKS_PING_URL`, `UMAMI_DB_NAME`, `UMAMI_DB_USER`, `UMAMI_DB_PASSWORD`, `UMAMI_APP_SECRET` (+ SSH). Alertmanager
reads webhook URLs from files that `deploy.sh` writes to `.secrets/`.

---

## Dashboards

Provisioned from `../../deployment/monitoring/grafana/dashboards/Kreditozrouti/` (one folder):
`overview`, `service-api`, `service-scraper`, `service-client`, `service-mcp`, `data` (MySQL/Redis/queues), `host`,
`frontend` (Faro + Umami), `monitoring` (the stack itself). Every panel filters on `project` and `$env`.

---

## Troubleshooting

### Dashboards show no data

```bash
docker compose -p kreditozrouti-monitoring ps
docker exec kreditozrouti-monitoring-prometheus-1 wget -qO- \
  'http://localhost:9090/api/v1/query?query=up{project="kreditozrouti"}'
docker exec kreditozrouti-monitoring-prometheus-1 wget -qO- http://alloy:12345/-/ready
```

- A service missing from `up`: its container lacks `prometheus.io/scrape|port`, is not on
  `kreditozrouti-monitoring-network`, or its compose project is not one of the three kept.
- Nothing at all: check `docker logs kreditozrouti-monitoring-alloy-1` for docker socket permission errors.

### Faro or Umami data missing

- Faro and Umami are off on any host other than the deployed domains, and Umami needs `VITE_UMAMI_WEBSITE_ID`.
- `https://<domain>/faro/collect` and `https://<domain>/stats/stats.js` must be routed (Alloy and Umami Traefik labels).
- Query `{project="kreditozrouti", source="faro"}` in Explore.
