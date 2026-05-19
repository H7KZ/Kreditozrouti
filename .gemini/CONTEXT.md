# CONTEXT.md — Kreditožrouti Domain Glossary & ADRs

Defines canonical vocabulary and architectural decisions. Used during code reviews and architecture discussions.

> For full architecture documentation see [docs/architecture/](../docs/architecture/README.md)

---

## Domain Terms

- **Course** — a VŠE academic course (předmět) with an ident (e.g. `4IT101`), ECTS credits, and multiple Unit types. Stored in `insis_courses`.
- **Unit** — a schedulable section of a Course (lecture, seminar, exercise). One course can have multiple unit instances per type. Stored in `insis_course_units`.
- **Slot** — a single occurrence of a Unit (specific day + time + location). Recurring slots repeat weekly; one-time slots have a date. Stored in `insis_course_unit_slots`. Times are **minutes from midnight** (0–1439).
- **Selected Unit** — a Slot that a student has added to their timetable. Represented as `SelectedCourseUnit` in `client/src/types/course.ts`.
- **Timetable** — the student's personal schedule of Selected Units, managed by `timetableStore`, persisted to `localStorage` under `kreditozrouti:timetable`.
- **Study Plan** — a VŠE curriculum template specifying which Courses a student should take. Stored in `insis_study_plans` / `insis_study_plan_courses`.
- **Faculty** — VŠE organizational unit (FIS, NF, FFÚ, etc.) owning Courses. Stored in `insis_faculties`.
- **Hard Conflict** — two Selected Units overlap in time on the same day. Detected by `unitsConflict()` in `shared/domain/timetable.ts`. Status: `'conflict'`.
- **Campus Conflict** — two Selected Units are on different campuses with less than 40 minutes between them (no time overlap). Detected by `unitsCampusConflict()`. Status: `'campus-conflict'`.
- **Campus** — a physical VŠE location. Jižní Město: rooms prefixed `JM`. Žižkov: rooms prefixed `RB`, `NB`, `IB`, or `SB`. Type: `Campus = 'jizni-mesto' | 'zizkov' | 'unknown'`.
- **Facet** — a filterable dimension returned by the API (faculty, level, language, etc.) with item counts. Lives in `coursesStore.facets`.
- **Filter** — a user-selected constraint narrowing Course search results. State lives exclusively in `filtersStore`.
- **Incomplete Selection** — a Course in the timetable where the student has selected at least one unit type but not all required types. Status: `'incomplete'`. Detected by `checkCourseCompleteness()`.
- **Wizard** — the onboarding flow where a student selects Faculty, Year, Semester, Study Plans, and marks completed courses. State split across three stores: `wizard.store`, `wizard-data.store`, `completed-courses.store`.
- **Period** — a semester instance: year + semester code (e.g. `2024` + `'ZS'`). Used in filters as `years` + `semesters` arrays.
- **InSIS** — VŠE's information system (insis.vse.cz); the upstream data source scraped by the Scraper service.
- **Job** — a BullMQ unit of work. `ScraperRequest*` jobs are sent by the API and processed by the Scraper. `ScraperResponse*` jobs are sent by the Scraper and processed by the API.

---

## Architecture Seams

Where behavior can be swapped without touching the rest of the codebase:

- **Service layer** (`client/src/services/`) — all HTTP calls go through here. Swap HTTP for GraphQL or a mock here without changing stores.
- **`filtersStore`** (`client/src/stores/filters.store.ts`) — owns all filter state and persistence. Swap localStorage for URL-based strategy here without touching other stores.
- **`shared/domain/timetable.ts`** — pure conflict detection (`unitsConflict`, `unitsCampusConflict`, `checkCourseCompleteness`). No Vue dependency. Extend or swap conflict logic here without touching stores.
- **`shared/domain/insis.ts`** — pure slot-type detection (`getSlotType`) and InSIS enums. No i18n dependency.

---

## ADRs

Decisions not to re-litigate:

- **ADR-001**: `filtersStore` is the single source of truth for filter state. `coursesStore` does NOT proxy filter setters — it reads from `filtersStore` and calls `filtersStore.setFilter()`.
- **ADR-002**: `timetableStore` does NOT import `coursesStore`. Course data needed for conflict display is snapshotted into `SelectedCourseUnit.snapshotAvailableTypes` at `addUnit()` time.
- **ADR-003**: Wizard state is split into three stores by concern — `wizard.store` (navigation + selections), `wizard-data.store` (remote facets + loading), `completed-courses.store` (completed course idents). Do not re-merge them.
- **ADR-004**: `getSlotType()` lives in `shared/domain/insis.ts`. CSS class helpers live in the client. They must not be merged with i18n-dependent utilities.
- **ADR-005**: Campus conflict is client-side detection. The 40-minute travel buffer between Jižní Město and Žižkov is hardcoded as `CAMPUS_TRAVEL_MINUTES` and is intentionally not configurable at runtime.
- **ADR-006**: The Scraper never writes to the database and never schedules its own jobs. All persistence goes through the API via `ScraperResponseQueue`. Schedulers live in the API and only run in `NODE_ENV=production`.
- **ADR-007**: No Puppeteer for new scrapers. InSIS is server-rendered; all HTTP requests use Axios via `InSISHTTPClientService`.
