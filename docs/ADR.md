# Architectural Decision Records

Decisions not to re-litigate. Each ADR is locked — open a discussion before changing behaviour that contradicts one.

---

- **ADR-001**: `filtersStore` is the single source of truth for filter state. `coursesStore` does NOT proxy filter
  setters — it reads from `filtersStore` and calls `filtersStore.setFilter()`.

- **ADR-002**: `timetableStore` does NOT import `coursesStore`. Course data needed for conflict display is snapshotted
  into `SelectedCourseUnit.snapshotAvailableTypes` at `addUnit()` time.

- **ADR-003**: Wizard state is split into three stores by concern — `wizard.store` (navigation + selections),
  `wizard-data.store` (remote facets + loading), `completed-courses.store` (completed course idents). Do not re-merge
  them.

- **ADR-004**: `getSlotType()` lives in `shared/domain/insis.ts`. CSS class helpers live in the client. They must not be
  merged with i18n-dependent utilities.

- **ADR-005**: Campus conflict is client-side detection. The 40-minute travel buffer between Jižní Město and Žižkov is
  hardcoded as `CAMPUS_TRAVEL_MINUTES` and is intentionally not configurable at runtime.

- **ADR-006**: The Scraper never writes to the database and never schedules its own jobs. All persistence goes through
  the API via `ScraperResponseQueue`. Schedulers live in the API and only run in `NODE_ENV=production`.
