# AGENTS.md

## Style

Use a plain hyphen (-) in place of em dashes in every file.

## Tests

Do not write tests - not even when a spec, review, or acceptance criterion recommends them. If you think tests are
warranted, ask first and I will decide whether and what to add. I write tests manually.

## Token Discipline

**Planning sessions** - When asked to plan, design, or explore architecture:

- Stay read-only. Do not edit files.
- Scope exploration to the specific module/area named. No broad codebase tours unless explicitly asked.

**Feature sessions** - Before starting any feature implementation:

- State which files/modules you expect to touch.
- If scope needs to expand beyond what was stated, stop and ask before proceeding.

**Small fix sessions** - When asked to fix something specific:

- Read only the file (s) explicitly named.
- Do not explore related files "just in case".
- One file in, one fix out.

**Session boundaries** - After completing a feature session:

- Remind the user to run `/clear` before starting a new unrelated task.
- Small fixes involving ≤2 files can chain without clearing.
- Anything touching more than 2 files triggers the `/clear` reminder.

---

Kreditožrouti is a course scheduling system for VŠE students. It scrapes InSIS and presents a filterable timetable UI.

Area-specific instructions live in `api/`, `web/`, `scraper/`, `mcp/`, `deployment/`, and `scripts/` as `AGENTS.md`.
Read the relevant file before changing that area. Codex sessions started at the repository root do not automatically
load nested `AGENTS.md` files. Each sibling `CLAUDE.md` imports its `AGENTS.md`; `.claude/CLAUDE.md` imports this file.

---

## Access Points (dev)

| Service    | URL                    |
|------------|------------------------|
| Web        | http://localhost:45173 |
| API        | http://localhost:40080 |
| MCP        | http://localhost:3000  |
| phpMyAdmin | http://localhost:48080 |

---

## Essential Commands

```bash
make install           # Install all dependencies
make dev               # Run api + web + scraper in parallel
make run-local-docker  # Start MySQL, Redis, phpMyAdmin
make test              # Run scraper then API tests sequentially
make test-regen        # Regenerate scraper + API fixture snapshots
```

---

## Monorepo Structure

```
api/           Express API - HTTP, DB writes, job orchestration
web/           Vue 3 SPA - user interface
fixtures/      Shared test fixtures - HTML, *.scraper.json, *.db.json
mcp/           MCP server - LLM tool access to VŠE data
packages/core/ Reusable domain logic and services
packages/types/ Shared DTO, queue, and database types
scraper/       BullMQ worker - InSIS HTTP scraping
scripts/       Bash - repository-specific server maintenance
deployment/    Docker Compose stacks + deploy.sh
docs/          Developer reference, user guide source, setup guides
```

---

## Critical Invariants

**Cross-package imports:**

- `packages/core/` must never import `express`, `bullmq`, `ioredis`, or any HTTP/queue runtime
- `web/` never imports API runtime code, `@kreditozrouti/core/db`, or `@kreditozrouti/core/services`
- Shared DTO and queue types come from `@kreditozrouti/types`
- `mcp/` uses `@kreditozrouti/core` for shared services and `@kreditozrouti/types` for types; it never imports
  from `api/`, `scraper/`, or `web/`
- `web/` and `packages/core/` never import the node-only `@kreditozrouti/logger`

**Time encoding:** all times are **minutes from midnight** (0-1439). `08:00` = 480.

**Env var prefixes:** API: `API_*` | Web: `VITE_*` (baked at build) | Scraper: no prefix | Infra: `MYSQL_*`,
`REDIS_*`

**Code conventions:**

- TypeScript strict mode - no `any`
- Vue 3 Composition API with `<script setup>`
- API controllers are plain namespace objects, not classes
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`

---

## Key Docs

Package-specific references are linked from each area-specific `AGENTS.md`. Start cross-cutting work at:

- [Developer docs index](docs/README.md)
- [User guide](docs/user/README.md) and [features](docs/user/FEATURES.md)
- [Domain glossary](docs/DOMAIN.md) and [architecture](docs/ARCHITECTURE.md)
- [Engineering setup](docs/engineering/SETUP.md) and [contributing](docs/engineering/CONTRIBUTING.md)
- [MCP server](docs/mcp/README.md)
- [Manual setup guides](docs/setup/README.md)

---

## Doc-Review Rule

After completing any task that changes code, configuration, or behavior:

1. **Identify** which `docs/` files describe the changed area
2. **Also check `docs/user/FEATURES.md`** - if the change affects a user-visible feature (filters, timetable,
   conflict detection, wizard, course refresh, saved schedules, language, theme, etc.), update the relevant section
3. **Update** any doc that describes what changed - keep it accurate
4. **New behavior with no doc entry?** Ask: _"This change isn't mentioned in the docs - should I document it?"_

---

## AGENTS.md Update Rule

After completing any task that changes code, config, or behavior in a package:

1. **Check** the package's `AGENTS.md` - does the directory structure, an invariant, or a Key Docs reference need
   updating?
2. **Check root `AGENTS.md`** - did a cross-cutting invariant change (time encoding, env prefix convention, import
   rules, code conventions)?
3. **Update inline** - no need to ask. If something changed, fix the entry. New behavior with no entry? Add it.

---

## Encoding

Strict UTF-8 - zero tolerance for mojibake. Fix garbled characters at the byte level. For new Vue/TS code, paste raw
Unicode literals directly - no HTML entities or escape sequences.

---

## Working in This Repo (Codex)

- Prefer subagent-driven development for multi-step implementation - spawn agents per task rather than running inline
- Use `TaskCreate` to track progress on any task with 3+ steps when available
- After every change, run the Doc-Review Rule and AGENTS.md Update Rule before closing the task
- Specs, plans, and brainstorming docs go in `.superpowers/` (gitignored) - never commit them
