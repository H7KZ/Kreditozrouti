# Containers

| Environment | App processes | Data and access |
|-------------|---------------|-----------------|
| Local | API, web, and scraper run on the host with `make dev` | [Local Compose](../../docker-compose.local.yml) provides MySQL, Redis, and loopback-only phpMyAdmin. |
| Development | [Development Compose](../../deployment/development/docker-compose.development.yml) runs API, web, scraper, MCP, MySQL, Redis | Separate `-dev` networks and volumes. |
| Production | [Production Compose](../../deployment/production/docker-compose.production.yml) runs the same services | Separate `-prod` networks and persistent MySQL/Redis volumes. |
| Monitoring | [Monitoring Compose](../../deployment/monitoring/docker-compose.monitoring.yml) runs metrics, logs, and analytics services | Its own Compose project and monitoring network. |

The shared Traefik instance belongs to the separate Infrastructure repository. This repo attaches public services to `public-network`; MySQL and Redis stay on internal networks. The scraper reaches Redis but not MySQL. phpMyAdmin starts only with the `admin` profile and binds to loopback for SSH-tunnel access.

Use the [deployment guide](../deployment/README.md) for operations and the [DNS guide](../setup/DNS.md) for public hostnames and TLS ownership. Compose files are the source for current image tags, replica counts, networks, and volumes.
