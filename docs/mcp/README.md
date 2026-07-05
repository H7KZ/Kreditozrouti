# MCP Server

The MCP server (`mcp/`) exposes Kreditožrouti data to LLM clients via the
[Model Context Protocol](https://modelcontextprotocol.io). It connects directly to MySQL
and is an independent process — it does not call the `api/` HTTP routes.

## Tools

| Tool | Description |
|------|-------------|
| `vse_list_faculties` | List all VŠE faculties with publicly visible timetables |
| `vse_search_courses` | Search courses by text, faculty, semester, or language |
| `vse_get_course` | Get a course by numeric ID |
| `vse_list_study_plans` | List study plans, optionally filtered by faculty/semester/year |
| `vse_get_study_plan` | Get a study plan by ID |
| `vse_check_timetable_conflicts` | Check two or more course unit slots for time conflicts |
| `vse_optimize_timetable` | Find a conflict-free schedule for a set of desired courses |

Times in all responses are **minutes from midnight** (0–1439). `08:30` = `510`.

## Transport Modes

**stdio** (Claude Desktop integration):
```bash
node dist/index.js --stdio
```

Configure in `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "kreditozrouti": {
      "command": "node",
      "args": ["/path/to/mcp/dist/index.js", "--stdio"],
      "env": { "MYSQL_URI": "mysql://..." }
    }
  }
}
```

**HTTP** (Streamable HTTP transport, for remote/containerised use):
```bash
node dist/index.js
# Listens on MCP_PORT (default 3000)
# POST /mcp   — MCP protocol
# GET  /health — health check
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MYSQL_URI` | yes | — | mysql2 connection string |
| `MCP_PORT` | no | `3000` | HTTP listen port |
| `NODE_ENV` | no | `development` | Enables production rate limits |
| `LOG_LEVEL` | no | `info` | Pino log level |

## Docker

```bash
docker compose up mcp
```

The `mcp` service in `deployment/docker-compose.yml` mounts the root `.env` file.

## Dependencies

`mcp/` imports `@kreditozrouti/core` for:
- **`@kreditozrouti/core/domain`** — domain types, time utils, timetable conflict logic
- **`@kreditozrouti/core/db`** — Kysely `Database` type (table interfaces)
- **`@kreditozrouti/core/services`** — pure DB-query services (CourseService, etc.)

The `mcp/` package owns its own MySQL connection (`mcp/src/Db/client.ts`) and passes
the `Kysely<Database>` instance into each service call.
