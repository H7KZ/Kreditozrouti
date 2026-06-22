# Client — CLAUDE.md

> Full reference: [docs/client/](../docs/client/README.md)

---

## Layers

```
Pages (src/pages/ — file-based routing via unplugin-vue-router)
  └── Components (src/components/)
        └── Stores (src/stores/)           ← state source of truth
              └── Composables (src/composables/)
                    └── Utils (src/utils/) ← pure functions, no reactivity
                          └── Services (src/services/) ← only files that call api.ts
```

## Path Aliases

| Alias       | Resolves to    | Rule                                            |
| ----------- | -------------- | ----------------------------------------------- |
| `@client/*` | `./src/*`      | —                                               |
| `@api/*`    | `../api/src/*` | Do not use — all shared types are in `@shared/` |
| `@shared/*` | `../shared/*`  | —                                               |

---

## Critical Invariants

**Store dependency rule:** `timetable.store` must NOT import `courses.store`. Completeness checking reads
`snapshotAvailableTypes` (set at `addUnit()` time from the full course object) — no live lookup needed.

**Filter reactivity:** `courses.vue` deep-watches `filtersStore.filters` and calls `fetchCourses()` automatically.
Filter setters must NOT call `fetchCourses()` themselves. Exception: `toggleHideConflictingCourses()` in `courses.store`
calls it explicitly because timetable times must be passed first.

**`mergedExcludeTimes`** = manual `exclude_times` + `timetableExcludeTimes` (only when `hideConflictingCourses` is on).
The API receives the merged array; `courses.store` never builds it directly.

**Status precedence** in `timetable.store.courseStatuses`: `'conflict'` > `'campus-conflict'` > `'incomplete'` >
`'selected'`.

**Campus detection:** `getCampus(location)` splits on `/[.\-\s]/`, uppercases first token. `JM*` → `jizni-mesto`;
`RB|NB|IB|SB` → `zizkov`; else → `'unknown'`. No conflict raised if either campus is `'unknown'`.

**`useSharedCourseStatusFilter()`** is a module-level singleton. Always use it (not `useCourseStatusFilter()` directly)
so `CourseStatusFilter.vue` and `CourseStatusSummary.vue` share state. Call `resetCourseStatusFilter()` on page unmount.

**i18n in stores:** use `i18n.global` (not `useI18n()` — composables are unavailable outside component setup):

```typescript
import { i18n } from '@client/i18n'

const { t } = i18n.global
```

**Times** are **minutes from midnight** (0–1439). `7:30` = 450, `20:00` = 1200.

**localStorage keys:**

```
kreditozrouti:timetable  → { selectedUnits }
kreditozrouti:wizard     → { facultyId, year, ..., completedCourseIdents }
kreditozrouti:ui         → { viewMode, sidebarCollapsed, showLegend }
```

---

## Store Dependency Graph

```
wizard.store
  ├── completed-courses.store
  └── wizard-data.store

courses.store
  ├── filters.store
  ├── wizard.store
  └── timetable.store   (read-only: selectedTimesForExclusion)

timetable.store
  └── filters.store     (syncTimetableExcludeTimes only)
  ✗   courses.store     (FORBIDDEN — circular dep)

filters.store / ui.store / drag.store / alerts.store — no circular deps
```

---

## Key Docs

| Topic                                             | Doc                                             |
| ------------------------------------------------- | ----------------------------------------------- |
| All 9 stores in full detail                       | [STORES.md](../docs/client/STORES.md)           |
| All composables                                   | [COMPOSABLES.md](../docs/client/COMPOSABLES.md) |
| Conflict detection, status system, timetable grid | [TIMETABLE.md](../docs/client/TIMETABLE.md)     |
| API client, i18n, utils, types, constants         | [INTERNALS.md](../docs/client/INTERNALS.md)     |
