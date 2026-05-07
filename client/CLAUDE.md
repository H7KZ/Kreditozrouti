# client/CLAUDE.md

**Deep-dive architecture reference for the Vue 3 frontend (`client/`). A new Claude session reading only this file should have complete understanding of the client without exploring the codebase.**

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Store Reference](#2-store-reference)
3. [Composable Reference](#3-composable-reference)
4. [Utils Reference](#4-utils-reference)
5. [Types Reference](#5-types-reference)
6. [Campus Conflict Feature](#6-campus-conflict-feature)
7. [Path Aliases](#7-path-aliases)
8. [How to Add Common Things](#8-how-to-add-common-things)
9. [Known Patterns](#9-known-patterns)

---

## 1. Architecture Overview

### Layers

```
Pages (file-based routing from src/pages/)
  └── Components (src/components/)
        └── Stores (src/stores/)          ← state source of truth
              └── Composables (src/composables/)  ← shared logic
                    └── Utils (src/utils/)        ← pure functions
                          └── Services (src/services/) ← API calls via api.ts
```

### Store Dependency Graph

```
wizard.store
  ├── imports → completed-courses.store  (delegates completedCourseIdents)
  └── imports → wizard-data.store        (triggers load* calls)

wizard-data.store
  └── imports → wizard.store             (reads facultyId, year, semester, studyPlanIds)

completed-courses.store
  ├── imports → wizard-data.store        (reads studyPlans, studyPlanCourses)
  └── imports → wizard.store             (reads selectedStudyPlans for category map)

courses.store
  ├── imports → filters.store            (reads filters, mergedExcludeTimes)
  ├── imports → wizard.store             (reads studyPlanIds, completedCourseIdents for init)
  └── imports → timetable.store          (reads selectedTimesForExclusion for hide-conflicting)

filters.store
  └── imports → InSISService (api)       (for getUpcomingPeriod)

timetable.store
  └── imports → filters.store            (syncTimetableExcludeTimes after add/remove)
  NOTE: timetable.store does NOT import courses.store (avoids circular dep)

ui.store        — no store imports
drag.store      — no store imports
alerts.store    — no store imports
```

### Filter Flow

```
User changes a filter
  → FilterPanel calls filtersStore.setFilter(key, value)
  → courses.vue watches filtersStore.filters (deep)
  → calls coursesStore.fetchCourses()
  → fetchCourses reads filtersStore.filters + filtersStore.mergedExcludeTimes
  → POST /courses
  → courses.value, facets.value, pagination.value updated
  → CourseTable re-renders
```

`mergedExcludeTimes` = `filters.exclude_times` (manual) + `timetableExcludeTimes` (when `hideConflictingCourses` is true).

### Bootstrap Sequence (`src/index.ts`)

```
1. createApp(App)
2. createRouter (vue-router/auto-routes from pages/)
3. createI18n (locale from localStorage 'locale', default 'cs')
4. createPinia
5. Sentry.init (if VITE_SENTRY_DSN set)
6. app.use(router, i18n, pinia)
7. useAlertsStore()          — initializes store (no hydration needed)
8. useCoursesStore()         — initializes store
9. useTimetableStore().hydrate()   — loads from localStorage key 'kreditozrouti:timetable'
10. useUIStore().hydrate()          — loads from localStorage key 'kreditozrouti:ui'
11. useWizardStore().hydrate()      — loads from localStorage key 'kreditozrouti:wizard',
                                      also calls completedCoursesStore.hydrate()
                                      and conditionally triggers wizard-data load* calls
12. app.mount('#app')
```

The `wizardDataStore` is NOT hydrated — it holds API responses only and refetches on demand.

---

## 2. Store Reference

### `wizard.store` (`useWizardStore`)

**Owns:** `currentStep`, `facultyId`, `year`, `semester`, `selectedStudyPlans`, `completed`

**Does NOT own:** Remote data (study plans list, facets) → that is `wizard-data.store`. Completed course idents → that is `completed-courses.store` (forwarded here via deprecated computed for backward compat).

**Persisted:** Yes, to `STORAGE_KEYS.WIZARD` (`'kreditozrouti:wizard'`). Hydrates `completed-courses.store` from the same blob.

**Key methods:**

| Method | Effect |
|--------|--------|
| `selectFaculty(id)` | Sets facultyId, clears downstream state, triggers `wizardDataStore.loadYearFacets()`, advances to step 2 |
| `selectYear(year)` | Sets year, triggers `wizardDataStore.loadStudyPlans()`, advances to step 3 |
| `toggleStudyPlan(id, ident, title)` | Adds/removes from `selectedStudyPlans` |
| `proceedToCompletedCourses()` | Advances to step 4, triggers `wizardDataStore.loadStudyPlanCourses()` if needed |
| `completeWizard()` | Sets `completed = true`, persists |
| `goToStep(n)` | Navigates to step 1-4, clears downstream state if going back |
| `reset()` | Full reset, removes localStorage key |
| `hydrate()` | Loads from localStorage, restores `completed-courses.store`, conditionally triggers data loads |

**Key computed:** `studyPlanIds` (number[]), `studyPlanIdents`, `step1Complete`–`step4Complete`, `canProceedToStep2`–`canComplete`, `selectionSummary`

**Consumers:** `courses.store` (initializeFromWizard), wizard step components

---

### `wizard-data.store` (`useWizardDataStore`)

**Owns:** `facultyFacets`, `yearFacets`, `levelFacets`, `studyPlans` (StudyPlanWithRelations[]), `studyPlanCourses` (Course[]), `loading`, `studyPlanCoursesLoading`, `error`

**Does NOT own:** Any user selections — those are in `wizard.store`.

**Persisted:** No. All state is refetched from API on demand.

**Key methods:**

| Method | Reads from | Fetches |
|--------|-----------|---------|
| `loadInitialFacets()` | — | `POST /study_plans` (semesters: ZS, limit: 0) → facultyFacets, yearFacets |
| `loadYearFacets()` | `wizardStore.facultyId` | `POST /study_plans` filtered by faculty → yearFacets |
| `loadStudyPlans()` | `wizardStore.{facultyId, year, semester}` | `POST /study_plans` → studyPlans, levelFacets |
| `loadStudyPlanCourses()` | `wizardStore.studyPlanIds` | `POST /study_plans/courses` → studyPlanCourses |
| `resetData()` | — | Clears studyPlans, studyPlanCourses |

**Consumers:** `completed-courses.store` (reads studyPlans, studyPlanCourses), wizard step components

---

### `completed-courses.store` (`useCompletedCoursesStore`)

**Owns:** `completedCourseIdents` (persisted), `completedCoursesSearch`, `completedCoursesCategoryFilter`, `levelFilter`, `titleSearch` (UI-only, not persisted)

**Does NOT own:** The list of study plan courses — sourced from `wizard-data.store`.

**Persisted:** `completedCourseIdents` only, written to `STORAGE_KEYS.WIZARD` blob (same key as wizard.store, different shape).

**Key methods:**

| Method | Notes |
|--------|-------|
| `toggleCompletedCourse(ident)` | Adds/removes from `completedCourseIdents`, persists |
| `markCourseCompleted(ident)` / `unmarkCourseCompleted(ident)` | Non-toggle variants |
| `setCompletedCoursesCategoryFilter(cats)` | UI filter for wizard step 4 display |
| `setLevelFilter(levels)` / `setTitleSearch(s)` | Wizard step 3 plan picker filters |
| `clearCompletedCourses()` | Resets idents (called when faculty/year/plan changes) |
| `resetUIFilters()` | Clears search/category filters only |
| `hydrate(idents)` | Called from `wizard.store.hydrate()` |
| `persist()` | Saves `completedCourseIdents` to localStorage |

**Key computed:** `filteredStudyPlanCourses` (search + category filtered), `studyPlanCoursesByCategory` (Map), `availableCourseCategories` (priority-sorted), `isCourseCompleted(ident)` (getter), `courseIdentToCategories` (Map<ident, Set<category>>)

**Consumers:** `wizard.store` (delegates persist/hydrate), wizard step 4 component, courses page (via wizardStore.completedCourseIdents)

---

### `courses.store` (`useCoursesStore`)

**Owns:** `courses` (CourseWithRelations[]), `facets`, `pagination`, `loading`, `error`, `expandedCourseIds`

**Does NOT own:** Any filter state — all filters live in `filters.store`. The exclude-times merge logic is in `filters.store.mergedExcludeTimes`.

**Key methods:**

| Method | Notes |
|--------|-------|
| `fetchCourses()` | Reads `filtersStore.filters` + `filtersStore.mergedExcludeTimes`, calls `POST /courses`, updates courses/facets/pagination |
| `initializeFromWizard()` | Calls `filtersStore.initializeFromWizard(studyPlanIds, completedIdents)` — sets semester/year/study_plan_ids/completed_course_idents |
| `toggleHideConflictingCourses()` | Calls `filtersStore.toggleHideConflicting(timetableStore.selectedTimesForExclusion)`, then fetchCourses |
| `resetFilters()` | Delegates to `filtersStore.resetFilters(studyPlanIds, completedIdents)` |
| `toggleCourseExpansion(id)` / `isCourseExpanded(id)` | Local UI toggle for course row expansion |
| `goToPage(n)` / `nextPage()` / `prevPage()` / `setPageSize(n)` | Mutate `filtersStore.filters.offset`/`limit` |

**Consumers:** `FilterPanel.vue`, `CourseTable.vue`, `CourseStatusFilter.vue`, `courses.vue`

---

### `filters.store` (`useFiltersStore`)

**Owns:** ALL filter state. `filters` (CoursesFilter), `hideConflictingCourses`, `timetableExcludeTimes`

**Does NOT own:** Course results, facets, pagination — those are in `courses.store`.

**Key state shape** (CoursesFilter):
```typescript
{
  ids, idents, title, semesters, years, faculty_ids, levels, languages,
  include_times, exclude_times, lecturers, study_plan_ids, groups,
  categories, ects, mode_of_completions, mode_of_deliveries,
  completed_course_idents,
  sort_by: 'ident', sort_dir: 'asc', limit: 50, offset: 0
}
```

**Key methods:**

| Method | Notes |
|--------|-------|
| `setFilter(key, value)` | Sets any filter field, resets offset to 0 |
| `addIncludeTime(ts)` / `removeIncludeTime(i)` / `clearIncludeTimes()` | Manages `include_times` array |
| `addExcludeTime(ts)` / `removeExcludeTime(i)` / `clearExcludeTimes()` | Manages manual `exclude_times` array |
| `initializeFromWizard(planIds, completedIdents)` | Sets study_plan_ids, completed_course_idents, year/semester from `InSISService.getUpcomingPeriod()` |
| `syncTimetableExcludeTimes(times)` | Called by `timetable.store` after unit add/remove when hideConflicting is on |
| `toggleHideConflicting(timetableTimes)` | Flips `hideConflictingCourses`, updates `timetableExcludeTimes` |
| `resetFilters(planIds, completedIdents)` | Resets to defaults, re-applies wizard context |
| `resetAll()` | Full reset including wizard context |

**Key computed:** `mergedExcludeTimes` (manual + timetable), `activeFilterCount`, `hasActiveFilters`

**Consumers:** `courses.store` (reads all), `FilterPanel.vue`, `FilterTimeRange.vue`, `TimetableGrid.vue` (drag writes include_times via `useTimetableDrag`), `useCourseStatusFilter` (writes idents), `useTimeFilterMatching` (reads include_times/exclude_times)

---

### `timetable.store` (`useTimetableStore`)

**Owns:** `selectedUnits` (SelectedCourseUnit[])

**Does NOT own:** Drag state (in `drag.store`). Course data beyond what was snapshotted at add-time.

**Persisted:** Yes, to `STORAGE_KEYS.TIMETABLE` (`'kreditozrouti:timetable'`). Hydrated in `index.ts` bootstrap.

**Key computed:**

| Computed | Returns |
|----------|---------|
| `selectedCourseIds` | unique courseId numbers |
| `unitsByCourse` | Map<courseId, SelectedCourseUnit[]> |
| `unitsByDay` | Map<InSISDay, SelectedCourseUnit[]> |
| `totalEcts` | sum of ECTS (one per unique courseId) |
| `selectedTimesForExclusion` | TimeSelection[] for hide-conflicting feature |
| `conflicts` | Array<[SelectedCourseUnit, SelectedCourseUnit]> — hard overlaps |
| `campusConflicts` | Array<[SelectedCourseUnit, SelectedCourseUnit]> — campus travel conflicts |
| `coursesWithConflicts` | Map<courseId, Set<ident>> |
| `coursesWithCampusConflicts` | Map<courseId, Set<ident>> |
| `courseStatuses` | **Map<courseId, CourseStatus>** — the primary status map consumed by all UI |
| `coursesWithIssuesCount` | count of courses where status !== 'selected' |

**Status precedence (in `courseStatuses`):** `'conflict'` > `'campus-conflict'` > `'incomplete'` > `'selected'`

**Key methods:**

| Method | Notes |
|--------|-------|
| `addUnit(course, unit, slot)` | Snapshots `snapshotAvailableTypes` from course.units, pushes to selectedUnits, persists, syncs exclusion |
| `removeUnit(unitId)` | Removes by unitId, persists, syncs exclusion |
| `removeCourse(courseId)` | Removes all units for course, persists, syncs exclusion |
| `changeUnit(course, oldSlotId, newUnit, newSlot)` | Atomic swap: removes old, adds new |
| `getSlotConflicts(slot)` | Returns selected units that hard-conflict with slot |
| `getSlotCampusConflicts(slot)` | Returns selected units that campus-conflict with slot |
| `getUnitConflicts(unit)` / `getUnitCampusConflicts(unit)` | Returns SlotConflictInfo[] for all slots in a unit |
| `hasCourseSelected(courseId)` | Boolean check |
| `getCourseStatus(courseId)` | Returns CourseStatus or undefined |
| `hydrate()` / `persist()` / `clearAll()` | localStorage lifecycle |

**Critical pattern:** `addUnit()` snapshots `snapshotAvailableTypes` from the full course so `checkCourseCompleteness()` in the `courseStatuses` computed does not need to call `useCoursesStore()`.

**Consumers:** `TimetableCourseBlock.vue`, `UnitSelector.vue`, `CourseTable.vue`, `CourseStatusFilter.vue`, `CourseStatusSummary.vue`, `useCourseUnitSelection`, `useCourseStatusFilter`, `useSharedCourseStatusFilter`

---

### `ui.store` (`useUIStore`)

**Owns:** `viewMode` ('list'|'timetable'), `sidebarCollapsed`, `showLegend`, `globalLoading`, `mobileMenuOpen`, `mobileFilterOpen`

**Persisted:** `viewMode`, `sidebarCollapsed`, `showLegend` → `STORAGE_KEYS.UI`

**Key methods:** `setViewMode(mode)`, `toggleViewMode()`, `switchToListView()`, `switchToTimetableView()`, `toggleLegend()`, `setShowLegend(bool)`, `toggleMobileMenu()`, `toggleMobileFilter()`

**Consumers:** Nearly all layout components; `useTimetableDrag` (calls `switchToListView()` after drag filter)

---

### `drag.store` (`useDragStore`)

**Owns:** `dragSelection` (DragSelection), `showDragPopover`, `dragPopoverPosition`

**Used exclusively by:** `useTimetableDrag` composable and `TimetableGrid.vue`. Nothing else should import this store.

**Key methods:** `startDrag(day, time)`, `updateDrag(day, time)`, `endDrag(x, y)`, `cancelDrag()`, `isInDragSelection(day, time)`

**Key computed:** `normalizedDragSelection` — `{day, timeFrom, timeTo}` with min/max normalization, or null

---

### `alerts.store` (`useAlertsStore`)

**Owns:** `alerts` (Alert[])

**Key methods:** `addAlert(alert)`, `removeAlert(index)`, `removeLatestAlert()`, `removeAlertById(customId)`

Auto-removal: `addAlert()` calls `setTimeout` if `alert.timeout` is set and stores the handle in `alert._timeout`.

**Consumers:** `api.ts` (adds error alerts on HTTP failures), any component that needs to surface notifications

---

## 3. Composable Reference

All composables exported from `src/composables/index.ts`.

### Pure data transforms (no store access, no DOM)

| Composable | Description | Key exports |
|-----------|-------------|-------------|
| `useSlotMerging(unitsByDay)` | Merges recurring one-time slots (same day-of-week, course, time, type) into `MergedUnit` blocks | `mergedUnitsByDay` (computed Map) |
| `useTimeUtils()` | Time math | `minutesToTime`, `timeToMinutes`, `formatTime`, `formatTimeRange`, `formatTimeSelection`, `calculateTimePosition`, `calculateTimeDuration`, `generateTimeOptions`, `generateTimeSlots`, `snapToInterval`, `clampTime`, `timeRangesOverlap` |
| `useSlotSorting()` | Sort strategies | `sortSlots`, `sortUnits`, `sortUnitsByType`, `getUniqueDays`, `getSlotDay` |
| `useDebounce(initialValue, opts)` | Debounced ref pair | `value`, `debouncedValue`, `cancel`, `flush` |
| `useDebouncedFn(fn, delay)` | Debounced callback | Function with `.cancel` |
| `usePopover(position, opts)` | Viewport-safe popover positioning | `popoverStyle` (computed), `calculatePosition`, `wouldOverflow` |
| `useClickOutside(ref, opts)` | Click-outside + Escape handlers via `onMounted`/`onUnmounted` | `handleClickOutside`, `handleKeyDown` |

### Store-reading composables

| Composable | Stores used | Description |
|-----------|-------------|-------------|
| `useTimetableGrid(unitsByDay, opts)` | `useTimeUtils` | Pixel geometry: `timeSlots` header, `getBlockStyle(unit, day)` → CSS left/width/top/height, `getOverlapInfo(day)`, `overlapCache`, `getTimeFromX`, `getDragSelectionStyle` |
| `useCourseUnitSelection({course})` | `useTimetableStore` | Groups units by type composition (`unitsByGroup`), manages add/remove/swap logic. `handleAddUnit` removes existing units of same type before adding (swap). `missingUnitTypes`, `isSelectionComplete`, `hasIncompleteSelection` |
| `useTimeFilterMatching()` | `useFiltersStore` | `slotMatchesTimeFilter(slot)`, `slotMatchesExcludeFilter(slot)`, `unitMatchesTimeFilter(unit)`, `unitFullyMatchesTimeFilter(unit)`, `getSlotHighlightClass(slot, type)` |
| `useScheduleSummary()` | none (uses i18n + day utils) | `getScheduleSummary(units)` → "Po, St", `getScheduleSummaryFull`, `getTimeRangeSummary`, `hasBlockSlots`, `hasRecurringSlots` |
| `useSlotFormatting()` | none (uses `useTimeUtils`, `useCourseLabels`) | `formatSlotInfo(slot)`, `formatSlotDay`, `formatSlotTime`, `formatSlotLocation`, `formatSlotDate`, `formatCapacity`, `getCapacityClass`, `isBlockSlot`, `isRecurringSlot`, `formatSlotsSummary` |
| `useFacetFiltering(facets, selected, opts)` | none (pure) | Re-injects selected items with `count: 0` when they drop from API response. `combinedFacets`, `sortedFacets`, `filterBySearch`, `getVisibleFacets`, `toggleListExpanded`, `toggleSelection` |

### Special composables

**`useCourseLabels()`** — i18n label lookups only. Reads `i18n.global`. Does NOT contain `getSlotType` logic (that is in `utils/course.ts`), but re-exports it for convenience along with `getUnitTypeColorClass` and `getCategoryBadgeClass`.

Key exports: `getSemesterLabel`, `getCompletionLabel`, `getFacultyLabel`, `getLanguageLabel`, `getLanguagesLabel`, `getCategoryLabel`, `getGroupLabel`, `getLevelLabel`, `getCourseLevelLabel`, `getUnitTypeLabel`, `getShortUnitTypeLabel`, `getUnitTypeAccusativeLabel`, `getUnitTypesGroupLabel`, `getDayLabel`, `getShortDayLabel`, `getCourseTitle`, `getUnitCourseTitle`

**`useCourseStatusFilter()`** — Creates independent filter state (`selectedStatuses`, `selectedCourseIdents`). Reads `useTimetableStore().courseStatuses`. When filter applied, writes `filtersStore.filters.idents` and calls `coursesStore.fetchCourses()`. When filtering by 'conflict', expands to include both sides of each conflict pair.

**`useSharedCourseStatusFilter()`** — Module-level singleton of `useCourseStatusFilter()`. Use this in all components so status/ident filter state is shared. Reset with `resetCourseStatusFilter()` on page transitions.

**`useTimetableDrag(gridRef, getTimeFromX)`** — Registers global `mousemove`/`mouseup` listeners in `onMounted`, removes in `onUnmounted`. Internally accesses `dragStore`, `filtersStore`, `uiStore`, `coursesStore`. After drag completes: sets `filtersStore.filters.include_times`, calls `uiStore.switchToListView()`, calls `coursesStore.fetchCourses()`. Returns: `handleMouseDown`, `handleDragFilter`, `handleDragCancel`.

---

## 4. Utils Reference

All utils are pure functions — no Vue reactivity, no store access. Safe to call from stores.

### `utils/timetable.ts`

```typescript
export const CAMPUS_TRAVEL_MINUTES = 40
export type Campus = 'jizni-mesto' | 'zizkov' | 'unknown'

getCampus(location: string | null | undefined): Campus
// Prefix detection: 'JM' → jizni-mesto; 'RB'|'NB'|'IB'|'SB' → zizkov; else unknown
// Splits on /[.\-\s]/ and uppercases first token

unitsConflict(a: SelectedCourseUnit, b: SelectedCourseUnit): boolean
// Same day, time ranges overlap: a.timeFrom < b.timeTo && b.timeFrom < a.timeTo

unitsCampusConflict(a: SelectedCourseUnit, b: SelectedCourseUnit): boolean
// Same day, NOT already hard-conflicting, different known campuses,
// gap = max(a.timeFrom, b.timeFrom) - min(a.timeTo, b.timeTo) < 40 and >= 0

checkCourseCompleteness(units: SelectedCourseUnit[], _getSlotType?): { isIncomplete, missingTypes }
// Reads snapshotAvailableTypes from units[0]; compares to selected unit types
// isIncomplete = true only when selectedTypes.size > 0 AND some required type is missing
```

### `utils/course.ts`

```typescript
getSlotType(slot: CourseUnitSlot): CourseUnitType
// Checks slot.type string for Czech/English keywords: přednáška/lecture → 'lecture',
// cvičení/exercise → 'exercise', seminář/seminar → 'seminar'. Defaults to 'lecture'.

getUnitTypeColorClass(type: CourseUnitType): string
// Returns CSS var class: bg-[var(--insis-block-lecture|exercise|seminar)]

getCategoryBadgeClass(category: string): string
// 'compulsory' → 'insis-badge-compulsory', 'elective' → 'insis-badge-elective', else 'insis-badge-other'
```

No i18n dependency — safe to import from stores.

### `utils/day.ts`

```typescript
getSlotDay(slot: CourseUnitSlot): InSISDay | null
// slot.day ?? getDayFromDate(slot.date)

getDayFromDate(dateStr: string | null | undefined): InSISDay | null
// Parses DD.MM.YYYY, converts to day-of-week. JS getDay() 0=Sun → index 6; 1=Mon → index 0

getDayIndex(day: InSISDay | null | undefined): number
// Position in DAYS_ORDER (Mon=0 ... Sun=6), 999 for invalid

compareDateStrings(a: string, b: string): number
// Compares DD.MM.YYYY strings chronologically

parseDateString(dateStr: string): Date | null
```

### `utils/localstorage.ts`

```typescript
saveToStorage<T>(key: string | StorageKey, state: T): void
loadFromStorage<T>(key: string | StorageKey): T | null   // returns null on parse error; removes corrupt key
removeFromStorage(key: string | StorageKey): void
hasInStorage(key: string | StorageKey): boolean
```

### `utils/pluralization.ts`

```typescript
czechPluralRule(choice, choicesLength): number
// 0 → form 2 (many); 1 → form 0 (singular); 2-4 → form 1 (few); 5+ → form 2 (many)

datetimeFormats: Record<locale, Record<format, Intl.DateTimeFormatOptions>>
numberFormats: Record<locale, Record<format, Intl.NumberFormatOptions>>
```

Registered in `createI18n` at bootstrap.

### `utils/tailwind.ts`

```typescript
cn(...inputs: ClassValue[]): string   // clsx + tailwind-merge
```

---

## 5. Types Reference

All types exported from `src/types/index.ts`.

### `types/course.ts`

```typescript
type CourseUnitType = 'lecture' | 'exercise' | 'seminar'

interface SelectedCourseUnit {
  courseId: number; courseIdent: string
  courseTitle: string; courseTitleCs: string; courseTitleEn: string
  unitId: number; unitType: CourseUnitType; slotId: number
  day?: InSISDay; date?: string   // one of day or date is set (not both for recurring)
  timeFrom: number; timeTo: number  // minutes from midnight
  location?: string; lecturer?: string; ects?: number
  snapshotAvailableTypes?: CourseUnitType[]  // all types the course had at add-time
}

interface CourseStatus {
  id: number; ident: string; title: string; titleCs: string; titleEn: string
  status: 'selected' | 'conflict' | 'campus-conflict' | 'incomplete'
  conflictsWith: string[]        // course idents
  campusConflictsWith: string[]  // course idents
  missingTypes: CourseUnitType[]
}

type CourseStatusType = 'selected' | 'conflict' | 'campus-conflict' | 'incomplete'

interface SlotConflictInfo {
  slotId: number
  conflictingUnits: SelectedCourseUnit[]
  conflictType?: 'hard' | 'campus'
}

type ConflictType = 'hard' | 'campus'

// Also: CoursesState, CourseUnitWithSlots, UnitGroup, UnitGroupMap, CourseStatusFilterState
```

### `types/wizard.ts`

```typescript
interface SelectedStudyPlan { id: number; ident: string | null; title: string | null }

interface PersistedWizardState {
  facultyId, year, semester, studyPlanId, studyPlanIdent, studyPlanTitle,
  selectedStudyPlans: SelectedStudyPlan[]
  completedCourseIdents: string[]
  completed: boolean
}
```

### `types/timetable.ts`

```typescript
interface DragSelection {
  active: boolean; startDay: InSISDay | null; startTime: number | null
  endDay: InSISDay | null; endTime: number | null
}
interface PersistedTimetableState { selectedUnits: SelectedCourseUnit[] }
```

### `types/ui.ts`

```typescript
interface PersistedUIState { viewMode: ViewMode; sidebarCollapsed: boolean; showLegend: boolean }
```

### `types/view.ts`

```typescript
type ViewMode = 'list' | 'timetable'
```

### `types/api.ts`

```typescript
interface PaginationMeta { limit: number; offset: number; count: number; total: number }
type SortDirection = 'asc' | 'desc'
type CourseSortBy = CoursesFilter['sort_by']
type StudyPlanSortBy = StudyPlansFilter['sort_by']
```

### `types/alert.ts`

```typescript
interface Alert {
  customId?: string; type: 'info' | 'success' | 'warning' | 'error'
  title?: string; description?: string; buttons?: AlertButton[]
  timeout?: number; _timeout?: ReturnType<typeof setTimeout> | number | null
}
```

---

## 6. Campus Conflict Feature

### Campus Detection

Location strings come from `CourseUnitSlot.location` (e.g. `"NB.169"`, `"JM.28"`).

```
getCampus(location):
  Split on /[.\-\s]/, take first token, uppercase
  JM           → 'jizni-mesto'  (Jižní Město campus)
  RB|NB|IB|SB → 'zizkov'       (Žižkov campus)
  anything else → 'unknown'
```

If either unit's location resolves to `'unknown'`, no campus conflict is detected.

### Conflict Detection Logic (`unitsCampusConflict`)

1. Both units must be on the same calendar day (same `day` or same derived day from `date`).
2. If both have `date` set, they must match exactly.
3. Must NOT already be a hard time overlap (`unitsConflict` returns false).
4. Both locations must resolve to different, known campuses.
5. Gap between them < `CAMPUS_TRAVEL_MINUTES` (40 min) and >= 0.
   - `gap = max(a.timeFrom, b.timeFrom) - min(a.timeTo, b.timeTo)`
   - This is the time between end of earlier block and start of later block.

### Status Precedence

In `timetable.store.courseStatuses` computed:
```
hard overlap → 'conflict'    (red)
campus conflict → 'campus-conflict'  (orange/amber)
missing unit type → 'incomplete'    (amber)
all good → 'selected'        (blue)
```

A course gets the highest-severity status among its units.

### Visual Treatment

| Status | Color | Used in |
|--------|-------|---------|
| `conflict` | Red ring, red badge | `TimetableCourseBlock.vue`, `UnitSelector.vue`, `CourseTable.vue` |
| `campus-conflict` | Orange/amber ring, orange badge | Same components |
| `incomplete` | Amber/yellow | Same components |
| `selected` | Blue | Same components |

### Affected Files

- `client/src/utils/timetable.ts` — `unitsCampusConflict`, `getCampus`, `CAMPUS_TRAVEL_MINUTES`
- `client/src/stores/timetable.store.ts` — `campusConflicts`, `coursesWithCampusConflicts`, `courseStatuses` precedence, `getSlotCampusConflicts`, `getUnitCampusConflicts`, `unitHasCampusConflicts`
- `client/src/components/timetable/TimetableCourseBlock.vue` — orange ring visual
- `client/src/components/courses/UnitSelector.vue` — campus conflict alert banner per unit
- `client/src/components/courses/CourseTable.vue` — campus conflict tag in course row
- `client/src/components/filters/CourseStatusFilter.vue` — `campus-conflict` filter option
- `client/src/components/courses/CourseStatusSummary.vue` — campus conflict count display
- `client/src/composables/useCourseStatusFilter.ts` — `coursesWithCampusConflicts`, graph expansion for campus-conflict

### i18n Keys

```
components.filters.CampusConflict.*           — filter panel labels
components.filters.CourseStatusFilter.withCampusConflicts
components.filters.CourseStatusFilter.campusConflictingCourses
components.courses.CourseRowExpanded.campusConflict*  — alert text in UnitSelector
```

---

## 7. Path Aliases

Defined in `client/tsconfig.json` `compilerOptions.paths` and resolved by Vite:

| Alias | Resolves to | Notes |
|-------|------------|-------|
| `@client/*` | `./src/*` | Client source root |
| `@api/*` | `../api/src/*` | Import API types only (no runtime) |
| `@scraper/*` | `../scraper/src/*` | Import scraper types only (e.g. `InSISDay`) |
| `@shared/*` | `../shared/*` | Shared utilities (if present) |

**Rule:** Client may import types from `@api` and `@scraper` but must NOT import their runtime code (no circular deps, no bundling server code).

---

## 8. How to Add Common Things

### New Filter

1. **Add field to `CoursesFilter`** in `api/src/Validations/CoursesFilterValidation.ts`
2. **Add to `filters.store`:**
   - Add to `createDefaultFilters()` return object
   - Add setter (or use generic `setFilter(key, value)` if simple)
   - Increment `activeFilterCount` if applicable
3. **Add to `courses.store.fetchCourses()`** payload building — strip empty arrays with ternary
4. **Add facet component** in `FilterPanel.vue`:
   ```vue
   <FilterCheckboxGroup
     :options="coursesStore.facets.new_field"
     :model-value="filtersStore.filters.new_field"
     @update:model-value="filtersStore.setFilter('new_field', $event)"
   />
   ```
5. **Add i18n keys** for labels
6. **Update API** (`CourseService.ts`) to apply filter in SQL query

### New Collision Type

1. **Add detection function** in `utils/timetable.ts` (parallel to `unitsConflict` / `unitsCampusConflict`)
2. **Add status string** to `CourseStatus.status` union in `types/course.ts`
3. **Add computed** in `timetable.store.ts`:
   - Detect pairs: `newConflicts` computed (parallel to `campusConflicts`)
   - Build map: `coursesWithNewConflicts` computed (parallel to `coursesWithCampusConflicts`)
   - Add `conflictsWith` field to `CourseStatus` interface if needed
4. **Extend `courseStatuses` precedence** in timetable.store:
   ```typescript
   const status = hasHardConflict ? 'conflict'
     : hasNewConflict ? 'new-conflict'
     : hasCampusConflict ? 'campus-conflict'
     : isIncomplete ? 'incomplete'
     : 'selected'
   ```
5. **Add getter methods** on store (parallel to `getSlotCampusConflicts`, `unitHasCampusConflicts`)
6. **Add visual treatment** in `TimetableCourseBlock.vue`, `UnitSelector.vue`, `CourseTable.vue`
7. **Add filter option** in `useCourseStatusFilter.ts` `filterOptions` computed
8. **Add i18n keys**

### New Timetable Composable

Pattern: extract from `TimetableGrid.vue`.

- **Pure data transform** (no DOM, no lifecycle) → plain composable, no `onMounted`
- **DOM/event interaction** → composable with `onMounted`/`onUnmounted` for listener lifecycle
- Export from `composables/index.ts`

```typescript
// Pure:
export function useMyTransform(units: Ref<...>) {
  const result = computed(() => { /* ... */ })
  return { result }
}

// With DOM:
export function useMyInteraction(elementRef: Ref<HTMLElement | null>) {
  onMounted(() => document.addEventListener('click', handler))
  onUnmounted(() => document.removeEventListener('click', handler))
  return { handler }
}
```

---

## 9. Known Patterns

### Persist / Hydrate

```typescript
// In store:
function persist() {
  saveToStorage<PersistedState>(STORAGE_KEYS.KEY, { field1: state1.value })
}
function hydrate() {
  const state = loadFromStorage<PersistedState>(STORAGE_KEYS.KEY)
  if (state) { field1.value = state.field1 }
}

// In index.ts bootstrap:
useMyStore().hydrate()
```

Only `timetableStore`, `uiStore`, and `wizardStore` are hydrated at bootstrap. `wizardStore.hydrate()` also calls `completedCoursesStore.hydrate()`.

### Filter Reactivity

`courses.vue` watches `filtersStore.filters` (deep) and `filtersStore.hideConflictingCourses` to auto-trigger `fetchCourses()`. Do not call `fetchCourses()` manually from filter setters in `filters.store` — the watch handles it. Exception: `toggleHideConflictingCourses()` in `courses.store` calls `fetchCourses()` explicitly after toggling because it needs to pass timetable times first.

### Store Snapshots (Avoiding Circular Imports)

`timetable.store` must not import `courses.store`. Instead, `addUnit()` snapshots `course.units` into `SelectedCourseUnit.snapshotAvailableTypes` at add-time. The `courseStatuses` computed calls `checkCourseCompleteness(units, getSlotType)` which reads from the snapshot — no live course lookup needed.

### `useSharedCourseStatusFilter` Singleton

`useCourseStatusFilter` creates local `selectedStatuses` / `selectedCourseIdents` refs. To share state between `CourseStatusFilter.vue` and `CourseStatusSummary.vue` (sibling components), always call `useSharedCourseStatusFilter()` instead. Call `resetCourseStatusFilter()` when navigating away from the courses page.

### Time Storage Format

All times stored as **minutes from midnight** (integers 0–1440):
- `7:30` = 450, `9:00` = 540, `10:30` = 630, `20:00` = 1200
- Timetable grid: `TIME_CONFIG.START = 450` (7:30), `TIME_CONFIG.END = 1200` (20:00)
- Conversions: `minutesToTime(n)` → `"HH:MM"`, `timeToMinutes("HH:MM")` → `n`

### LocalStorage Keys

```typescript
STORAGE_KEYS.TIMETABLE = 'kreditozrouti:timetable'  // { selectedUnits }
STORAGE_KEYS.WIZARD    = 'kreditozrouti:wizard'      // { facultyId, year, ..., completedCourseIdents }
STORAGE_KEYS.UI        = 'kreditozrouti:ui'          // { viewMode, sidebarCollapsed, showLegend }
```

`locale` is stored at plain key `'locale'` (not in STORAGE_KEYS), read directly in `index.ts`.

### Services Layer

`src/services/courseService.ts` and `src/services/studyPlanService.ts` are thin wrappers around `api.ts` (Axios instance). They are the only files that should call `api.post(...)`. Stores call these services — stores do not use `api` directly.

`api.ts` has a response interceptor that catches all HTTP errors and adds an entry to `alertsStore` automatically. No need to handle errors in stores beyond setting `error.value`.

### Constants

| Constant | File | Value |
|----------|------|-------|
| `DEBOUNCE_TIMING.SEARCH` | `constants/debounce.ts` | 750ms |
| `DEBOUNCE_TIMING.API` | `constants/debounce.ts` | 300ms |
| `PAGINATION_DEFAULTS.PAGE_SIZE` | `constants/pagination.ts` | 50 |
| `TIME_CONFIG.START` | `constants/timetable.ts` | 450 (7:30) |
| `TIME_CONFIG.END` | `constants/timetable.ts` | 1200 (20:00) |
| `TIME_CONFIG.SLOT_DURATION` | `constants/timetable.ts` | 45 min |
| `GRID_ROW_HEIGHT` | `constants/timetable.ts` | 60px |
| `DRAG_THRESHOLD` | `constants/timetable.ts` | 20px |
| `TIME_SNAP_INTERVAL` | `constants/timetable.ts` | 15 min |
| `CAMPUS_TRAVEL_MINUTES` | `utils/timetable.ts` | 40 min |
| `WEEKDAYS` | `constants/timetable.ts` | Mon–Fri InSISDay[] |
| `ALL_DAYS` | `constants/timetable.ts` | Mon–Sun InSISDay[] |

---

*Last updated: 2026-05-07*
