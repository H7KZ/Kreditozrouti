# Client — CLAUDE.md

> Full reference: [docs/dev/client/](../docs/client/README.md)

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

| Alias                 | Resolves to            | Rule                                                      |
| --------------------- | ---------------------- | --------------------------------------------------------- |
| `@client/*`           | `./src/*`              | —                                                         |
| `@kreditozrouti/core` | `../packages/core/src` | Runtime values (functions, consts) — no DB/HTTP internals |

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

**`v-html` sanitization:** any `v-html` bound to scraped/user content (e.g. InSIS syllabus) MUST go through
`renderMarkdown()` from `@client/utils/markdown` (marked -> DOMPurify). Never bind `marked.parse(...)` or raw HTML to
`v-html` directly - scraped HTML is untrusted (stored XSS).

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
kreditozrouti:feedback   → { submitted, dismissedAt, visitDays }
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

schedule-slots.store
  ├── timetable.store   (loadUnits on slot load)
  └── feedback.store    (registerKeyAction after successful save - one-directional)

filters.store / ui.store / drag.store / alerts.store / feedback.store - no circular deps
```

**Feedback store is a leaf:** `feedback.store` imports no other store (so it cannot create a cycle). The
schedule-slots → feedback edge is one-directional, the same shape as stores that already call `analytics`.

---

## Key Docs

| Topic                                             | Doc                                             |
| ------------------------------------------------- | ----------------------------------------------- |
| All 9 stores in full detail                       | [STORES.md](../docs/client/STORES.md)           |
| All composables                                   | [COMPOSABLES.md](../docs/client/COMPOSABLES.md) |
| Conflict detection, status system, timetable grid | [TIMETABLE.md](../docs/client/TIMETABLE.md)     |
| API client, i18n, utils, types, constants         | [INTERNALS.md](../docs/client/INTERNALS.md)     |
