# Client — Documentation Index

The client documentation is split into focused files for easier navigation.

## Documents

| File                                           | Contents                                                                                                                           |
|------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------|
| [client/README.md](client/README.md)           | Architecture overview, layers, pages, bootstrap sequence, filter flow, directory structure                                         |
| [client/STORES.md](client/STORES.md)           | All Pinia stores: state shape, computed, actions, persistence, dependency graph                                                    |
| [client/COMPOSABLES.md](client/COMPOSABLES.md) | All composables: pure transforms, store-reading, special (drag, refresh, status filter)                                            |
| [client/TIMETABLE.md](client/TIMETABLE.md)     | Timetable grid, conflict system (hard + campus), `SelectedCourseUnit`, status precedence, drag-to-filter, hide-conflicting feature |
| [client/INTERNALS.md](client/INTERNALS.md)     | API client, i18n, types reference, utils, constants, component conventions, a11y, SEO                                              |

## Quick Orientation

**"How does selecting a filter trigger a course fetch?"**
→ [client/README.md — Filter Flow](client/README.md#filter-flow)

**"Where does filter state live?"**
→ [client/STORES.md — filters.store](client/STORES.md#filtersstore-usefiltersstore)

**"How does adding a unit to the timetable work?"**
→ [client/TIMETABLE.md — Data Flow](client/TIMETABLE.md#data-flow)

**"How are conflicts detected?"**
→ [client/TIMETABLE.md — Conflict Detection](client/TIMETABLE.md#conflict-detection)

**"What does CourseStatus look like and what status wins?"**
→ [client/TIMETABLE.md — Course Status System](client/TIMETABLE.md#course-status-system)

**"How does the wizard work?"**
→ [client/STORES.md — wizard.store](client/STORES.md#wizardstore-usewizardstore)

**"How do I add a new filter?"**
→ [client/README.md — client/CLAUDE.md reference](client/README.md) (see `client/CLAUDE.md` § How to Add Common Things)

**"How does the drag-to-filter on the timetable work?"**
→ [client/TIMETABLE.md — TimetableGrid](client/TIMETABLE.md#timetablegrid) + [client/COMPOSABLES.md — useTimetableDrag](client/COMPOSABLES.md#usetimetabledraggridref-gettimefromx)

**"How do HTTP errors get shown to the user?"**
→ [client/INTERNALS.md — API Client](client/INTERNALS.md#api-client-srcapits)
