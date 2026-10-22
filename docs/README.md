# Developer documentation

This folder holds developer references and setup guides. Published student help lives in [`apps/web/src/pages/docs/`](../apps/web/src/pages/docs/); [`user/`](user/) points to it.

## Work on the system

- [Engineering](engineering/) - local setup and contribution workflow
- [Architecture](architecture/) - package boundaries and data flow
- [Domain glossary](DOMAIN.md) - shared terminology
- [Shared packages](shared/) - types, domain logic, HTTP and queue contracts
- [API](api/), [web](web/), [scraper](scraper/), [MCP](mcp/) - service references
- [Runbooks](runbooks/) - deploy, rollback, backups, fresh server, secrets and troubleshooting ([index](runbooks/README.md))
- [Scripts](scripts/) - repository maintenance utilities
- [Manual setup](setup/) - Gmail and DNS/HTTPS outcomes
- [Monitoring](architecture/MONITORING.md) - metrics, logs, alerts and dashboards

## Records

- [ADR 0002](adr/0002-global-insis-rate-limit-not-a-concurrency-knob.md) - InSIS rate-limit decision
- [ADR 0003](adr/0003-partner-api-rate-limit-fails-open.md) - partner API rate limit fails open
- [ADR 0004](adr/0004-public-api-is-partner-only-behind-hard-gates.md) - partner-only API and launch gates
- [ADR 0005](adr/0005-browser-origins-are-bound-per-api-key.md) - browser origins bound per API key
- [ADR 0006](adr/0006-repository-standard-and-ingress-modes.md) - repository standard and the two ingress modes
- [Agent-instruction research](dev/research/agent-instructions.md) - why `AGENTS.md` is the shared source
- [Umami research](dev/research/umami-custom-events.md) and [marketing plan](MARKETING.md) - dated background material; check current code and vendor docs before acting on it
