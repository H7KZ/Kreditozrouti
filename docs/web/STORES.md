# Web stores

Pinia stores in `web/src/stores/` own application state. UI components read stores and call their actions; services make API requests. Use the source for exact action signatures.

| Store | Owns |
| --- | --- |
| `filters.store.ts` | Course filters, timetable-derived exclusions, fit-score switch |
| `courses.store.ts` | Fetched courses, facets, pagination, expanded rows |
| `timetable.store.ts` | Selected units, conflicts, course statuses, timetable persistence |
| `schedule-slots.store.ts` | Up to five named local schedules and the active slot |
| `wizard.store.ts` | Faculty, entry year, study plans, wizard progress |
| `wizard-data.store.ts` | Study plan and faculty data fetched for wizard steps |
| `completed-courses.store.ts` | Completed course identifiers and wizard step filters |
| `ui.store.ts` | List/timetable view and other display preferences |
| `drag.store.ts` | Active grid drag selection |
| `alerts.store.ts` | Global notification queue |
| `announcer.store.ts` | Screen-reader announcements |
| `feedback.store.ts` | Optional prompt eligibility and submission state |

## Key dependencies

- `courses.store.ts` reads filters, wizard selections, and selected timetable times. It calls `courseService.ts` for results.
- `timetable.store.ts` writes selected timetable times to `filters.store.ts`. It must not import `courses.store.ts`: course completeness uses unit-type snapshots saved with each selection.
- `wizard.store.ts` coordinates `wizard-data.store.ts` and `completed-courses.store.ts`.
- `schedule-slots.store.ts` loads saved units into `timetable.store.ts` and records successful saves through `feedback.store.ts`. The feedback store imports no other store.
- `courses.vue` watches filters and fetches courses after filter changes. Filter setters should not fetch directly. `courses.store.ts` explicitly fetches when toggling **Hide conflicting courses** after supplying current timetable times.

## Persistence

`web/src/constants/storage.ts` defines the browser storage keys. The timetable, named schedules, wizard, UI preferences, optimizer constraints, and feedback prompt state are local. `locale` is a separate plain key. Wizard data and fetched course results are loaded from the API when needed.

The app hydrates persistent stores in `web/src/index.ts`. See [Timetable](TIMETABLE.md) for conflict and status rules.
