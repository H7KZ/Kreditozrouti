# Draft: move monitoring to a separate host

**Proposal only.** The current [monitoring Compose file](../../deployment/monitoring/docker-compose.monitoring.yml) runs Prometheus, Alertmanager, Loki, Alloy, Grafana, Umami, and its PostgreSQL database together on the app host. No cross-host deployment is implemented.

Moving monitoring could free memory and disk on the shared VPS. It requires more than moving the Compose project: Alloy currently reads the local Docker socket and Traefik logs, discovers app containers, receives Faro, and pushes metrics and logs to local services.

Before implementing a split, design these links over private networking:

| Flow | Current dependency | Required change |
| --- | --- | --- |
| App metrics | Alloy discovers local Docker containers and remote-writes to Prometheus | Keep an app-host Alloy agent or expose authenticated private scrape targets |
| Container and Traefik logs | Alloy reads local Docker and Traefik files | Keep an app-host agent and send to remote Loki |
| Faro | App-domain `/faro` route terminates at Alloy | Keep the receiver reachable from shared Traefik |
| Grafana and Umami | Public routes attach to `public-network` | Provide proxy access to the monitoring host or place these routes behind private access |
| Umami data | Named PostgreSQL volume | Plan a backed-up database migration and verification |

Prometheus and Loki must stay private. Define authentication, firewall rules, volume backup, failure behavior, and an operator rollback before changing Compose files. The existing [monitoring reference](MONITORING.md) describes the current topology.
