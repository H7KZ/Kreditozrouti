# CONTEXT.md — Kreditožrouti Domain Glossary

Used by `/improve-codebase-architecture` and architecture reviews. Defines canonical vocabulary.

---

## Domain Terms

- **Course** — a VŠE academic course (předmět) with an ident (e.g. 4IT101), ECTS credits, and multiple Unit types. Stored in `insis_courses`.
- **Unit** — a schedulable section of a Course (lecture, seminar, exercise). One course can have multiple unit instances per type. Stored in `insis_course_units`.
- **Slot** — a single occurrence of a Unit (specific day+time+location). Recurring slots repeat weekly; one-time slots have a date. Stored in `insis_course_unit_slots`. Times are minutes since midnight (0–1439).
- **Selected Unit** — a Slot that a student has added to their timetable. Represented as `SelectedCourseUnit` in `client/src/types/course.ts`.
- **Timetable** — the student's personal schedule of Selected Units, managed by `timetableStore`, persisted to LocalStorage.
- **Study Plan** — a VŠE curriculum template specifying which Courses a student should take. Stored in `insis_study_plans` / `insis_study_plan_courses`.
- **Faculty** — VŠE organizational unit (FIS, NF, FFÚ, etc.) owning Courses. Stored in `insis_faculties`.
- **Hard Conflict** — two Selected Units overlap in time on the same day. Detected by `unitsConflict()` in `client/src/utils/timetable.ts`. Status: `'conflict'`.
- **Campus Conflict** — two Selected Units are on different campuses with less than 40 minutes between them (no time overlap). Detected by `unitsCampusConflict()` in `client/src/utils/timetable.ts`. Status: `'campus-conflict'`.
- **Campus** — a physical VŠE location. Jižní Město: rooms prefixed `JM`. Žižkov: rooms prefixed `RB`, `NB`, `IB`, or `SB`. Type: `Campus = 'jizni-mesto' | 'zizkov' | 'unknown'` in `client/src/utils/timetable.ts`.
- **Facet** — a filterable dimension returned by the API (faculty, level, language, etc.) with item counts. Lives in `coursesStore.facets`.
- **Filter** — a user-selected constraint narrowing Course search results. State lives exclusively in `filtersStore`.
- **Incomplete Selection** — a Course in the timetable where the student has selected at least one unit type but not all required types. Status: `'incomplete'`. Detected by `checkCourseCompleteness()` in `client/src/utils/timetable.ts`.
- **Wizard** — the onboarding flow where a student selects their Faculty, Year, Semester, Study Plans, and marks completed courses. Four steps; state split across three stores.
- **Period** — a semester instance: year + semester code (e.g. `2024` + `'ZS'`). Used in filters as `years` + `semesters` arrays.
- **InSIS** — VŠE's information system (insis.vse.cz); the upstream data source scraped by the Scraper service.
- **Job** — a BullMQ unit of work. `ScraperRequest*` jobs are sent by the API and processed by the Scraper. `ScraperResponse*` jobs are sent by the Scraper and processed by the API.

---

## Architecture Seams

Where behaviour can be swapped without touching the rest of the codebase:

- **Service layer** (`client/src/services/`) — all HTTP calls go through here. Swap HTTP for GraphQL or a mock here; stores call `fetchCoursesFromService()` etc. and do not need to change.
- **filtersStore** (`client/src/stores/filters.store.ts`) — owns all filter state and persistence. Swap LocalStorage for a URL-based strategy here; no other store holds filter values.
- **`client/src/utils/timetable.ts`** — pure conflict detection (`unitsConflict`, `unitsCampusConflict`, `checkCourseCompleteness`). No Vue dependency. Extend or swap conflict logic here without touching stores.
- **`client/src/utils/course.ts`** — pure slot-type detection (`getSlotType`) and CSS class helpers. No i18n dependency. Extend slot type mapping here without touching `useCourseLabels`.

---

## ADRs

Decisions not to re-litigate:

- **ADR-001**: `filtersStore` is the single source of truth for filter state. `coursesStore` does NOT proxy filter setters — it reads from `filtersStore` and calls `filtersStore.setFilter()`.
- **ADR-002**: `timetableStore` does NOT import `coursesStore`. Course data needed for conflict display is snapshotted into `SelectedCourseUnit.snapshotAvailableTypes` at `addUnit()` time.
- **ADR-003**: Wizard state is split into three stores by concern — `wizard.store` (navigation + selections), `wizard-data.store` (remote facets + loading), `completed-courses.store` (completed course idents). Do not re-merge them.
- **ADR-004**: `getSlotType()` and CSS class helpers live in `client/src/utils/course.ts` (no i18n). They must not move back into `useCourseLabels`.
- **ADR-005**: Campus conflict is a client-side detection feature. The 40-minute travel buffer between Jižní Město and Žižkov is hardcoded as `CAMPUS_TRAVEL_MINUTES` in `client/src/utils/timetable.ts` and is intentionally not configurable at runtime.
