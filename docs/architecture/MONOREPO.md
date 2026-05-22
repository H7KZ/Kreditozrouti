# Monorepo

## Package Layout

```
Kreditozrouti/
├── api/          # Express API server (Node.js process)
├── client/       # Vue 3 SPA (static build, served by Nginx in prod)
├── scraper/      # BullMQ worker (Node.js process)
├── shared/       # Shared types — imported by api, client, scraper
├── scripts/      # Bash helper scripts for server setup & maintenance
└── deployment/   # Docker Compose files + deploy.sh
```

Each of `api/`, `client/`, `scraper/`, and `shared/` is an independent pnpm package with its own `package.json` and
`tsconfig.json`. There is no pnpm workspace hoisting of runtime code — each package installs its own dependencies.

---

## Package Roles

| Package      | Language         | Runtime          | Purpose                                   |
|--------------|------------------|------------------|-------------------------------------------|
| `api`        | TypeScript       | Node.js          | HTTP server, DB writes, job orchestration |
| `client`     | TypeScript + Vue | Browser / Nginx  | User interface                            |
| `scraper`    | TypeScript       | Node.js          | BullMQ worker, InSIS HTTP scraping        |
| `shared`     | TypeScript       | N/A (types only) | Shared DTOs, domain logic, queue types    |
| `scripts`    | Bash             | Server (Ubuntu)  | Docker install, Traefik, maintenance      |
| `deployment` | YAML + Bash      | CI / Server      | Docker Compose stacks, deploy script      |

---

## Cross-Package Import Rules

```
         ┌──────────┐                     ┌──────────┐
         │  client  │                     │   api    │
         └──────────┘                     └──────────┘
               │                               │
               │ @shared/*                     │ @shared/*
               ▼                               ▼
         ┌──────────────────────────────────────────┐
         │                 shared                   │
         │   (no imports from api/client/scraper)   │
         └──────────────────────────────────────────┘
                                               ▲
                                    @shared/*  │
                                         ┌──────────┐
                                         │ scraper  │
                                         └──────────┘
```

**Rules:**

- `shared` must **never** import from `api`, `client`, or `scraper` — it is a pure types/utilities package
- `client` must **never** import from `api` — all shared types come from `@shared/`
- `scraper` and `api` share job payload types via `@shared/queue/insis.ts`

---

## TypeScript Path Aliases

Each package configures `tsconfig.json` `paths` so imports are clean:

### api/

| Alias       | Resolves to   |
|-------------|---------------|
| `@api/*`    | `./src/*`     |
| `@shared/*` | `../shared/*` |

### client/

| Alias       | Resolves to    | Note                                   |
|-------------|----------------|----------------------------------------|
| `@client/*` | `./src/*`      | —                                      |
| `@api/*`    | `../api/src/*` | Types only — never import runtime code |
| `@shared/*` | `../shared/*`  | —                                      |

### scraper/

| Alias        | Resolves to   |
|--------------|---------------|
| `@scraper/*` | `./src/*`     |
| `@shared/*`  | `../shared/*` |

---

## Shared Package Structure

```
shared/
├── domain/
│   ├── insis.ts        # InSIS enums (Faculty, Semester, UnitType, …), getSlotType()
│   ├── timetable.ts    # Conflict detection, campus logic, checkCourseCompleteness
│   ├── period.ts       # getUpcomingPeriod(), getPeriodsForLastYears()
│   ├── time.ts         # TimeSelection type, timeToMinutes(), minutesToTime()
│   └── day.ts          # getDayFromDate()
├── http/
│   ├── index.ts        # All DTO interfaces (FacultyDTO, CourseDTO, …)
│   └── filters.ts      # CoursesFilter, StudyPlansFilter, FacetItem
└── queue/
    ├── index.ts        # Queue name constants
    └── insis.ts        # Job payload types (ScraperInSISCourse, ScraperInSISStudyPlan)
```

Full reference: [docs/shared/](../shared/README.md)

---

## Development Commands

```bash
make install        # Install all packages
make dev            # Run api + client + scraper in parallel
make lint           # Lint all packages
make format         # Format all packages
make build          # Production build for all packages
```

Individual packages: `cd api && pnpm run dev` etc.
