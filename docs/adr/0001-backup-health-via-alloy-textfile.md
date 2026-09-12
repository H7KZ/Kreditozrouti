---
status: accepted
date: 2026-09-12
---

# Backup health reaches Prometheus by push, not by the Docker-SD pull everything else uses

Every other metric in this stack is pulled: `deployment/monitoring/prometheus/prometheus.yml` runs a single
Docker-SD job that discovers containers carrying `prometheus.io/scrape=true`. Backup health cannot use that
path, because the backup is a host-level systemd timer running `scripts/backup-mysql.sh`, not a container.
We therefore give Alloy its first `prometheus.*` pipeline: `prometheus.exporter.unix` with
`set_collectors = ["textfile"]` reading `*.prom` files the backup script writes, scraped by
`prometheus.scrape` and pushed to Prometheus via `prometheus.remote_write`. This requires adding
`--web.enable-remote-write-receiver` to the Prometheus command args.

## Considered options

**Pushgateway** was the closer fit to the existing architecture: it is a container, so the Docker-SD job would
have discovered it with only the three `prometheus.io` labels and no change to `prometheus.yml` at all. It was
rejected because it adds a container and an image to pin on a host the production compose header describes as
sized for 4GB, and because Prometheus' own guidance prefers the textfile collector for machine-level batch jobs.
Alloy is already running, already on `kreditozrouti-monitoring-network`, and already mounts host paths.

**Alerting on an absent Loki log line** was rejected because absence-detection in LogQL is fiddlier than a
timestamp gauge, and it would couple backup health to Loki retention.

**Exporting the gauge from the API's existing `/metrics`** was rejected because it makes a dead API mask a dead
backup, which is precisely the correlated failure the alert exists to catch.

## Consequences

The alert is deliberately written against `backup_last_success_timestamp` staleness rather than against a
non-zero exit code. An exit-code alert only fires when the script runs; a staleness alert also catches the timer
being disabled, the unit failing to start, or the host being down, which are the likelier silent failures.

Alloy now carries metrics as well as logs. Anyone reading `config.alloy` expecting a logs-only pipeline will be
surprised, which is why this file exists.
