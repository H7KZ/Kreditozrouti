# MCP Server

The MCP server (`../../mcp`) exposes Kreditožrouti data to LLM clients via the
[Model Context Protocol](https://modelcontextprotocol.io). It connects directly to MySQL and is an independent process —
it does not call the `../../api` HTTP routes.

## Tools

| Tool                            | Description                                                    |
| ------------------------------- | -------------------------------------------------------------- |
| `vse_list_faculties`            | List all VŠE faculties with publicly visible timetables        |
| `vse_search_courses`            | Search courses by text, faculty, semester, or language         |
| `vse_get_course`                | Get a course by numeric ID                                     |
| `vse_list_study_plans`          | List study plans, optionally filtered by faculty/semester/year |
| `vse_get_study_plan`            | Get a study plan by ID                                         |
| `vse_check_timetable_conflicts` | Check two or more course unit slots for time conflicts         |
| `vse_optimize_timetable`        | Find a conflict-free schedule for a set of desired courses     |

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
			"env": {
				"MYSQL_URI": "mysql://..."
			}
		}
	}
}
```

**HTTP** (Streamable HTTP transport, for remote/containerised use):

```bash
node dist/index.js
# Listens on MCP_PORT (default 3000)
# POST /mcp                                   — MCP protocol (requires Bearer token)
# GET  /health                                — health check
# GET  /.well-known/oauth-authorization-server — OAuth 2.1 metadata (RFC 8414)
# GET  /.well-known/oauth-protected-resource  — protected resource metadata (RFC 9728)
# POST /mcp/oauth/register                    — Dynamic Client Registration (RFC 7591)
# GET  /mcp/oauth/authorize                   — Authorization Code endpoint (PKCE)
# POST /mcp/oauth/token                       — Token endpoint
```

HTTP mode requires OAuth 2.1 authentication. Clients that support Dynamic Client Registration (Claude Desktop, ChatGPT, Cursor) handle this automatically - no manual setup needed.

## Environment Variables

| Variable          | Required | Default                    | Description                                              |
| ----------------- | -------- | -------------------------- | -------------------------------------------------------- |
| `MYSQL_URI`       | yes      | —                          | mysql2 connection string                                 |
| `MCP_PORT`        | no       | `3000`                     | HTTP listen port                                         |
| `NODE_ENV`        | no       | `development`              | Enables production rate limits                           |
| `LOG_LEVEL`       | no       | `info`                     | Pino log level                                           |
| `MCP_BASE_URL`    | no       | `http://localhost:3000`    | Public base URL of the server (used in OAuth metadata)   |
| `MCP_JWT_SECRET`  | no*      | auto-generated (ephemeral) | HMAC-SHA256 secret for signing access tokens. *Required in production - tokens won't survive restarts if unset |
| `MCP_ALLOWED_REDIRECT_HOSTS` | no | `claude.ai,claude.com` | Comma-separated https hosts (subdomains included) permitted as OAuth `redirect_uri`. Outside production, `http://localhost` and `http://127.0.0.1` (any port) are also permitted. Any other `redirect_uri` is rejected at registration and at authorize |

## Docker

```bash
docker compose up mcp
```

The `mcp` service in `deployment/docker-compose.yml` mounts the root `.env` file.

## Dependencies

`../../mcp` imports `@kreditozrouti/core` for:

- **`@kreditozrouti/core/domain`** — domain types, time utils, timetable conflict logic
- **`@kreditozrouti/core/db`** — Kysely `Database` type (table interfaces)
- **`@kreditozrouti/core/services`** — pure DB-query services (CourseService, etc.)

The `../../mcp` package owns its own MySQL connection (`mcp/src/Db/client.ts`) and passes the `Kysely<Database>` instance
into each service call.

---

## Connecting to Providers

### Claude Desktop

**Local (stdio)** — `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or
`%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
	"mcpServers": {
		"kreditozrouti": {
			"command": "node",
			"args": ["/absolute/path/to/mcp/dist/index.js", "--stdio"],
			"env": {
				"MYSQL_URI": "mysql://user:pass@localhost:3306/kreditozrouti"
			}
		}
	}
}
```

**Remote (production)** — connect to `https://kreditozrouti.cz/mcp`. Claude Desktop handles OAuth automatically:

```json
{
	"mcpServers": {
		"kreditozrouti": {
			"url": "https://kreditozrouti.cz/mcp"
		}
	}
}
```

**Docker/HTTP (local)** — connect via the running HTTP server. OAuth is still required; clients negotiate it automatically:

```json
{
	"mcpServers": {
		"kreditozrouti": {
			"url": "http://localhost:3000/mcp"
		}
	}
}
```

### Cursor

`.cursor/mcp.json` in your project root:

```json
{
	"mcpServers": {
		"kreditozrouti": {
			"command": "node",
			"args": ["/absolute/path/to/mcp/dist/index.js", "--stdio"],
			"env": {
				"MYSQL_URI": "mysql://user:pass@localhost:3306/kreditozrouti"
			}
		}
	}
}
```

Or HTTP mode (when the Docker service is running):

```json
{
	"mcpServers": {
		"kreditozrouti": {
			"url": "http://localhost:3000/mcp"
		}
	}
}
```

### VS Code

`.vscode/mcp.json` in your workspace:

```json
{
	"servers": {
		"kreditozrouti": {
			"type": "stdio",
			"command": "node",
			"args": ["/absolute/path/to/mcp/dist/index.js", "--stdio"],
			"env": {
				"MYSQL_URI": "mysql://user:pass@localhost:3306/kreditozrouti"
			}
		}
	}
}
```

Or HTTP mode:

```json
{
	"servers": {
		"kreditozrouti": {
			"type": "http",
			"url": "http://localhost:3000/mcp"
		}
	}
}
```

---

## Transport Modes (detail)

| Flag      | Transport                      | Use case                                                                    |
| --------- | ------------------------------ | --------------------------------------------------------------------------- |
| `--stdio` | `StdioServerTransport`         | Local dev, Claude Desktop, Cursor, VS Code — process launched by the client |
| _(none)_  | Streamable HTTP on `POST /mcp` | Docker / production — client connects over the network                      |

The server auto-detects the mode from the presence of `--stdio` in `process.argv`. Health check endpoint (`GET /health`)
is only available in HTTP mode.

---

## Tools Reference

| Tool                            | Description                                               | Key Parameters                                                                                                                                         | Returns                                        |
| ------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| `vse_list_faculties`            | List all VŠE faculties                                    | _(none)_                                                                                                                                               | Array of faculty objects (id, name, etc.)      |
| `vse_search_courses`            | Search courses by text, faculty, semester, or language    | `query?` (string), `faculty_id?`, `semester?` (`ZS`/`LS`/`Both`), `language?` (e.g. `"CS"`, `"EN"`), `limit` (1–100, default 20), `offset` (default 0) | `{ courses, total }`                           |
| `vse_get_course`                | Get a single course by numeric ID                         | `id` (number, required)                                                                                                                                | Course object with units and slots, or error   |
| `vse_list_study_plans`          | List study plans, optionally filtered by faculty          | `faculty_id?`                                                                                                                                          | Array of study plan summaries                  |
| `vse_get_study_plan`            | Get a study plan by numeric ID, including its course list | `id` (number, required)                                                                                                                                | Study plan object with courses, or error       |
| `vse_check_timetable_conflicts` | Check a set of courses for scheduling conflicts           | `course_ids` (array of ints, 1–30)                                                                                                                     | `{ has_conflicts: boolean, conflicts: [...] }` |
| `vse_optimize_timetable`        | Find an optimal conflict-free schedule                    | `course_ids` (1–30), `mode` (`"build"` or `"explore"`), `constraints?`, `locked_unit_ids?`, `explore_course_ids?` (explore mode, max 20)               | Optimized schedule result                      |

## Resources

Resources are read-only, URI-addressed data the host injects into context. Read them to get catalog data without calling
Tools.

| URI                              | Name                       | Description                                                                   |
| -------------------------------- | -------------------------- | ----------------------------------------------------------------------------- |
| `vse://faculties`                | VŠE Faculties              | All faculties with their IDs. Read before filtering by faculty.               |
| `vse://study-plans`              | VŠE Study Plans            | All study plans across all faculties.                                         |
| `vse://study-plans/{faculty_id}` | VŠE Study Plans by Faculty | Study plans for a specific faculty (e.g. `vse://study-plans/FIS`).            |
| `vse://course/{id}`              | VŠE Course                 | Full course detail including units and time slots (e.g. `vse://course/1234`). |

## Prompts

Prompts are user-invocable workflow templates that scaffold common tasks. In Claude Desktop and Cursor they appear as
slash-commands.

| Name             | Args                                                  | Description                                                                                                                     |
| ---------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `build_schedule` | `semester` (ZS/LS, required), `faculty_id` (optional) | Scaffolds the full schedule-building workflow: read faculties → browse study plans → pick courses → check conflicts → optimize. |
| `explore_plan`   | `faculty_id` (required)                               | Scaffolds browsing a faculty's study plans and summarising their courses.                                                       |

### `vse_optimize_timetable` constraints object

```json
{
	"required_course_ids": [1, 2],
	"excluded_course_ids": [99],
	"credit_min": 18,
	"credit_max": 30,
	"blackout_windows": [
		{
			"day": "friday",
			"time_from": 0,
			"time_to": 1439
		}
	],
	"preferred_days": ["monday", "tuesday", "wednesday"],
	"max_consecutive_minutes": 180
}
```

All `time_from` / `time_to` values are **minutes from midnight** (0–1439).

---

## Time Encoding

All times throughout the MCP server — in parameters, responses, and conflict reports — are encoded as **minutes from
midnight** (integers, 0–1439).

| Clock time | Minutes |
| ---------- | ------- |
| `08:00`    | `480`   |
| `09:30`    | `570`   |
| `12:00`    | `720`   |
| `14:30`    | `870`   |
| `18:00`    | `1080`  |

When you pass blackout windows to the optimizer or interpret conflict entries, convert accordingly:
`minutes = hours * 60 + minutes_part`.

---

## Best Practices for AI Agents

1. **Read resources before calling tools.** The `vse://faculties` resource provides all valid faculty IDs. Read it first
   rather than guessing IDs. Similarly, `vse://study-plans/{faculty_id}` gives the full plan catalog for a faculty.

2. **Use Prompts for standard workflows.** The `build_schedule` and `explore_plan` prompts encode the correct call
   sequence. Invoke them at the start of a session rather than rediscovering the order from tool descriptions.

3. **Search with filters, paginate large result sets.** `vse_search_courses` defaults to 20 results. Use `limit` (up to 100) and `offset` to page through. Combine `query`, `faculty_id`, `semester`, and `language` to narrow results before
   fetching full course objects.

4. **Fetch a full course when you need slots.** `vse_search_courses` returns summary data. Call `vse_get_course` (or
   read `vse://course/{id}`) to get the complete unit/slot breakdown needed for conflict checks.

5. **Check conflicts before presenting a selection to the user.** Once the user has a set of course IDs in mind, run
   `vse_check_timetable_conflicts`. The response lists every overlapping pair with the day and time range of the clash.

6. **Use the optimizer for scheduling assistance.** Two modes:
    - `mode: "build"` — given a fixed set of `course_ids`, find the best non-conflicting combination of units. Use when
      the user has decided which courses they want.
    - `mode: "explore"` — start from `course_ids` and try adding each course in `explore_course_ids` one by one. Use
      when the user wants to know which additional courses can still fit. Lock specific units with `locked_unit_ids` to
      keep the user's existing choices fixed while the solver adjusts the rest.

7. **Respect the optimizer rate limit.** `vse_optimize_timetable` is CPU-intensive and rate-limited to 10 req/min in
   production. Avoid calling it in a loop; cache results where possible.
