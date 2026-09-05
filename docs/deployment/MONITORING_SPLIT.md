# Splitting the monitoring stack onto its own host

The monitoring stack (Prometheus + Grafana + Loki + Alloy + Postgres + Umami) is the single heaviest
tenant on the production VPS - roughly 2.5 GB of memory limits and a growing
`kreditozrouti-prometheus-volume` / `kreditozrouti-loki-volume` footprint on the same 38 GB disk as the app. On the 4 GB production host it competes for
RAM/disk with the very app it monitors, and when the host is starved it OOM-kills Prometheus + API
together, producing the `DatasourceNoData` alert storms.

This is a draft runbook for moving it to a second, small host. It requires provisioning that host;
nothing here changes automatically.

## Target shape

```
prod VPS (4 GB)                     monitoring VPS (2 GB is plenty)
  app stack + traefik                 prometheus, grafana, loki, alloy, umami(+db)
  alloy (log shipper) ── logs ──►     loki
  /metrics endpoints  ◄── scrape ──   prometheus
```

Two data flows cross the network:

1. **Metrics (pull):** Prometheus on the monitoring host scrapes the app containers on the prod host.
2. **Logs (push):** an Alloy agent stays on the prod host (it needs the local Docker socket) and
   pushes to Loki on the monitoring host.

## Private networking first

Do NOT expose Prometheus/Loki on the public internet. Put both hosts on a private network before
anything else:

- Tailscale / WireGuard (simplest), or a cloud provider private network (Hetzner private net).
- All cross-host addresses below are the private IPs / MagicDNS names on that network.

## Steps

1. **Provision** the monitoring host, install Docker (`scripts/install-docker.sh`), join it to the
   private network, and run `scripts/setup-automation.sh` there too (swap + cleanup + maintenance).

2. **Move the monitoring stack** (`deployment/monitoring/`) to the monitoring host and deploy it
   there (Traefik + this stack). Grafana keeps its public route via that host's Traefik, or stays
   private and is reached over the tunnel.

3. **Repoint Prometheus scraping.** `prometheus.yml` currently uses Docker service discovery over the
   local `/var/run/docker.sock`. Off-box it can no longer read the prod Docker socket, so switch the
   prod app targets to either:
   - static targets pointing at the prod host's private IP + the app metrics ports, or
   - Docker SD against the prod host's Docker API exposed over the private network (TLS-protected).
   Keep scrape of node/cadvisor exporters if present.

4. **Keep Alloy on the prod host.** Alloy reads the local Docker socket and the Traefik log volume,
   so it must run where the containers are. Change only its Loki write endpoint to the monitoring
   host: `http://<monitoring-private-ip>:3100/loki/api/v1/push` in `alloy/config.alloy`. Remove Loki
   (and Prometheus/Grafana/Umami) from the prod-side compose - leave prod running just the app +
   Traefik + Alloy.

5. **Faro / browser telemetry.** The Faro receiver lives inside Alloy on the prod host (routed at
   `/faro` by prod Traefik), so browser telemetry keeps working unchanged; only Alloy's upstream Loki
   address moves.

6. **Firewall.** On the monitoring host, allow `3100` (Loki) and the Grafana/scrape ports ONLY from
   the private network CIDR. On the prod host, allow the metrics ports only from the monitoring host.

## What each host runs afterwards

| Host            | Runs                                                        |
|-----------------|-------------------------------------------------------------|
| prod VPS        | traefik, api, scraper, client, mcp, mysql, redis, phpmyadmin, **alloy** |
| monitoring VPS  | traefik, prometheus, grafana, loki, umami, umami-db          |

## If you must keep it co-located (no second host yet)

Interim mitigations already applied in-repo:

- Prometheus retention `15d -> 7d` + `retention.size=2GB` cap.
- Loki retention `720h -> 168h` (7d) + ingestion caps.
- Monitoring service memory limits tightened (grafana, umami-db).
- Swap ensured via `setup-automation.sh` so spikes don't OOM-kill.

If it still OOMs, the cheapest lever is dropping **Umami + its Postgres** from the prod box (~0.8 GB)
and self-hosting analytics elsewhere, or accept Grafana Cloud's free tier for metrics/logs and run
nothing observability-related locally.
