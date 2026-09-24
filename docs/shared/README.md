# Shared packages

The former `shared/` package is now split between `packages/types/` and `packages/core/`.

| Package | Owns | Used by |
|---------|------|---------|
| [`@kreditozrouti/types`](../../packages/types/src/index.ts) | Domain values and types, HTTP DTOs, queue payloads, database types | API, web, scraper, MCP |
| [`@kreditozrouti/core`](../../packages/core/package.json) | Reusable domain functions, queue names, HTTP helpers, database query services | API, web (browser-safe exports), scraper, MCP |

Import shared types from `@kreditozrouti/types`. Import reusable functions from a specific `@kreditozrouti/core/*` export. The web bundle uses browser-safe core exports and never imports `core/db` or `core/services`.

- [Domain](DOMAIN.md) - types, time and conflict rules
- [HTTP](HTTP.md) - API request and response contracts
- [Queue](QUEUE.md) - job names and payloads
