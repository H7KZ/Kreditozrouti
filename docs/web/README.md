# Web app

The Vue app lets students browse VŠE courses, build and compare timetables, and generate schedule options. The four-step setup wizard selects faculty, entry year, study plans, and completed courses.

## Where to start

| Topic | Reference |
| --- | --- |
| State and persistence | [Stores](STORES.md) |
| Reusable UI logic | [Composables](COMPOSABLES.md) |
| Timetable and conflicts | [Timetable](TIMETABLE.md) |
| API, localization, utilities, telemetry | [Internals](INTERNALS.md) |

## Structure

- `web/src/pages/` provides file-based routes: the wizard at `/`, the main app at `/courses`, public docs, and shared timetables at `/s/:id`.
- `web/src/components/` contains the UI, including filters, courses, timetable, optimizer, wizard, docs, and common controls.
- `web/src/stores/` owns application state. `web/src/composables/` holds reusable Vue logic. `web/src/utils/` holds small helpers.
- `web/src/services/` calls the Axios client in `web/src/api.ts`. Components call stores or composables rather than constructing API requests.
- Shared browser-safe domain functions come from `@kreditozrouti/core`; shared DTOs and domain types come from `@kreditozrouti/types`.

## Main flow

1. The wizard saves the student's selections locally.
2. `/courses` initializes filters from those selections and fetches course results.
3. Changing filters triggers the page's filter watcher to fetch again.
4. Selecting a course slot updates the timetable store and browser storage. The list, grid, status summary, and saved schedules read that state.

The optimizer is a separate tab within `/courses`. It sends basket and constraint data through `optimizeService.ts` and can apply a proposed timetable.

## Startup

`web/src/index.ts` creates the router, i18n, Pinia, and document head. It initializes optional Faro telemetry, hydrates saved schedules, timetable, UI, and wizard state, records a visit for the optional feedback prompt, then mounts the app. Course and wizard data are fetched when needed.

Local development uses `http://localhost:45173` by default. Set `VITE_API_URL` to override the API base URL (`/api`).
