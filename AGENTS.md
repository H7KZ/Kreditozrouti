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

Area-specific instructions live in `apps/api/`, `apps/web/`, `apps/scraper/`, `apps/mcp/`, `deployment/`, and `scripts/` as `AGENTS.md`.
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
make dev               # Run API, web, scraper, MCP, and shared-package watchers
make run-local-docker  # Start MySQL, Redis, phpMyAdmin
  make test              # Run scraper then API tests sequentially
  make test-regen        # Regenerate scraper + API fixture snapshots
  pnpm boundaries       # Verify core, web, and MCP import boundaries
```

---

## Monorepo Structure

```
apps/                 Deployable services: api, web, scraper, mcp
packages/             Shared libraries: core, types, logger, style
fixtures/             Shared test fixtures: HTML, *.scraper.json, *.db.json
scripts/              Bash - repository-specific server maintenance
deployment/           Docker Compose stacks + deploy.sh
docs/                 Developer reference and setup guides
```

---

## Critical Invariants

**Cross-package imports:**

These boundaries are checked by `pnpm boundaries` and CI.

- `packages/core/` must never import `express`, `bullmq`, `ioredis`, or any HTTP/queue runtime
- `apps/web/` never imports API runtime code, `@kreditozrouti/core/db`, or `@kreditozrouti/core/services`
- Shared DTO and queue types come from `@kreditozrouti/types`
- `apps/mcp/` uses `@kreditozrouti/core` for shared services and `@kreditozrouti/types` for types; it never imports
  from `apps/api/`, `apps/scraper/`, or `apps/web/`
- `apps/web/` and `packages/core/` never import the node-only `@kreditozrouti/logger`

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
- [Published student guide, English](apps/web/src/pages/docs/en/getting-started.md) and [Czech](apps/web/src/pages/docs/cs/getting-started.md)
- [Domain glossary](docs/DOMAIN.md) and [architecture](docs/architecture/README.md)
- [Engineering setup](docs/engineering/SETUP.md) and [contributing](docs/engineering/CONTRIBUTING.md)
- [MCP server](docs/mcp/README.md)
- [Manual setup guides](docs/setup/README.md)

---

## Doc-Review Rule

After completing any task that changes code, configuration, or behavior:

1. **Identify** which developer docs describe the changed area and update those that need it.
2. **For user-visible changes**, update the relevant pages in both `apps/web/src/pages/docs/en/` and `apps/web/src/pages/docs/cs/`.
3. **Check links and routes** touched by the change, including the public sitemap when pages move.
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
