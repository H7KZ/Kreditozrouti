# CLAUDE.md

Kreditožrouti — course scheduling system for VŠE students. Scrapes InSIS, presents filterable timetable UI.

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
make install              # Install all dependencies
make dev                  # Run api + client + scraper in parallel
make run-local-docker     # Start MySQL, Redis, phpMyAdmin
make lint && make format  # Code quality
make build                # Production build
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
```

---

## Critical Invariants

**Cross-package imports:**

- `shared/` must never import from `api/`, `client/`, or `scraper/`
- `client/` never imports from `api/` — all shared types come from `@shared/`
- `client/` never imports API runtime code

**Time encoding:** all times are **minutes from midnight** (0–1439). `08:00` = 480.

**Env var prefixes:**

- API: `API_*` | Client: `VITE_*` (baked at build) | Scraper: no prefix | Infra: `MYSQL_*`, `REDIS_*`

**Scraper is a pure consumer:** never writes DB, never schedules its own jobs — schedulers live in the API (
`NODE_ENV=production` only).

**Deploy order on a fresh server:** Traefik → GitHub Runner (opt) → app stack.

**Code conventions:**

- TypeScript strict mode — no `any`
- Vue 3 Composition API with `<script setup>`
- API controllers are plain namespace objects, not classes
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`

---

## Doc-Review Rule

After completing any task that changes code, configuration, or behavior:

1. **Identify** which `docs/` file(s) describe the changed area (use the table below)
2. **Also check `docs/user/FEATURES.md`** — if the change affects a user-visible feature (filters, timetable,
   conflict detection, wizard, course refresh, saved schedules, language, theme, etc.), update the relevant section
3. **Update** any doc that describes what changed — keep it accurate
4. **New behavior with no doc entry?** Ask: *"This change isn't mentioned in the docs — should I document it?"* If yes,
   add it; if no, continue

---

## Test-Review Rule

After completing any task that adds or changes code in `scraper/`:

1. **Check** whether the changed extraction logic has fixture coverage in `scraper/src/Tests/`
2. **Add or update** HTML fixtures + expected JSON for any new or changed extraction behaviour
3. **Run** `npm run test` from `scraper/` to confirm all tests pass
4. **New extraction with no test?** Add one. Use `npm run test:regen` to bootstrap expected JSONs
   from real HTML rather than writing them by hand.

---

## Documentation

| Area         | Overview                                            | Detail docs                                                                                                                                                                                       |
|--------------|-----------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| User Guide   | [docs/user/README.md](../docs/user/README.md)       | [getting started](../docs/user/GETTING_STARTED.md) · [features](../docs/user/FEATURES.md)                                                                                                         |
| Domain       | [docs/DOMAIN.md](../docs/DOMAIN.md)                 | Glossary · Architecture seams                                                                                                                                                                     |
| Architecture | [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)     | [monorepo](../docs/architecture/MONOREPO.md) · [services](../docs/architecture/SERVICES.md) · [data flow](../docs/architecture/DATA_FLOW.md) · [containers](../docs/architecture/CONTAINERS.md)   |
| Engineering  | [docs/ENGINEERING.md](../docs/ENGINEERING.md)       | [setup](../docs/engineering/SETUP.md) · [contributing](../docs/engineering/CONTRIBUTING.md)                                                                                                       |
| API          | [docs/api/README.md](../docs/api/README.md)         | [endpoints](../docs/api/ENDPOINTS.md) · [services](../docs/api/SERVICES.md) · [jobs](../docs/api/JOBS.md) · [database](../docs/api/DATABASE.md) · [internals](../docs/api/INTERNALS.md)           |
| Client       | [docs/client/README.md](../docs/client/README.md)   | [stores](../docs/client/STORES.md) · [composables](../docs/client/COMPOSABLES.md) · [timetable](../docs/client/TIMETABLE.md) · [internals](../docs/client/INTERNALS.md)                           |
| Scraper      | [docs/scraper/README.md](../docs/scraper/README.md) | [jobs](../docs/scraper/JOBS.md) · [extraction](../docs/scraper/EXTRACTION.md) · [queue](../docs/scraper/QUEUE.md) · [types](../docs/scraper/TYPES.md) · [internals](../docs/scraper/INTERNALS.md) |
| Shared       | [docs/shared/README.md](../docs/shared/README.md)   | [domain](../docs/shared/DOMAIN.md) · [http](../docs/shared/HTTP.md) · [queue](../docs/shared/QUEUE.md)                                                                                            |
| Deployment   | [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md)         | [docker](../docs/deployment/DOCKER.md) · [ci/cd](../docs/deployment/CICD.md) · [infrastructure](../docs/deployment/INFRASTRUCTURE.md) · [operations](../docs/deployment/OPERATIONS.md)            |
| Scripts      | [docs/SCRIPTS.md](../docs/SCRIPTS.md)               | [infrastructure](../docs/scripts/INFRASTRUCTURE.md) · [maintenance](../docs/scripts/MAINTENANCE.md)                                                                                               |

---

## Working in This Repo (Claude)

**Working style**

- Prefer subagent-driven development for multi-step implementation — spawn agents per task rather than running inline
- Use `TaskCreate` to track progress on any task with 3+ steps

**Skills**

| Skill                | When to use                                  |
|----------------------|----------------------------------------------|
| `/brainstorming`     | Before any new feature or significant change |
| `/gsd-plan-phase`    | Planning a phase with multiple tasks         |
| `/gsd-execute-phase` | Executing a planned phase                    |
| `/gsd-debug`         | Systematic bug investigation                 |
| `/tdd`               | Test-first implementation                    |
| `/gsd-code-review`   | Pre-merge review                             |

**Docs discipline:** After every change, run the doc-review rule above before closing the task.
