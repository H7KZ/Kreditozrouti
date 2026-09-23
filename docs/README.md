# Developer Documentation

Internal reference for Kreditožrouti engineers. Not linked from the user-facing docs.

## Sections

- [Architecture](architecture/) - system design, data flow, containers
- [API](api/) - HTTP endpoints, controllers, middleware
- [Web](web/) - Vue 3 SPA, stores, composables
- [Scraper](scraper/) - BullMQ worker, InSIS scraping
- [MCP server](mcp/) - LLM tool access to VŠE data
- [Deployment](deployment/) - Docker, CI/CD, operations
- [Engineering](engineering/) - local setup and contributing
- [Manual setup](setup/) - Gmail delivery and DNS/HTTPS requirements
- [Agent instruction research](dev/research/agent-instructions.md) - why `AGENTS.md` is the shared source

The [shared reference](shared/) and parts of the [monorepo reference](architecture/MONOREPO.md) still describe the
older `shared/` layout. Current shared types live in `packages/types/`; reusable services and domain logic live in
`packages/core/`. Use their source until those detail pages are refreshed.
