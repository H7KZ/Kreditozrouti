# CLAUDE.md

## Token Discipline

**Planning sessions** — When asked to plan, design, or explore architecture:

- Stay read-only. Do not edit files.
- Scope exploration to the specific module/area named. No broad codebase tours unless explicitly asked.

**Feature sessions** — Before starting any feature implementation:

- State which files/modules you expect to touch.
- If scope needs to expand beyond what was stated, stop and ask before proceeding.

**Small fix sessions** — When asked to fix something specific:

- Read only the file(s) explicitly named.
- Do not explore related files "just in case".
- One file in, one fix out.

**Session boundaries** — After completing a feature session:

- Remind the user to run `/clear` before starting a new unrelated task.
- Small fixes involving ≤2 files can chain without clearing.
- Anything touching more than 2 files triggers the `/clear` reminder.

---

Kreditožrouti — course scheduling system for VŠE students. Scrapes InSIS, presents filterable timetable UI.

Each package has its own `CLAUDE.md` with structure, invariants, and key docs — loaded automatically when working in
that directory.

---

## Access Points (dev)

| Service    | URL                    |
|------------|------------------------|
| Client     | http://localhost:45173 |
| API        | http://localhost:40080 |
| phpMyAdmin | http://localhost:48080 |

---

## Essential Commands

```bash
make install           # Install all dependencies
make dev               # Run api + client + scraper in parallel
make run-local-docker  # Start MySQL, Redis, phpMyAdmin
```

---

## Monorepo Structure

```
api/          Express API — HTTP, DB writes, job orchestration
client/       Vue 3 SPA — user interface
scraper/      BullMQ worker — InSIS HTTP scraping
shared/       Types only — imported by all packages, imports nothing
scripts/      Bash — server setup & maintenance
deployment/   Docker Compose stacks + deploy.sh
docs/         Full reference docs — architecture, API, client, scraper, deployment
```

---

## Critical Invariants

**Cross-package imports:**

- `shared/` must never import from `api/`, `client/`, or `scraper/`
- `client/` never imports from `api/` — all shared types come from `@shared/`
- `client/` never imports API runtime code

**Time encoding:** all times are **minutes from midnight** (0–1439). `08:00` = 480.

**Env var prefixes:** API: `API_*` | Client: `VITE_*` (baked at build) | Scraper: no prefix | Infra: `MYSQL_*`,
`REDIS_*`

**Code conventions:**

- TypeScript strict mode — no `any`
- Vue 3 Composition API with `<script setup>`
- API controllers are plain namespace objects, not classes
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`

---

## Key Docs

Package-specific docs (API, client, scraper, deployment, scripts) are listed in each package's `CLAUDE.md` Key Docs
table. Cross-cutting docs:

| Area         | Doc                                                                                                                                                                                                                                               |
|--------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| User Guide   | [docs/user/README.md](../docs/user/README.md) · [features](../docs/user/FEATURES.md) · [getting started](../docs/user/GETTING_STARTED.md)                                                                                                         |
| Domain       | [docs/DOMAIN.md](../docs/DOMAIN.md) — glossary, architecture seams                                                                                                                                                                                |
| Architecture | [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) · [monorepo](../docs/architecture/MONOREPO.md) · [services](../docs/architecture/SERVICES.md) · [data flow](../docs/architecture/DATA_FLOW.md) · [containers](../docs/architecture/CONTAINERS.md) |
| Engineering  | [docs/ENGINEERING.md](../docs/ENGINEERING.md) · [setup](../docs/engineering/SETUP.md) · [contributing](../docs/engineering/CONTRIBUTING.md)                                                                                                       |
| Shared       | [docs/shared/README.md](../docs/shared/README.md) · [domain](../docs/shared/DOMAIN.md) · [http](../docs/shared/HTTP.md) · [queue](../docs/shared/QUEUE.md)                                                                                        |

---

## Doc-Review Rule

After completing any task that changes code, configuration, or behavior:

1. **Identify** which `docs/` file(s) describe the changed area
2. **Also check `docs/user/FEATURES.md`** — if the change affects a user-visible feature (filters, timetable, conflict
   detection, wizard, course refresh, saved schedules, language, theme, etc.), update the relevant section
3. **Update** any doc that describes what changed — keep it accurate
4. **New behavior with no doc entry?** Ask: _"This change isn't mentioned in the docs — should I document it?"_

---

## CLAUDE.md Update Rule

After completing any task that changes code, config, or behavior in a package:

1. **Check** the package's `CLAUDE.md` — does the directory structure, an invariant, or a Key Docs reference need
   updating?
2. **Check root `CLAUDE.md`** — did a cross-cutting invariant change (time encoding, env prefix convention, import
   rules, code conventions)?
3. **Update inline** — no need to ask. If something changed, fix the entry. New behavior with no entry? Add it.

---

## Encoding

Strict UTF-8 — zero tolerance for mojibake. Fix garbled characters at the byte level.
For new Vue/TS code, paste raw Unicode literals directly — no HTML entities or escape sequences.

---

## Working in This Repo (Claude)

- Prefer subagent-driven development for multi-step implementation — spawn agents per task rather than running inline
- Use `TaskCreate` to track progress on any task with 3+ steps
- After every change, run the Doc-Review Rule and CLAUDE.md Update Rule before closing the task
- Specs, plans, and brainstorming docs go in `.superpowers/` (gitignored) — never commit them
