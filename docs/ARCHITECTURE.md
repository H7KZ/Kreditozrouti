# Architecture

> Full reference: [docs/architecture/](architecture/README.md)

| Doc                                         | What it covers                                                                      |
|---------------------------------------------|-------------------------------------------------------------------------------------|
| [MONOREPO.md](architecture/MONOREPO.md)     | pnpm workspaces, package roles, cross-package import rules, TypeScript path aliases |
| [SERVICES.md](architecture/SERVICES.md)     | What each service does, responsibilities, why it's a separate process               |
| [DATA_FLOW.md](architecture/DATA_FLOW.md)   | End-to-end: user action → API → BullMQ → Scraper → InSIS → DB → Client              |
| [CONTAINERS.md](architecture/CONTAINERS.md) | Docker Compose topology, networks, volumes, local vs production                     |
