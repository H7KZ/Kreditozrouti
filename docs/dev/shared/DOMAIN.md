# Shared — Domain Logic

Pure TypeScript domain utilities. No runtime service dependencies — safe to import from `api/`, `client/`, and
`scraper/`.

---

## `shared/domain/insis.ts`

InSIS-specific enums and utilities used across all three packages.

```typescript
// Day names (Czech, as they appear verbatim in InSIS)
const InSISDayValues = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'] as const
type InSISDay = (typeof InSISDayValues)[number]

// Semester codes
const InSISSemesterValues = ['LS', 'ZS'] as const
type InSISSemester = 'LS' | 'ZS'
// ZS = zimní semestr (Sep–Feb), LS = letní semestr (Mar–Aug)

// Study plan course category
type InSISStudyPlanCourseCategory =
	| 'compulsory'
	| 'elective'
	| 'language'
	| 'state_exam'
	| 'prohibited'
	| 'beyond_scope'
	| 'exchange_program'
	| 'physical_education'

// Study plan course group
type InSISStudyPlanCourseGroup = 'faculty_specific' | 'university_wide' | 'field_specific_bachelor' | 'field_specific_master' | 'minor_specialization'

// BullMQ job type discriminant
type ScraperJob = 'InSIS:Catalog' | 'InSIS:Course' | 'InSIS:StudyPlans' | 'InSIS:StudyPlan'

// Unit type (normalised)
type CourseUnitType = 'lecture' | 'exercise' | 'seminar'
```

### `getSlotType(slot)`

Normalises a raw InSIS slot type string (which may be Czech or English) to a `CourseUnitType`. Checks for
`přednáška/lecture`, `cvičení/exercise`, `seminář/seminar`; defaults to `'lecture'`.

```typescript
getSlotType({ type: 'Přednáška' }) // → 'lecture'
getSlotType({ type: 'Exercise' }) // → 'exercise'
getSlotType({ type: null }) // → 'lecture'
```

---

## `shared/domain/timetable.ts`

Conflict detection and course completeness logic. Used by `timetable.store.ts` (client) and
`api/src/utils/timeConflict.ts` (API).

### `ScheduledUnit` interface

Minimal shape required by conflict functions — both `SelectedCourseUnit` (client) and `CourseUnitSlotDTO` satisfy it:

```typescript
interface ScheduledUnit {
	day?: InSISDay
	date?: string // DD.MM.YYYY for one-time slots
	timeFrom: number // minutes from midnight
	timeTo: number
	location?: string
}
```

### `unitsConflict(a, b)`

Returns `true` when two units occupy the same day and their time ranges overlap (
`a.timeFrom < b.timeTo && b.timeFrom < a.timeTo`). If both have `date`, they must match exactly.

### Campus Detection

```typescript
const CAMPUS_TRAVEL_MINUTES = 40

type Campus = 'jizni-mesto' | 'zizkov' | 'unknown'

getCampus(location
:
string | null
):
Campus
// Splits location on /[.\-\s]/, uppercases first token:
// JM*               → 'jizni-mesto'
// RB*|NB*|IB*|SB*   → 'zizkov'
// anything else     → 'unknown'
```

### `unitsCampusConflict(a, b)`

Returns `true` when two units are on different known campuses and the gap between them is `< 40` minutes.
Pre-conditions: same day, NOT a hard overlap, both campuses known.

```
gap = max(a.timeFrom, b.timeFrom) - min(a.timeTo, b.timeTo)
conflict if 0 <= gap < 40
```

### `checkCourseCompleteness(units)`

```typescript
checkCourseCompleteness(units
:
ScheduledCourseUnit[]
):
{
	isIncomplete: boolean
	missingTypes: CourseUnitType[]
}
```

Reads `units[0].snapshotAvailableTypes` (set at add-time). Compares to the `unitType` values of all units. Returns
`isIncomplete = true` only when at least one type is selected AND at least one required type is missing (a course with
zero units is NOT incomplete).

### `compareTimeSelections(a, b)`

Sort comparator for `TimeSelection[]`. Sorts by day index, then `time_from`, then `time_to`. Used to produce
deterministic cache keys.

---

## `shared/domain/period.ts`

Academic period calculation. Pure functions, no side effects.

```typescript
getUpcomingPeriod(date ? : Date)
:
{
	semester: InSISSemester;
	year: number
}
```

Determines which registration period is next:

| Month   | Returns                                        |
|---------|------------------------------------------------|
| Jun–Nov | `ZS`, current year                             |
| Dec     | `LS`, current year (next LS starts in Jan/Feb) |
| Jan–May | `LS`, previous year                            |

```typescript
getPeriodsForLastYears(yearsBack = 4, date ? : Date)
:
{
	semester, year
}
[]
```

Returns an array of `yearsBack × 2` periods starting from the upcoming period and going backwards. Used by the API
scheduler to determine which periods to pass to catalog scrape jobs.

---

## `shared/domain/time.ts`

```typescript
interface TimeSelection {
	slot_id?: number      // optional — exclude this slot from self-conflict detection
	day?: InSISDay | null
	date?: Date | null    // for one-time exclusions
	time_from: number     // minutes from midnight
	time_to: number       // minutes from midnight
}

timeToMinutes(time
:
string | null
):
number | null
// '9:15' → 555, null/'invalid' → null

minutesToTime(minutes
:
number | null
):
string
// 555 → '09:15', null/undefined → '--:--'
```

---

## `shared/domain/day.ts`

Shared implementation of `getDayFromDate` used by both the client (`utils/day.ts` re-exports it) and
`@shared/domain/timetable.ts` internally.

```typescript
getDayFromDate(dateStr
:
string | null | undefined
):
InSISDay | null
// Parses 'DD.MM.YYYY' → JS Date → day-of-week → InSISDay
```
