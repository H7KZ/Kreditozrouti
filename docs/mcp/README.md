# MCP server

The standalone MCP server exposes VŠE course data through the [Model Context Protocol](https://modelcontextprotocol.io). It queries MySQL through `@kreditozrouti/core` services and `@kreditozrouti/types`; it does not call the API's HTTP routes.

## Connect

| Mode | Start | Endpoint |
| --- | --- | --- |
| Local stdio | `node mcp/dist/index.js --stdio` | Process stdin/stdout |
| Streamable HTTP | `node mcp/dist/index.js` | `POST /mcp` on `MCP_PORT` (default 3000) |

For stdio, configure an MCP client with the absolute path to `mcp/dist/index.js`, argument `--stdio`, and `MYSQL_URI`. For HTTP, connect an OAuth-capable MCP client to `https://kreditozrouti.cz/mcp` or local `http://localhost:3000/mcp`.

HTTP mode requires a Bearer token from this server's OAuth flow. Discovery is at `/.well-known/oauth-authorization-server` and `/.well-known/oauth-protected-resource`; registration, authorization, and token endpoints are under `/mcp/oauth/`. Registration is automatic for allowed redirect URIs. HTTPS redirects must use a host in `MCP_ALLOWED_REDIRECT_HOSTS` (default `claude.ai,claude.com`, including subdomains); HTTP loopback callbacks are also allowed. The OAuth store is in memory with size and TTL bounds. Stdio mode does not use OAuth.

`GET /health` and `GET /mcp/health` are unauthenticated checks. The latter works through the production `/mcp` proxy route.

## Tools

| Name | Use |
| --- | --- |
| `vse_search_courses` | Search by query, faculty, semester, and language; page with `limit` and `offset` |
| `vse_get_course` | Get course detail by numeric ID |
| `vse_check_timetable_conflicts` | Check 1-30 course IDs for overlaps |
| `vse_optimize_timetable` | Build ranked schedules or explore additions to a base selection |

Optimizer `mode` is `build` or `explore`. It accepts up to 30 base courses; explore mode also takes `explore_course_ids` (up to 20). Optional constraints include required/excluded courses, credits, blackout windows, preferred days, and maximum consecutive minutes. HTTP optimizer calls, including JSON-RPC batches, are limited to 10 per minute. General MCP calls are limited to 100 per minute.

## Resources and prompts

| Resource | Data |
| --- | --- |
| `vse://faculties` | Faculty IDs and names |
| `vse://study-plans` | All study plans |
| `vse://study-plans/{faculty_id}` | Plans for one faculty |
| `vse://course/{id}` | Full course detail |

`build_schedule` takes a required `semester` (ZS or LS) and optional `faculty_id`. `explore_plan` takes a required `faculty_id`. Source schemas are in `mcp/src/Tools/`, `Resources/`, and `Prompts/`; `mcp/src/server.ts` registers them.

## Time values

Course times and blackout windows use integer minutes from midnight: `08:00` is `480`. Get full course detail before checking slot conflicts.

## Configuration

| Variable | Purpose |
| --- | --- |
| `MYSQL_URI` | Required MySQL connection |
| `MCP_PORT` | HTTP port, default 3000 |
| `MCP_BASE_URL` | Public URL for OAuth metadata, default `http://localhost:3000` |
| `MCP_JWT_SECRET` | Required in production; local runs use an ephemeral value |
| `MCP_ALLOWED_REDIRECT_HOSTS` | Comma-separated HTTPS redirect hosts |
| `NODE_ENV`, `LOG_LEVEL` | Runtime mode and Pino log level |

HTTP mode creates a fresh MCP server per request with no session ID. `mcp/src/Database/client.ts` owns its MySQL connection.
