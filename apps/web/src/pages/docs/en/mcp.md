---
title: MCP Integration
order: 3
---

# MCP integration

Kreditožrouti offers a [Model Context Protocol](https://modelcontextprotocol.io) server for assistants that support remote MCP connections. It provides course and study-plan data plus timetable tools. The server uses the app's course database, which can lag behind InSIS.

## Connect

Add a remote MCP server in your assistant using this URL:

```text
https://kreditozrouti.cz/mcp
```

Follow the authorization prompt if your client shows one. Client setup screens and configuration formats differ, so use your client's current instructions for adding a remote HTTP MCP server.

## Available tools

| Tool | Use |
| --- | --- |
| `vse_search_courses` | Search course summaries by text, faculty, semester, or language. |
| `vse_get_course` | Get one course with units and time slots. |
| `vse_get_study_plan` | Get a study plan and its course list. |
| `vse_check_timetable_conflicts` | Check overlaps for up to 30 course IDs. |
| `vse_optimize_timetable` | Build a schedule or explore courses that fit a base selection. |

Search results are summaries. Fetch a course before asking about its exact slots. The optimizer accepts preferred days, blackout windows, ECTS limits, and a maximum consecutive class duration. Times in tool arguments are minutes after midnight: `08:00` is `480`.

## Resources and prompts

Your client may also expose `vse://faculties`, `vse://study-plans`, `vse://study-plans/{faculty_id}`, and `vse://course/{id}` as read-only resources. The `build_schedule` and `explore_plan` prompts guide common workflows when the client supports MCP prompts.

For example, ask: "Find English-taught courses at FIS for the winter semester, then show the timetable slots for the ones I choose." Verify the final course information in InSIS before enrollment.
