---
title: MCP Integration
order: 3
---

# MCP Integration

Kreditožrouti exposes an [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that lets AI
assistants — Claude Desktop, Cursor, VS Code Copilot, and others — query live VŠE course data, check timetable
conflicts, and optimise schedules on your behalf.

The public endpoint is:

```
https://kreditozrouti.cz/mcp
```

## What the AI can do

Once connected, your AI assistant has access to the following tools:

| Tool                            | What it does                                                                                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `vse_search_courses`            | Search courses by keyword, faculty, semester, or language of instruction. Returns summary data — call `vse_get_course` or read `vse://course/{id}` for full slot detail. |
| `vse_get_course`                | Fetch a single course with all its timetable slots                                                                                                                       |
| `vse_get_study_plan`            | Fetch a study plan with its full course list                                                                                                                             |
| `vse_check_timetable_conflicts` | Check whether a set of courses has any time overlaps                                                                                                                     |
| `vse_optimize_timetable`        | Find a conflict-free schedule for a given set of courses                                                                                                                 |

**Example prompts you can give Claude after connecting:**

- "Find all English-taught courses at FIS for the winter semester."
- "Do these three courses conflict with each other? IDs: 1042, 1187, 2034."
- "Build me a conflict-free schedule from my study plan, keeping my Fridays free."
- "Which additional courses from FPH can I still fit into my current timetable?"

## Resources

Resources are read-only data endpoints the host (Claude Desktop, Cursor, VS Code) can inject directly into context.
Unlike Tools, you do not need to invoke them as actions — the client can prefetch and display them.

| URI                              | Description                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| `vse://faculties`                | All VŠE faculties with their IDs. Read this first to get valid faculty IDs.          |
| `vse://study-plans`              | All study plans across all faculties.                                                |
| `vse://study-plans/{faculty_id}` | Study plans for one faculty — replace `{faculty_id}` with e.g. `FIS`.                |
| `vse://course/{id}`              | Full course detail including time slots — replace `{id}` with the numeric course ID. |

## Prompts

Prompts are workflow templates you can invoke directly from your AI client (they appear as slash-commands in Claude
Desktop and Cursor).

| Name             | Arguments                                      | What it does                                                                                      |
| ---------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `build_schedule` | `semester` (ZS or LS), `faculty_id` (optional) | Guides you through picking courses, checking conflicts, and optimising a schedule for a semester. |
| `explore_plan`   | `faculty_id`                                   | Walks through the study plans for a faculty and summarises their courses.                         |

## Connect Claude Desktop

Claude Desktop supports remote MCP servers over SSE. Add the following entry to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
	"mcpServers": {
		"kreditozrouti": {
			"url": "https://kreditozrouti.cz/mcp"
		}
	}
}
```

Save the file and restart Claude Desktop. You should see "kreditozrouti" appear in the connected tools list.

## Connect Cursor

Add to `.cursor/mcp.json` in your project root (or `~/.cursor/mcp.json` globally):

```json
{
	"mcpServers": {
		"kreditozrouti": {
			"url": "https://kreditozrouti.cz/mcp"
		}
	}
}
```

## Connect VS Code

Add to `.vscode/mcp.json` in your workspace:

```json
{
	"servers": {
		"kreditozrouti": {
			"type": "http",
			"url": "https://kreditozrouti.cz/mcp"
		}
	}
}
```

## Tools reference

### `vse_search_courses`

Search for courses using any combination of filters:

| Parameter    | Type              | Description                                   |
| ------------ | ----------------- | --------------------------------------------- |
| `query`      | string (optional) | Free-text search across course name and ident |
| `faculty_id` | string (optional) | Faculty code, e.g. `"FIS"`, `"FPH"`, `"FMV"`  |
| `semester`   | string (optional) | `"ZS"` (winter), `"LS"` (summer), or `"Both"` |
| `language`   | string (optional) | Language of instruction, e.g. `"EN"`, `"CS"`  |
| `limit`      | number (1–100)    | Results per page — default 20                 |
| `offset`     | number            | Pagination offset — default 0                 |

Returns `{ courses, total }`.

### `vse_check_timetable_conflicts`

Pass an array of course IDs (up to 30). Returns `{ has_conflicts: boolean, conflicts: [...] }` — each conflict entry
lists the two overlapping courses, the day, and the time range.

### `vse_optimize_timetable`

Two modes:

- **`build`** — given a fixed set of courses, find the best non-conflicting combination of lecture/exercise sections.
  Use when you have already decided which courses you want.
- **`explore`** — start from a base set of courses and try adding each course from an additional list. Use when you want
  to know which extra courses can still fit.

Optional constraints:

```json
{
	"blackout_windows": [{ "day": "friday", "time_from": 0, "time_to": 1439 }],
	"preferred_days": ["monday", "tuesday", "wednesday"],
	"credit_min": 18,
	"credit_max": 30,
	"max_consecutive_minutes": 180
}
```

All times are in **minutes from midnight**: `08:00` = `480`, `14:30` = `870`.

## Tips for best results

1. **Start with faculties.** Ask the AI to read `vse://faculties` first so it has valid faculty IDs before filtering.
2. **Search before fetching.** `vse_search_courses` returns summaries; ask for a specific course ID only when you need
   full slot details.
3. **Check conflicts before enrolling.** Once you have a shortlist, ask the AI to run `vse_check_timetable_conflicts` to
   catch overlaps before you commit.
4. **Use the optimizer for scheduling help.** Describe your constraints in plain language — the AI will translate them
   into optimizer parameters.
