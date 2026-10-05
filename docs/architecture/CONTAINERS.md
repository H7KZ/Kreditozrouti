# Containers

| Environment | App processes                                                                                                                | Data and access                                                                                                              |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Local       | `make dev` runs API, web, scraper, MCP, and package watchers on the host; `make up` runs the full app stack in containers    | [Local Compose](../../docker-compose.local.yml) provides MySQL, Redis, optional loopback-only phpMyAdmin, and local Traefik. |
| Development | [Development Compose](../../deployment/development/docker-compose.development.yml) runs API, web, scraper, MCP, MySQL, Redis | Separate `-dev` networks and volumes.                                                                                        |
| Production  | [Production Compose](../../deployment/production/docker-compose.production.yml) runs the same services                       | Separate `-prod` networks and persistent MySQL/Redis volumes.                                                                |
| Monitoring  | [Monitoring Compose](../../deployment/monitoring/docker-compose.monitoring.yml) runs metrics, logs, and analytics services   | Its own Compose project and monitoring network.                                                                              |

The shared Traefik instance belongs to the separate Infrastructure repository for deployed environments. Root local Compose runs its own isolated Traefik for local routes (`/`, `/api`, and `/mcp`). `make dev` starts only MySQL and Redis; `make up` starts Traefik and all deployables too. MySQL and Redis publish ports for host-based development. phpMyAdmin starts only with the `admin` profile and binds to loopback.

Use the [deployment guide](../deployment/README.md) for operations and the [DNS guide](../setup/DNS.md) for public hostnames and TLS ownership. Compose files are the source for current image tags, replica counts, networks, and volumes.
