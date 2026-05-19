# Architecture

High-level documentation for developers learning the Kreditožrouti system.

---

## Documents

| Doc | What it covers |
|-----|---------------|
| [MONOREPO.md](MONOREPO.md) | pnpm workspaces, package roles, cross-package import rules, TypeScript path aliases |
| [SERVICES.md](SERVICES.md) | What each service does, responsibilities, why it's a separate process |
| [DATA_FLOW.md](DATA_FLOW.md) | End-to-end: user action → API → BullMQ → Scraper → InSIS → DB → Client |
| [CONTAINERS.md](CONTAINERS.md) | Docker Compose topology, networks, volumes, local vs production |

---

## One-line summary

Kreditožrouti is a **three-process monorepo** (API + Client + Scraper) sharing types through a `shared` package. The Scraper never talks to the database directly — it communicates with the API exclusively through a BullMQ job queue backed by Redis. MySQL is the system of record; Redis is ephemeral (queues + sessions).
