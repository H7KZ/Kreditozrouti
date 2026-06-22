# Client — Store Reference

All state lives in Pinia stores (`src/stores/`). Components read stores reactively and call actions — they do not hold
their own state.

---

## Store Dependency Graph

```
wizard.store
  ├── → completed-courses.store  (delegates completedCourseIdents)
  └── → wizard-data.store        (triggers load* calls)

wizard-data.store
  └── → wizard.store             (reads facultyId, year, semester, studyPlanIds)

completed-courses.store
  ├── → wizard-data.store        (reads studyPlans, studyPlanCourses)
  └── → wizard.store             (reads selectedStudyPlans for category map)

courses.store
  ├── → filters.store            (reads filters, mergedExcludeTimes)
  ├── → wizard.store             (reads studyPlanIds, completedCourseIdents for init)
  └── → timetable.store          (reads selectedTimesForExclusion for hide-conflicting)

filters.store                    (no store imports — uses @shared/domain/period directly)

timetable.store
  └── → filters.store            (syncTimetableExcludeTimes after unit add/remove)
  NOTE: timetable.store does NOT import courses.store (avoids circular dep)

ui.store        — no store imports
drag.store      — no store imports
alerts.store    — no store imports
```

---

## `filters.store` (`useFiltersStore`)

**File:** `src/stores/filters.store.ts`

Owns ALL filter state. This is the single source of truth for what the current search query is. `courses.store` never
stores filters — it only reads them.

### State

```typescript
filters: CoursesFilter = {
	ids, idents, title, search,
	semesters, years, faculty_ids, levels, languages,
	include_times, exclude_times, lecturers,
	study_plan_ids, groups, categories, ects,
	mode_of_completions, mode_of_deliveries,
	completed_course_idents,
	sort_by: 'ident', sort_dir: 'asc', limit: 50, offset: 0
}
hideConflictingCourses: boolean
timetableExcludeTimes: TimeSelection[]
```

### Key Computed

| Computed             | Returns                                                                            |
|----------------------|------------------------------------------------------------------------------------|
| `mergedExcludeTimes` | `exclude_times` (manual) + `timetableExcludeTimes` (when `hideConflictingCourses`) |
| `activeFilterCount`  | Number of active non-pagination filters                                            |
| `hasActiveFilters`   | Boolean shortcut                                                                   |

### Key Actions

| Action                                                                | Effect                                                                                         |
|-----------------------------------------------------------------------|------------------------------------------------------------------------------------------------|
| `setFilter(key, value)`                                               | Sets any filter field, resets `offset` to 0                                                    |
| `addIncludeTime(ts)` / `removeIncludeTime(i)` / `clearIncludeTimes()` | Manage `include_times` array                                                                   |
| `addExcludeTime(ts)` / `removeExcludeTime(i)` / `clearExcludeTimes()` | Manage manual `exclude_times`                                                                  |
| `initializeFromWizard(planIds, completedIdents)`                      | Pre-sets study_plan_ids, completed_course_idents, and year/semester from `getUpcomingPeriod()` |
| `syncTimetableExcludeTimes(times)`                                    | Called by `timetable.store` after unit add/remove when hideConflicting is on                   |
| `toggleHideConflicting(timetableTimes)`                               | Flips `hideConflictingCourses`, updates `timetableExcludeTimes`                                |
| `resetFilters(planIds, completedIdents)`                              | Resets to defaults, re-applies wizard context + upcoming period                                |
| `resetAll()`                                                          | Full reset, clears wizard context too                                                          |

**Persisted:** No. Filter state is session-only.

---

## `courses.store` (`useCoursesStore`)

**File:** `src/stores/courses.store.ts`

Owns course results, pagination, and row expansion state. Does NOT own filter state.

### State

```typescript
courses: CourseWithRelationsDTO[]
facets: CoursesResponseDTO['facets']
pagination: {
	limit, offset, count, total
}
loading: boolean
error: string | null
expandedCourseIds: Set<number>
```

### Key Computed

`totalPages`, `currentPage`, `hasNextPage`, `hasPrevPage`

### Key Actions

| Action                                                         | Effect                                                                                                                                                                     |
|----------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `fetchCourses()`                                               | Reads `filtersStore.filters` + `filtersStore.mergedExcludeTimes`, calls `POST /courses`, updates `courses`/`facets`/`pagination`, announces result count to screen readers |
| `initializeFromWizard()`                                       | Calls `filtersStore.initializeFromWizard(studyPlanIds, completedIdents)`                                                                                                   |
| `toggleHideConflictingCourses()`                               | Calls `filtersStore.toggleHideConflicting(timetableStore.selectedTimesForExclusion)`, then `fetchCourses()`                                                                |
| `toggleCourseExpansion(id)` / `isCourseExpanded(id)`           | Local UI toggle — no fetch                                                                                                                                                 |
| `goToPage(n)` / `nextPage()` / `prevPage()` / `setPageSize(n)` | Mutate `filtersStore.filters.offset`/`limit` (watch in `courses.vue` triggers fetch)                                                                                       |
| `updateCourse(updated)`                                        | Replaces a course in the list by ID (used after live scrape completes)                                                                                                     |
| `toggleCompletedCourse(ident)`                                 | Delegates to `wizardStore` + `filtersStore`                                                                                                                                |

**Persisted:** No.

---

## `timetable.store` (`useTimetableStore`)

**File:** `src/stores/timetable.store.ts`

Owns selected course units and all derived conflict/status data.

**Persisted:** Yes → `STORAGE_KEYS.TIMETABLE` (`'kreditozrouti:timetable'`). Hydrated in `index.ts` bootstrap.

### State

```typescript
selectedUnits: SelectedCourseUnit[]
```

### Key Computed

| Computed                              | Returns                                                                      |
|---------------------------------------|------------------------------------------------------------------------------|
| `selectedCourseIds`                   | `number[]` — unique course IDs                                               |
| `unitsByCourse`                       | `Map<courseId, SelectedCourseUnit[]>`                                        |
| `unitsByDay`                          | `Map<InSISDay, SelectedCourseUnit[]>`                                        |
| `totalEcts`                           | Sum of ECTS, one per unique course                                           |
| `selectedTimesForExclusion`           | `TimeSelection[]` — used to feed `filters.store` when hide-conflicting is on |
| `conflicts`                           | `[SelectedCourseUnit, SelectedCourseUnit][]` — hard time overlaps            |
| `campusConflicts`                     | `[SelectedCourseUnit, SelectedCourseUnit][]` — campus travel conflicts       |
| `hasConflicts` / `hasCampusConflicts` | Boolean shortcuts                                                            |
| `coursesWithConflicts`                | `Map<courseId, Set<courseIdent>>`                                            |
| `coursesWithCampusConflicts`          | `Map<courseId, Set<courseIdent>>`                                            |
| `courseStatuses`                      | **`Map<courseId, CourseStatus>`** — primary status map consumed by all UI    |
| `coursesWithIssuesCount`              | Count of courses where status !== 'selected'                                 |

**Status precedence in `courseStatuses`:**

```
hard conflict → 'conflict'
campus conflict → 'campus-conflict'
missing unit type → 'incomplete'
all good → 'selected'
```

### Key Actions

| Action                                                    | Effect                                                                                                       |
|-----------------------------------------------------------|--------------------------------------------------------------------------------------------------------------|
| `addUnit(course, unit, slot)`                             | Snapshots `snapshotAvailableTypes` from `course.units`, pushes to `selectedUnits`, persists, syncs exclusion |
| `removeUnit(unitId)`                                      | Removes by unitId, persists, syncs                                                                           |
| `removeCourse(courseId)`                                  | Removes all units for course, persists, syncs                                                                |
| `changeUnit(course, oldSlotId, newUnit, newSlot)`         | Atomic remove + add (used for swapping lecture/exercise groups)                                              |
| `getSlotConflicts(slot)`                                  | Returns `SelectedCourseUnit[]` that hard-conflict with the given slot                                        |
| `getSlotCampusConflicts(slot)`                            | Returns campus-conflict units for a slot                                                                     |
| `getUnitConflicts(unit)` / `getUnitCampusConflicts(unit)` | `SlotConflictInfo[]` for all slots in a unit                                                                 |
| `hasCourseSelected(courseId)`                             | Boolean                                                                                                      |
| `hasUnitTypeSelected(courseId, type)`                     | Boolean                                                                                                      |
| `getCourseStatus(courseId)`                               | `CourseStatus \| undefined`                                                                                  |
| `hydrate()` / `persist()` / `clearAll()`                  | LocalStorage lifecycle                                                                                       |

**Critical pattern:** `addUnit()` snapshots `snapshotAvailableTypes` from the full course object at add-time.
`courseStatuses` calls `checkCourseCompleteness(units)` which reads from this snapshot — the store never needs to call
`useCoursesStore()` to re-derive completeness.

---

## `wizard.store` (`useWizardStore`)

**File:** `src/stores/wizard.store.ts`

4-step wizard: Faculty → Year → Study Plan(s) → Completed Courses.

**Persisted:** Yes → `STORAGE_KEYS.WIZARD`.

### State

```typescript
currentStep: 1 | 2 | 3 | 4
facultyId: string | null
year: number | null
semester: InSISSemester | null
selectedStudyPlans: SelectedStudyPlan[]
completed: boolean
```

### Key Actions

| Action                              | Effect                                                                                             |
|-------------------------------------|----------------------------------------------------------------------------------------------------|
| `selectFaculty(id)`                 | Sets facultyId, clears downstream, triggers `wizardDataStore.loadYearFacets()`, advances to step 2 |
| `selectYear(year)`                  | Sets year, triggers `loadStudyPlans()`, advances to step 3                                         |
| `toggleStudyPlan(id, ident, title)` | Adds/removes from `selectedStudyPlans`                                                             |
| `proceedToCompletedCourses()`       | Advances to step 4, triggers `loadStudyPlanCourses()` if needed                                    |
| `completeWizard()`                  | Sets `completed = true`, persists                                                                  |
| `goToStep(n)`                       | Navigates, clears downstream state if going back                                                   |
| `reset()`                           | Full reset, removes localStorage key                                                               |
| `hydrate()`                         | Loads from localStorage, restores `completedCoursesStore`, conditionally re-triggers data loads    |

### Key Computed

`studyPlanIds` (number[]), `studyPlanIdents`, `step1–4Complete`, `canProceedToStep2–canComplete`, `selectionSummary`

---

## `wizard-data.store` (`useWizardDataStore`)

**File:** `src/stores/wizard-data.store.ts`

Holds remote data for the wizard (API responses only). No user selections.

**Persisted:** No.

### State

```typescript
facultyFacets, yearFacets, levelFacets
:
FacetItem[]
studyPlans: StudyPlanWithRelationsDTO[]
studyPlanCourses: CourseWithRelationsDTO[]
loading, studyPlanCoursesLoading
:
boolean
error: string | null
```

### Key Actions

| Action                   | Reads from                                | Fetches                                                               |
|--------------------------|-------------------------------------------|-----------------------------------------------------------------------|
| `loadInitialFacets()`    | —                                         | `POST /study_plans` (semesters: ZS, limit: 0) → faculty + year facets |
| `loadYearFacets()`       | `wizardStore.facultyId`                   | `POST /study_plans` filtered by faculty → yearFacets                  |
| `loadStudyPlans()`       | `wizardStore.{facultyId, year, semester}` | `POST /study_plans` → studyPlans, levelFacets                         |
| `loadStudyPlanCourses()` | `wizardStore.studyPlanIds`                | `POST /study_plans/courses` → studyPlanCourses                        |
| `resetData()`            | —                                         | Clears studyPlans, studyPlanCourses                                   |

---

## `completed-courses.store` (`useCompletedCoursesStore`)

**File:** `src/stores/completed-courses.store.ts`

Manages which courses the student has already completed (step 4 of wizard). Also owns the step 4 UI filter state.

**Persisted:** `completedCourseIdents` only, written to `STORAGE_KEYS.WIZARD` blob (same key as wizard.store).

### State

```typescript
completedCourseIdents: string[]   // persisted
completedCoursesSearch: string    // UI-only
completedCoursesCategoryFilter: InSISStudyPlanCourseCategory[]  // UI-only
levelFilter: string[]             // wizard step 3 plan picker
titleSearch: string               // wizard step 3 plan picker
```

### Key Actions

| Action                                                        | Notes                                               |
|---------------------------------------------------------------|-----------------------------------------------------|
| `toggleCompletedCourse(ident)`                                | Adds/removes from `completedCourseIdents`, persists |
| `markCourseCompleted(ident)` / `unmarkCourseCompleted(ident)` | Non-toggle variants                                 |
| `clearCompletedCourses()`                                     | Called when faculty/year/plan changes               |
| `resetUIFilters()`                                            | Clears search/category filters only (not idents)    |
| `hydrate(idents)`                                             | Called from `wizard.store.hydrate()`                |
| `persist()`                                                   | Saves `completedCourseIdents` to localStorage       |

### Key Computed

`filteredStudyPlanCourses`, `studyPlanCoursesByCategory` (Map), `availableCourseCategories` (priority-sorted),
`isCourseCompleted(ident)`, `courseIdentToCategories` (Map<ident, Set<category>>)

---

## `ui.store` (`useUIStore`)

**File:** `src/stores/ui.store.ts`

**Persisted:** Yes → `STORAGE_KEYS.UI`.

```typescript
viewMode: 'list' | 'timetable'
sidebarCollapsed: boolean
showLegend: boolean
globalLoading: boolean
mobileMenuOpen: boolean
mobileFilterOpen: boolean
```

**Key actions:** `setViewMode(mode)`, `toggleViewMode()`, `switchToListView()`, `switchToTimetableView()`,
`toggleLegend()`, `toggleMobileMenu()`, `toggleMobileFilter()`

---

## `drag.store` (`useDragStore`)

**File:** `src/stores/drag.store.ts`

Timetable drag-to-select state. Used exclusively by `useTimetableDrag` composable and `TimetableGrid.vue`.

```typescript
dragSelection: DragSelection
showDragPopover: boolean
dragPopoverPosition: {
	;(x, y)
}
```

**Key actions:** `startDrag(day, time)`, `updateDrag(day, time)`, `endDrag(x, y)`, `cancelDrag()`,
`isInDragSelection(day, time)`

**Key computed:** `normalizedDragSelection` — `{day, timeFrom, timeTo}` with min/max normalization, or null.

---

## `alerts.store` (`useAlertsStore`)

**File:** `src/stores/alerts.store.ts`

Global notification queue. `api.ts` adds error alerts automatically on HTTP failures.

```typescript
alerts: Alert[]
```

**Key actions:** `addAlert(alert)`, `removeAlert(index)`, `removeLatestAlert()`, `removeAlertById(customId)`

Auto-removal: if `alert.timeout` is set, `addAlert()` calls `setTimeout` and stores the handle in `alert._timeout`.

---

## `announcer.store` (`useAnnouncerStore`)

**File:** `src/stores/announcer.store.ts`

Feeds an ARIA live region (`ScreenReaderAnnouncer.vue`) for accessibility announcements. Used by `courses.store` and
`timetable.store` to announce result counts and add/remove events.

```typescript
announce(message
:
string, politeness ? : 'polite' | 'assertive'
):
void
```

---

## LocalStorage Keys

| Key constant             | Value                       | Contents                                          |
|--------------------------|-----------------------------|---------------------------------------------------|
| `STORAGE_KEYS.TIMETABLE` | `'kreditozrouti:timetable'` | `{ selectedUnits: SelectedCourseUnit[] }`         |
| `STORAGE_KEYS.WIZARD`    | `'kreditozrouti:wizard'`    | `{ facultyId, year, ..., completedCourseIdents }` |
| `STORAGE_KEYS.UI`        | `'kreditozrouti:ui'`        | `{ viewMode, sidebarCollapsed, showLegend }`      |
| `'locale'`               | _(plain key)_               | `'cs'` or `'en'`                                  |

`loadFromStorage()` returns `null` on JSON parse errors and automatically removes the corrupt key.
