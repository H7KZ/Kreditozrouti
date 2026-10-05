# Domain glossary

| Term | Meaning |
|------|---------|
| Course | An InSIS subject, identified by a code such as `4IT101`. |
| Unit | A lecture, exercise, or seminar section of a course. |
| Slot | A unit's scheduled day, time, and location; it may recur weekly or have a specific date. |
| Timetable | The student's selected units and slots, stored in the browser. |
| Study plan | A curriculum that groups required and optional courses. |
| Faculty | A VŠE organizational unit associated with courses and study plans. |
| Period | Academic year plus semester (`ZS` or `LS`). |
| Facet | An API-provided filter option with a result count. |
| Hard conflict | Two selected slots overlap in time. |
| Campus conflict | Selected slots on different known campuses leave less than 40 minutes for travel. |
| Incomplete selection | Some, but not all, required unit types for a course have been selected. |
| Lecturer | A person who teaches or guarantees a course, identified by their InSIS person id (`/lide/clovek.pl?id=`) and display name. |
| Consumer | A partner organisation (first: Studolog) that holds API keys to the public API. Issued by hand; there is no self-serve signup. |
| Plan | A named quota tier (per-minute burst limit, daily cap, max scopes) assigned to a Consumer. Quotas are enforced per Consumer, not per API Key. |
| API Key | A server-side secret owned by one Consumer, carrying scopes and a plan. Revocable. Never sent from a browser (v1 has no publishable keys). |

Times are stored as minutes from midnight (`08:00` is `480`). Shared types live in [`packages/types/src/domain.ts`](../packages/types/src/domain.ts); conflict checks and time conversions live in [`packages/core/src/domain/`](../packages/core/src/domain/index.ts). See [architecture](architecture/README.md) for service boundaries.
