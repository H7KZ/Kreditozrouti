# Architecture

Kreditožrouti separates public interfaces, scraping, and persistence across four application services. Shared packages hold domain logic and contracts.

- [Monorepo](MONOREPO.md) - workspace packages and import boundaries
- [Services](SERVICES.md) - responsibilities of API, web, scraper, and MCP
- [Data flow](DATA_FLOW.md) - course search and refresh paths
- [Containers](CONTAINERS.md) - local and deployed topology
