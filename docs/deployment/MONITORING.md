# Deployment — Observability Stack

End-to-end reference for the logging, metrics, tracing, and browser telemetry pipeline.

---

## Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  App containers (api × 2, scraper × 5)                              │
│  pino → JSON to stdout                                              │
└────────────────────┬────────────────────────────────────────────────┘
                     │ Docker stdout (json-file driver)
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Alloy (log shipping + OTLP receiver)                               │
│  - discovery.docker  reads container stdout via /var/run/docker.sock│
│  - loki.process      parses JSON, extracts stream labels            │
│  - faro.receiver     accepts browser telemetry on :12347            │
│  - otelcol.receiver  accepts OTLP traces from api/scraper on :4317/8│
└──────────┬──────────────────────────┬───────────────────────────────┘
           │ Loki push API            │ OTLP traces
           ▼                          ▼
┌────────────────────┐     ┌────────────────────┐
│  Loki              │     │  Tempo             │
│  log storage       │     │  trace storage     │
│  :3100             │     │  :3200             │
└────────┬───────────┘     └────────┬───────────┘
         │                          │
         └──────────┬───────────────┘
                    ▼
         ┌────────────────────┐
         │  Grafana           │
         │  dashboards + query│
         │  :3000 → /grafana  │
         └────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  API containers                                                     │
│  prom-client → /metrics                                             │
└────────────────────┬────────────────────────────────────────────────┘
                     │ HTTP scrape every 15 s
                     ▼
         ┌────────────────────┐
         │  Prometheus        │
         │  metrics storage   │
         │  :9090             │
         └────────┬───────────┘
                  │
                  ▼
         ┌────────────────────┐
         │  Grafana           │
         └────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  Browser (Vue client)                                               │
│  @grafana/faro-web-sdk → POST /faro/collect                         │
└────────────────────┬────────────────────────────────────────────────┘
                     │ Traefik strips /faro prefix
                     ▼
         ┌────────────────────┐
         │  Alloy :12347      │
         │  faro.receiver     │
         └────────┬───────────┘
                  │ Loki push
                  ▼
         ┌────────────────────┐
         │  Loki              │
         └────────────────────┘
```

---

## Components

| Component     | Image                       | Role                                                  |
|---------------|-----------------------------|-------------------------------------------------------|
| Alloy         | `grafana/alloy:latest`      | Log shipping (Docker socket), Faro receiver, OTLP relay |
| Loki          | `grafana/loki:3`            | Log storage (30-day retention, filesystem backend)    |
| Tempo         | `grafana/tempo:latest`      | Distributed trace storage (7-day retention)           |
| Prometheus    | `prom/prometheus:latest`    | Metrics scraping and storage (15-day retention)       |
| Grafana       | `grafana/grafana:latest`    | Dashboards and alerting (served at `/grafana`)        |
| node-exporter | `prom/node-exporter:latest` | Host CPU / memory / disk metrics                      |

All components run in the `monitoring-network` Docker network. Grafana and Alloy also join `traefik-network`
(for public routing). API and scraper join `alloy-network` (for OTLP push to Alloy).

---

## Logging Standard

### Fields emitted by pino

Every log line carries these base fields (set in `api/src/logger.ts` and `scraper/src/logger.ts`):

| Field       | Type   | Example              | Notes                                      |
|-------------|--------|----------------------|--------------------------------------------|
| `level`     | string | `"INFO"`             | Uppercase via `formatters.level`           |
| `service`   | string | `"api"` / `"scraper"`| Set as pino `base`                        |
| `env`       | string | `"production"`       | Set as pino `base` from `Config.env`       |
| `time`      | string | `"2024-01-15T10:23:00.000Z"` | ISO-8601 via `pino.stdTimeFunctions.isoTime` |
| `msg`       | string | `"http.request"`     |                                            |

HTTP request logs also carry (via `LoggerAPIContext`):

| Field        | Type   | Notes                                             |
|--------------|--------|---------------------------------------------------|
| `context`    | string | `"http"` (stream label in Loki)                   |
| `request_id` | string | UUID per request (structured metadata in Loki)    |
| `method`     | string | HTTP method                                       |
| `path`       | string | Request path (used by Alloy drop rule)            |
| `status_code`| number |                                                   |
| `duration_ms`| number |                                                   |
| `trace_id`   | string | Injected by `@opentelemetry/instrumentation-pino` |
| `span_id`    | string | Injected by `@opentelemetry/instrumentation-pino` |

Job logs carry (via `LoggerJobContext`):

| Field        | Type   | Notes                             |
|--------------|--------|-----------------------------------|
| `context`    | string | `"job"` (stream label in Loki)    |
| `queue`      | string |                                   |
| `job_id`     | string |                                   |
| `job_name`   | string |                                   |
| `attempt`    | number |                                   |
| `duration_ms`| number |                                   |

### Log levels

| Level   | When to use                                          |
|---------|------------------------------------------------------|
| `debug` | Routine details (dropped in production, level=`info`)|
| `info`  | Normal lifecycle events                              |
| `warn`  | 4xx responses, unexpected-but-recoverable situations |
| `error` | 5xx responses, job failures, unhandled exceptions    |
| `fatal` | Startup failures that kill the process               |

### How to add logging in new code

```typescript
import { logger } from '@api/logger'         // or @scraper/logger

// Root logger — for startup / module-level events
logger.info({ port: Config.port }, 'server.started')

// HTTP child logger (adds context: 'http' stream label)
import LoggerAPIContext from '@api/Context/LoggerAPIContext'
LoggerAPIContext.log.warn({ user_id }, 'auth.forbidden')

// Job child logger (adds context: 'job' stream label)
import LoggerJobContext from '@api/Context/LoggerJobContext'
LoggerJobContext.log.error({ err, duration_ms }, 'job.failed')

// Add fields to the current request's wide event
LoggerAPIContext.add({ user_id: session.userId })
// ... they are merged and emitted once on res.finish
```

**What not to do:**
- `console.log` — bypasses structured logging, no labels extracted by Alloy
- Raw `logger.info(message)` string only — always pass a data object as the first argument

---

## Alloy Pipeline

Config: `deployment/monitoring/alloy/config.alloy`

### Container log collection

1. `discovery.docker` discovers all containers via Docker socket
2. `discovery.relabel` drops monitoring infra containers (grafana, prometheus, loki, alloy, node-exporter, umami, postgres)
3. `loki.source.docker` reads stdout from surviving containers
4. `loki.process.parse_json`:
   - `stage.json` extracts `level`, `service`, `env`, `context`, `request_id`, `path`, `trace_id`, `span_id`
   - `stage.drop` discards `/health` and `/metrics` path logs (high-frequency, zero signal)
   - `stage.labels` promotes `level`, `service`, `env`, `context` to Loki stream labels
   - `stage.structured_metadata` stores `request_id`, `trace_id`, `span_id` as per-log metadata (not stream labels — avoids cardinality explosion)
5. `loki.write` pushes to `http://loki:3100/loki/api/v1/push`

### Faro browser telemetry

1. `faro.receiver` listens on `:12347` (Traefik routes `/faro/*` here)
2. `loki.process.faro_labels`:
   - `stage.static_labels` sets `app="kreditozrouti"`
   - `stage.logfmt` extracts `kind`, `environment`
   - `stage.labels` promotes `kind` and `env` (from `environment`) as stream labels
3. Traces forwarded to Tempo via `otelcol.processor.batch` → `otelcol.exporter.otlp`

### OTLP traces

1. `otelcol.receiver.otlp` listens on `:4317` (gRPC) and `:4318` (HTTP/protobuf)
2. `otelcol.processor.batch` batches spans
3. `otelcol.exporter.otlp` forwards to Tempo at `tempo:4317`

---

## Loki Stream Labels

These labels are indexed and should be used in LogQL `{}` selectors:

| Label     | Values                                | Source            |
|-----------|---------------------------------------|-------------------|
| `level`   | `INFO`, `WARN`, `ERROR`, `DEBUG`      | pino `level` field |
| `service` | `api`, `scraper`                      | pino `base.service` |
| `env`     | `production`, `development`           | pino `base.env`    |
| `context` | `http`, `job`, *(none for startup)*   | pino child logger  |
| `app`     | `kreditozrouti`                       | Faro logs only     |
| `kind`    | `exception`, `log`, `measurement`, `web-vital` | Faro logs only |

Structured metadata (not indexed, use `| json` or `| logfmt` to filter):

| Key         | Source                                   |
|-------------|------------------------------------------|
| `request_id`| per-HTTP-request UUID                    |
| `trace_id`  | OTel span trace ID (if active span)      |
| `span_id`   | OTel span ID (if active span)            |

---

## Grafana Dashboards

Provisioned from `deployment/monitoring/grafana/provisioning/dashboards/`.

| Dashboard          | UID                    | Datasource  | Covers                                              |
|--------------------|------------------------|-------------|-----------------------------------------------------|
| API                | `kreditozrouti-api`    | Prometheus  | Request rate, error rate, latency histograms, BullMQ queue depth |
| Scraper            | `kreditozrouti-scraper`| Prometheus  | Queue depth, silent failures, items processed, last-run timestamp |
| Log Explorer       | `kreditozrouti-logs`   | Loki        | Searchable log view for api + scraper, filterable by level / context / job |
| Client (Browser)   | `kreditozrouti-client` | Loki        | JS exceptions, Web Vitals, navigation events from Faro |

### Common LogQL queries

```logql
# All errors from the API in the last hour
{service="api", level="ERROR", env="production"}

# HTTP 5xx with request ID
{service="api", context="http", level="ERROR"} | json | status_code >= 500

# Scraper job failures
{service="scraper", context="job", level="ERROR"}

# Specific request by ID (structured metadata filter)
{service="api"} | json | request_id = "550e8400-e29b-41d4-a716-446655440000"

# Browser JS exceptions
{app="kreditozrouti", kind="exception", env="production"}
```

### Trace correlation

When a log line contains a `trace_id` field (present when OTel has an active span), Grafana shows an
**Open in Tempo** link that jumps to the matching trace. The Loki datasource derivedField
`matcherRegex: '"trace_id":"(\w+)"'` drives this.

---

## Prometheus Metrics

Scraped from `api:80/metrics` every 15 s. The `/metrics` endpoint is only accessible from inside the Docker
network — it returns 404 for requests with an `x-forwarded-for` header (i.e. via Traefik).

| Metric                           | Type      | Labels                        | Notes                          |
|----------------------------------|-----------|-------------------------------|--------------------------------|
| `http_request_duration_seconds`  | Histogram | `method`, `route`, `status_code`, `env` | HTTP latency + rate     |
| `bullmq_queue_depth`             | Gauge     | `queue`, `status`, `env`      | Collected at scrape time       |
| `scraper_silent_failures_total`  | Gauge     | `job_type`, `env`             | From Redis counters            |
| `scraper_items_processed_total`  | Gauge     | `job_type`, `status`, `env`   | From Redis counters            |
| `scraper_last_run_timestamp`     | Gauge     | `job_type`, `env`             | Unix seconds; 0 = never        |
| Node.js defaults                 | various   | —                             | GC, event loop, memory via `collectDefaultMetrics` |
| Host metrics                     | various   | —                             | node-exporter: CPU, disk, network |

The `env` label is added by Prometheus `relabel_configs` in `prometheus.yml` / `prometheus.local.yml`,
not by prom-client itself.

---

## Troubleshooting

### Grafana dashboards show no data

1. Check Alloy is running and healthy:
   ```bash
   docker compose -p global logs alloy
   docker compose -p global ps alloy
   ```

2. Check Loki received any logs:
   ```bash
   # Query Loki API directly
   curl -s 'http://localhost:3100/loki/api/v1/labels' | jq
   ```
   If `data` is empty, no logs have been ingested.

3. Check Alloy can reach Loki:
   ```bash
   docker compose -p global exec alloy wget -O- http://loki:3100/ready
   ```

4. Check app containers are discoverable:
   ```bash
   docker compose -p global exec alloy \
     wget -O- 'http://localhost:12345/api/v0/component/discovery.docker.containers/info'
   ```
   Alloy's HTTP UI is also available at `alloy:12345` from within `monitoring-network`.

5. Check Prometheus can scrape the API:
   ```bash
   # From within the monitoring network
   docker compose -p global exec prometheus \
     wget -O- http://api:80/metrics | head
   ```

6. Verify the monitoring networks are wired correctly:
   ```bash
   docker network inspect alloy-network   # api, scraper, alloy should appear
   docker network inspect monitoring-network  # alloy, loki, prometheus, grafana, tempo
   ```

### Alloy sees containers but Loki has no data

The most common cause is that all log lines are being dropped. Alloy drops:
- Containers whose name matches `/(grafana|prometheus|loki|alloy|node-exporter|umami|postgres).*`
- Log lines where `path` matches `^/(health|metrics)$`

If all your test requests hit `/health`, no logs will appear in Loki.

### Trace links don't appear in Grafana

Trace context is only injected into pino when there is an active OpenTelemetry span. Spans are created
automatically for HTTP requests via `@opentelemetry/instrumentation-http` (included in
`getNodeAutoInstrumentations`). If `OTEL_EXPORTER_OTLP_ENDPOINT` is not set or the endpoint is unreachable,
the SDK will fail silently but spans will still be created locally — trace IDs will appear in logs.

Check that `alloy-network` is attached to both `api` and `scraper` containers.

### Faro data missing in Client dashboard

- Confirm `VITE_FARO_COLLECTOR_URL` is set on the client container
- Check browser console for Faro errors
- Query Loki for `{app="kreditozrouti"}` — data should appear within 30 s of a browser event
- Check Alloy logs: `docker compose -p global logs alloy | grep faro`
