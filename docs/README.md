# Developer documentation

This folder holds developer references and setup guides. Published student help lives in [`apps/web/src/pages/docs/`](../apps/web/src/pages/docs/); [`user/`](user/) points to it.

## Work on the system

- [Engineering](engineering/) - local setup and contribution workflow
- [Architecture](architecture/) - package boundaries and data flow
- [Domain glossary](DOMAIN.md) - shared terminology
- [Shared packages](shared/) - types, domain logic, HTTP and queue contracts
- [API](api/), [web](web/), [scraper](scraper/), [MCP](mcp/) - service references
- [Deployment](deployment/) and [scripts](scripts/) - operations
- [Manual setup](setup/) - Gmail and DNS/HTTPS outcomes

## Records

- [ADR](adr/0002-global-insis-rate-limit-not-a-concurrency-knob.md) - InSIS rate-limit decision
- [Agent-instruction research](dev/research/agent-instructions.md) - why `AGENTS.md` is the shared source
- [Umami research](dev/research/umami-custom-events.md), [handoff](handoff/), and [marketing plan](MARKETING.md) - dated background material; check current code and vendor docs before acting on it
