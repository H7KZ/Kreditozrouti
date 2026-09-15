# Web — Documentation Index

The web documentation is split into focused files for easier navigation.

## Documents

| File                                           | Contents                                                                                                                           |
|------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------|
| [web/README.md](web/README.md)           | Architecture overview, layers, pages, bootstrap sequence, filter flow, directory structure                                         |
| [web/STORES.md](web/STORES.md)           | All Pinia stores: state shape, computed, actions, persistence, dependency graph                                                    |
| [web/COMPOSABLES.md](web/COMPOSABLES.md) | All composables: pure transforms, store-reading, special (drag, refresh, status filter)                                            |
| [web/TIMETABLE.md](web/TIMETABLE.md)     | Timetable grid, conflict system (hard + campus), `SelectedCourseUnit`, status precedence, drag-to-filter, hide-conflicting feature |
| [web/INTERNALS.md](web/INTERNALS.md)     | API client, i18n, types reference, utils, constants, component conventions, a11y, SEO                                              |

## Quick Orientation

**"How does selecting a filter trigger a course fetch?"**
→ [web/README.md — Filter Flow](web/README.md#filter-flow)

**"Where does filter state live?"**
→ [web/STORES.md — filters.store](web/STORES.md#filtersstore-usefiltersstore)

**"How does adding a unit to the timetable work?"**
→ [web/TIMETABLE.md — Data Flow](web/TIMETABLE.md#data-flow)

**"How are conflicts detected?"**
→ [web/TIMETABLE.md — Conflict Detection](web/TIMETABLE.md#conflict-detection)

**"What does CourseStatus look like and what status wins?"**
→ [web/TIMETABLE.md — Course Status System](web/TIMETABLE.md#course-status-system)

**"How does the wizard work?"**
→ [web/STORES.md — wizard.store](web/STORES.md#wizardstore-usewizardstore)

**"How do I add a new filter?"**
→ [web/README.md — web/CLAUDE.md reference](web/README.md) (see `../web` § How to Add Common
Things)

**"How does the drag-to-filter on the timetable work?"**
→ [web/TIMETABLE.md — TimetableGrid](web/TIMETABLE.md#timetablegrid) + [web/COMPOSABLES.md — useTimetableDrag](web/COMPOSABLES.md#usetimetabledraggridref-gettimefromx)

**"How do HTTP errors get shown to the user?"**
→ [web/INTERNALS.md — API Client](web/INTERNALS.md#api-client-srcapits)
