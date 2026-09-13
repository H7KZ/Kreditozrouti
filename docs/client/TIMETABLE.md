# Client — Timetable & Conflict System

The timetable is the core interactive feature: a weekly grid where users drag-to-filter by time, select course units,
and see conflicts highlighted in real time.

---

## Data Flow

```
User clicks unit in UnitSelector
  → useCourseUnitSelection.handleAddUnit(unit, slot)
      → removes existing unit of same type (swap)
      → timetableStore.addUnit(course, unit, slot)
          → snapshots snapshotAvailableTypes from course.units
          → pushes SelectedCourseUnit to selectedUnits[]
          → persist() → localStorage
          → syncCoursesStoreExclusion()
              → filtersStore.syncTimetableExcludeTimes(selectedTimesForExclusion)
                  (only if hideConflictingCourses is on)

TimetableGrid re-renders from unitsByDay (computed)
CourseStatus computed re-runs → all status-dependent UI updates
```

---

## Time Encoding

All times are **minutes from midnight** (integers, 0–1439):

| Time  | Minutes |
|-------|---------|
| 07:30 | 450     |
| 09:00 | 540     |
| 10:30 | 630     |
| 20:00 | 1200    |

The timetable grid spans `TIME_CONFIG.START` (450) to `TIME_CONFIG.END` (1200).

Conversions:

```typescript
import { useTimeUtils } from '@client/composables'

const { minutesToTime, timeToMinutes } = useTimeUtils()

minutesToTime(540) // → '09:00'
timeToMinutes('9:15') // → 555
```

---

## `SelectedCourseUnit` Type

Every selected unit is stored as a flat snapshot. This avoids the need to look up the full course later:

```typescript
interface SelectedCourseUnit {
	courseId: number
	courseIdent: string
	courseTitle: string
	courseTitleCs: string
	courseTitleEn: string
	unitId: number
	unitType: CourseUnitType // 'lecture' | 'exercise' | 'seminar'
	slotId: number
	day?: InSISDay // set for recurring slots
	date?: string // set for one-time slots (DD.MM.YYYY)
	timeFrom: number // minutes from midnight
	timeTo: number
	location?: string
	lecturer?: string
	ects?: number
	snapshotAvailableTypes?: CourseUnitType[] // all types the course had at add-time
}
```

`snapshotAvailableTypes` is the key to avoiding circular imports: `timetableStore.courseStatuses` calls
`checkCourseCompleteness(units)` which reads this snapshot — no live lookup into `coursesStore` needed.

---

## Course Status System

Every selected course gets exactly one status. Computed in `timetableStore.courseStatuses`.

### Status Precedence

```
1. 'conflict'         — hard time overlap with another selected unit (red)
2. 'campus-conflict'  — no overlap, but gap between campuses < 40 min (orange)
3. 'incomplete'       — missing a required unit type (e.g., has lecture but no exercise) (amber)
4. 'selected'         — all good (blue)
```

A course gets its highest-severity status across all its units.

### `CourseStatus` Interface

```typescript
interface CourseStatus {
	id: number
	ident: string
	title: string
	titleCs: string
	titleEn: string
	status: 'selected' | 'conflict' | 'campus-conflict' | 'incomplete'
	conflictsWith: string[] // course idents of conflicting courses
	campusConflictsWith: string[]
	missingTypes: CourseUnitType[] // types not yet selected for this course
}
```

---

## Conflict Detection

### Hard Conflicts (`unitsConflict`)

From `@shared/domain/timetable`:

```typescript
unitsConflict(a, b)
:
boolean
// Same day (or date), time ranges overlap:
// a.timeFrom < b.timeTo && b.timeFrom < a.timeTo
```

Day matching: `a.day === b.day`, or if `date` is set, both `date` values must match.

### Campus Conflicts (`unitsCampusConflict`)

```typescript
CAMPUS_TRAVEL_MINUTES = 40

getCampus(location
:
string | null
):
'jizni-mesto' | 'zizkov' | 'unknown'
// Splits location on /[.\-\s]/, uppercases first token:
// JM* → 'jizni-mesto'  (Jižní Město campus)
// RB*|NB*|IB*|SB* → 'zizkov'  (Žižkov campus)
// else → 'unknown'

unitsCampusConflict(a, b)
:
boolean
// Same day, NOT already a hard conflict, different known campuses,
// gap = max(timeFrom_a, timeFrom_b) - min(timeTo_a, timeTo_b)
// conflict if 0 <= gap < 40
```

If either location resolves to `'unknown'`, no campus conflict is raised.

### Completeness Check (`checkCourseCompleteness`)

```typescript
checkCourseCompleteness(units
:
SelectedCourseUnit[]
):
{
	isIncomplete, missingTypes
}
// Reads snapshotAvailableTypes from units[0]
// Compares to selected unit types
// isIncomplete = true only when some types selected AND some required types missing
// (A course with no units is NOT considered incomplete)
```

---

## TimetableGrid

**File:** `src/components/timetable/TimetableGrid.vue`

Renders the weekly grid using `useTimetableGrid` for pixel geometry and `useSlotMerging` for one-time slot collapsing.

### Grid Layout

- **Columns:** Monday–Friday (5 columns), each equal width
- **Rows:** Time slots from 07:30 to 20:00 in 15-min intervals
- **Blocks:** Positioned with CSS `position: absolute`, `top` (px from start of day), `height` (px for duration),
  `left`/`width` (% for overlap handling)

### Overlap Resolution

When two blocks on the same day overlap in time (different courses both at 9:00–10:30), `getOverlapInfo(day)` computes
column assignments. Each overlapping block gets a fractional width (e.g. 50% of column) and an offset `left`.

### Drag-to-Filter

`useTimetableDrag` handles the drag interaction:

1. `mousedown` on grid → `dragStore.startDrag(day, time)`
2. `mousemove` → `dragStore.updateDrag(day, time)` (snaps to 15-min intervals)
3. `mouseup` → `dragStore.endDrag(x, y)` → shows `TimetableDragPopover`
4. User confirms → `handleDragFilter()`:
	- Adds time selection to `filtersStore.include_times`
	- Calls `uiStore.switchToListView()`
	- Calls `coursesStore.fetchCourses()`
5. User cancels → `handleDragCancel()` → `dragStore.cancelDrag()`

`DRAG_THRESHOLD = 20px` prevents accidental drags on click.

---

## Visual Treatment

| Status            | Color                            | Location                                              |
|-------------------|----------------------------------|-------------------------------------------------------|
| `conflict`        | Red ring / red badge             | `TimetableCourseBlock`, `UnitSelector`, `CourseTable` |
| `campus-conflict` | Orange/amber ring / orange badge | Same                                                  |
| `incomplete`      | Amber/yellow                     | Same                                                  |
| `selected`        | Blue                             | Same                                                  |

---

## Hide Conflicting Courses

A toggle in the filter panel that hides courses that would conflict with the current timetable selection.

```
User enables "hide conflicting"
  → coursesStore.toggleHideConflictingCourses()
      → filtersStore.toggleHideConflicting(timetableStore.selectedTimesForExclusion)
          → hideConflictingCourses = true
          → timetableExcludeTimes = [...selectedTimesForExclusion]
      → coursesStore.fetchCourses()
          → sends mergedExcludeTimes (= timetableExcludeTimes) to API
          → API excludes courses where all slots conflict

When user later adds/removes a timetable unit:
  → timetableStore.syncCoursesStoreExclusion()
      → filtersStore.syncTimetableExcludeTimes(selectedTimesForExclusion)
          (updates timetableExcludeTimes without triggering a fetch)
  → courses.vue watch picks up the filter change and calls fetchCourses()
```

`selectedTimesForExclusion` computed deduplicates day-based exclusions (same day+time range = one entry) but keeps
date-based entries separate.

---

## `ScheduleSlotsPanel`

**File:** `src/components/timetable/ScheduleSlotsPanel.vue`

Right-side panel listing all selected course units grouped by course. Shows:

- Course title + ident
- Unit type badge
- Slot day + time + location
- Conflict badges (hard / campus)
- ECTS total
- Remove buttons

Uses `useScheduleSummary` for compact schedule text (e.g. "Po, St").

---

## Constants

```typescript
// src/constants/timetable.ts
TIME_CONFIG.START = 450 // 07:30
TIME_CONFIG.END = 1200 // 20:00
TIME_CONFIG.SLOT_DURATION = 45 // minutes per teaching slot
TIME_CONFIG.BREAK_DURATION = 15 // minutes break between slots

GRID_ROW_HEIGHT = 60 // px per 60-minute block
GRID_BLOCK_PADDING = 2 // px padding at block edges
DRAG_THRESHOLD = 20 // px minimum drag distance
TIME_SNAP_INTERVAL = 15 // minutes for drag snap

WEEKDAYS = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek']
ALL_DAYS = [...WEEKDAYS, 'Sobota', 'Neděle']

// src/utils/timetable.ts (re-exports from @shared/domain/timetable)
CAMPUS_TRAVEL_MINUTES = 40
```
