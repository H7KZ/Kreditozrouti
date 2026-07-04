# MCP — CLAUDE.md

Standalone MCP server for Kreditožrouti. Zero imports from `shared/`, `api/`, `scraper/`, or `client/`.

## Directory Structure

```
mcp/src/
├── index.ts / server.ts / app.ts
├── Config/         # Config.ts — env vars (MYSQL_URI, MCP_PORT, NODE_ENV, LOG_LEVEL)
├── Logger/         # logger.ts — pino instance
├── Domain/         # Copied + self-contained domain types — NO @shared imports
├── DB/             # types.ts (Kysely DB interface) + client.ts (db singleton)
├── Services/       # CourseService, StudyPlanService, FacultyService, OptimizerService
└── Tools/          # FacultyTools, CourseTools, StudyPlanTools, TimetableTools, OptimizerTools
```

## Path Aliases

| Alias    | Resolves to |
|----------|-------------|
| `@mcp/*` | `./src/*`   |

## Critical Invariants

- **Zero monorepo imports**: no `@shared/*`, `@api/*`, `@scraper/*`, `../client`, etc.
- **Stateless HA**: `createServer()` factory called fresh per HTTP request; `sessionIdGenerator: undefined`
- **Dual transport**: `--stdio` flag → StdioServerTransport; else → Streamable HTTP on `POST /mcp`
- **Times as minutes-from-midnight** (0–1439) stored in DB; `minutesToTime()` in Domain/time.ts converts to `HH:MM` in responses
- **Optimizer rate-limit** enforced in `app.ts` before dispatch (body inspection: `req.body.params?.name === 'vse_optimize_timetable'`), not inside tool handlers

## Tool Names

`vse_list_faculties`, `vse_search_courses`, `vse_get_course`, `vse_list_study_plans`, `vse_get_study_plan`, `vse_check_timetable_conflicts`, `vse_optimize_timetable`
