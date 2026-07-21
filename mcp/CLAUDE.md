# MCP — CLAUDE.md

Standalone MCP server for Kreditožrouti. Imports only from `@kreditozrouti/core` — no imports from `api/`, `scraper/`,
or `client/`.

## Directory Structure

```
mcp/src/
├── index.ts / server.ts / app.ts
├── Config/         # Config.ts — env vars (MYSQL_URI, MCP_PORT, NODE_ENV, LOG_LEVEL)
├── Logger/         # logger.ts — pino instance
├── Database/       # client.ts (Kysely db singleton) — types come from @kreditozrouti/core/db
├── Tools/          # CourseTools, TimetableTools, OptimizerTools
│                   #   tools.ts — defineTool/registerTool, defineResource/registerResource,
│                   #              definePrompt/registerPrompt helpers
├── Resources/      # FacultyResources, StudyPlanResources, CourseResources
└── Prompts/        # BuildSchedulePrompt, ExplorePlanPrompt
```

## Path Aliases

| Alias    | Resolves to |
|----------|-------------|
| `@mcp/*` | `./src/*`   |

## Critical Invariants

- **Core-only imports**: imports only from `@kreditozrouti/core` — no `@api/*`, `@scraper/*`, `../client`, etc.
- **Stateless HA**: `createServer()` factory called fresh per HTTP request; `sessionIdGenerator: undefined`
- **Dual transport**: `--stdio` flag → StdioServerTransport; else → Streamable HTTP on `POST /mcp`
- **Times as minutes-from-midnight** (0–1439) stored in DB; `minutesToTime()` from `@kreditozrouti/core/domain` converts
  to `HH:MM` in responses
- **Optimizer rate-limit** enforced in `app.ts` before dispatch (body inspection:
  `req.body.params?.name === 'vse_optimize_timetable'`), not inside tool handlers
- **Three-primitive architecture**: Tools = model-driven actions; Resources = app-controlled read-only data; Prompts =
  user-invocable workflow templates. Use `server.registerTool/registerResource/registerPrompt` — the deprecated
  `server.tool/resource/prompt` overloads must not be used.
- **OAuth 2.1 required for HTTP transport**: `POST /mcp` requires a valid `Authorization: Bearer <token>`. OAuth is
  auto-approve (public data) — no login screen, DCR auto-registers any client. OAuth store is in-memory; tokens expire
  after 1 hour. `MCP_JWT_SECRET` must be set in production or tokens are ephemeral. `MCP_BASE_URL` must match the
  public URL (used in well-known discovery). The well-known routes (`/.well-known/oauth-*`) are served by this process
  but routed via a separate Traefik rule (`${PROJECT}-mcp-wellknown`).
- **stdio transport bypasses OAuth**: `--stdio` mode never touches OAuth routes

## MCP Primitives

### Tools (model-controlled)

`vse_search_courses`, `vse_get_course`, `vse_check_timetable_conflicts`, `vse_optimize_timetable`

### Resources (application-controlled)

`vse://faculties`, `vse://study-plans`, `vse://study-plans/{faculty_id}`, `vse://course/{id}`

### Prompts (user-controlled)

`build_schedule` (args: semester, faculty_id?), `explore_plan` (args: faculty_id)
