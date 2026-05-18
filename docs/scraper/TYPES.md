# Scraper — Type Reference

All scraper types are defined in the `shared/` package and re-exported from `scraper/src/types/`. This ensures the API and the scraper share identical definitions without circular imports.

## Import Paths

```typescript
// Within scraper — use the re-export barrel
import type { ScraperInSISCourse } from '@scraper/types/insis'
import type { ScraperInSISCourseRequestJob } from '@scraper/types/jobs'

// The actual definitions live in:
//   shared/queue/insis.ts      → scraped data shapes
//   shared/queue/jobs.ts       → job payload shapes
//   shared/domain/insis.ts     → domain enums and literals
```

---

## Domain Types (`shared/domain/insis.ts`)

### `InSISDay`

```typescript
type InSISDay = 'Pondělí' | 'Úterý' | 'Středa' | 'Čtvrtek' | 'Pátek' | 'Sobota' | 'Neděle'
```

Czech day names as they appear verbatim in InSIS timetable cells.

### `InSISSemester`

```typescript
type InSISSemester = 'ZS' | 'LS'
// ZS = zimní semestr (winter/fall semester, Sep–Feb)
// LS = letní semestr (summer/spring semester, Mar–Aug)
```

### `InSISStudyPlanCourseGroup`

```typescript
type InSISStudyPlanCourseGroup =
  | 'faculty_specific'       // f* codes — applies within a single faculty
  | 'university_wide'        // c* codes — shared across all faculties
  | 'field_specific_bachelor' // o* codes — specific to a bachelor's field
  | 'field_specific_master'  // h* and e* codes — specific to a master's field
  | 'minor_specialization'   // s* codes — minor/secondary specializations
```

### `InSISStudyPlanCourseCategory`

```typescript
type InSISStudyPlanCourseCategory =
  | 'compulsory'         // *P  — must complete
  | 'elective'           // *V* — choose from a list
  | 'language'           // *J* — language requirement
  | 'state_exam'         // *SZ* — state exam component
  | 'prohibited'         // *EXC — cannot enroll
  | 'beyond_scope'       // *VOR — outside study plan scope
  | 'exchange_program'   // *ZEXCN* — for exchange students only
  | 'physical_education' // *TVS* — sports/PE requirement
```

### `ScraperJob`

```typescript
type ScraperJob = 'InSIS:Catalog' | 'InSIS:Course' | 'InSIS:StudyPlans' | 'InSIS:StudyPlan' | 'InSIS:Supervisor'
```

String discriminant used in both request and response job payloads.

### `CourseUnitType`

```typescript
type CourseUnitType = 'lecture' | 'exercise' | 'seminar'
```

Normalized slot type. The helper `getSlotType(slot)` converts raw InSIS Czech/English strings to this type.

---

## Scraped Data Types (`shared/queue/insis.ts`)

### `ScraperInSISFaculty`

```typescript
interface ScraperInSISFaculty {
  ident: string | null    // e.g. "FIS", "NF", "CTVS"
  title: string | null    // e.g. "Fakulta informatiky a statistiky"
  is_schedule_publicly_visible: boolean
  // false for CTVS≥2017, OZS≥2020, IOM≥2021, CESP≥2022
  // always false when extracted from study plan pages
}
```

### `ScraperInSISCourse`

The primary output of a course scrape job. All nullable fields reflect genuine optionality in InSIS — not all courses fill every syllabus field.

```typescript
interface ScraperInSISCourse {
  // Identity
  id: number               // Resolved from form input or URL param
  url: string              // Full syllabus URL
  url_id: number | null    // Numeric ID from URL (may differ from form id in rare cases)

  // Basic metadata
  ident: string | null     // Course code, e.g. "4IT101"
  title: string | null     // Title in language of instruction
  title_cs: string | null  // Czech title
  title_en: string | null  // English title
  ects: number | null      // Credit value

  // Classification
  faculty: ScraperInSISFaculty | null
  mode_of_delivery: string | null   // e.g. "prezenční", "kombinovaná"
  mode_of_completion: string | null // e.g. "zkouška", "klasifikovaný zápočet"
  languages: string[] | null        // e.g. ["čeština"], ["angličtina", "čeština"]
  level: string | null              // e.g. "bakalářský", "magisterský", "MBA"
  year_of_study: number | null      // Recommended year (1–5)
  semester: InSISSemester | null
  year: number | null               // Starting year of academic year, e.g. 2024 for 2024/2025

  // People
  lecturers: string[] | null
  guarantors: string[] | null

  // Syllabus content (all stored as Markdown strings)
  prerequisites: string | null
  recommended_programmes: string | null
  required_work_experience: string | null
  aims_of_the_course: string | null
  learning_outcomes: string | null
  course_contents: string | null
  special_requirements: string | null
  literature_required: string | null
  literature_recommended: string | null

  // Structured data
  assessment_methods: ScraperInSISCourseAssessmentMethod[] | null
  timetable: ScraperInSISCourseTimetableUnit[] | null  // [] if not publicly visible
  study_plans: ScraperInSISCourseStudyPlan[] | null
  study_load: ScraperInSISCourseStudyLoad[] | null

  // Audit
  last_modified_date: string | null  // ISO date, e.g. "2024-09-15"
  last_modified_by: string | null    // Person name
}
```

### `ScraperInSISCourseAssessmentMethod`

```typescript
interface ScraperInSISCourseAssessmentMethod {
  method: string | null   // e.g. "Zkouška písemná", "Průběžný test"
  weight: number | null   // Percentage weight (0–100)
}
```

### `ScraperInSISCourseTimetableUnit`

A timetable unit represents one row in InSIS's "Periodické rozvrhové akce" table — typically a lecture or seminar group led by one lecturer, possibly occurring in multiple time slots.

```typescript
interface ScraperInSISCourseTimetableUnit {
  lecturer: string | null
  capacity: number | null  // Maximum enrollment for this unit
  note: string | null
  slots: ScraperInSISCourseTimetableSlot[] | null
}
```

### `ScraperInSISCourseTimetableSlot`

A single time occurrence within a timetable unit. One unit can have multiple slots when InSIS uses `<br>` to list multiple days/times in the same row.

```typescript
interface ScraperInSISCourseTimetableSlot {
  type: string | null          // Raw InSIS type string, e.g. "Přednáška", "Cvičení"
  frequency: 'weekly' | 'single' | null
  date: string | null          // Set only for single/irregular occurrences, e.g. "15.10.2024"
  day: InSISDay | null         // Set only for recurring slots
  time_from: string | null     // Raw time string, e.g. "9:15"
  time_to: string | null       // Raw time string, e.g. "10:45"
  location: string | null      // Room/building, e.g. "NB 169"
}
```

> **Note:** `time_from`/`time_to` are stored as raw strings by the scraper. The API layer converts them to minutes-from-midnight integers when persisting to MySQL.

### `ScraperInSISCourseStudyPlan`

Cross-reference: which study plans include this course, in which semester.

```typescript
interface ScraperInSISCourseStudyPlan {
  ident: string | null             // Plan code, e.g. "B-AIN1"
  facultyIdent: string | null      // e.g. "FIS"
  semester: InSISSemester | null
  year: number | null
  mode_of_study: string | null     // e.g. "prezenční"
  group: InSISStudyPlanCourseGroup
  category: InSISStudyPlanCourseCategory
}
```

### `ScraperInSISCourseStudyLoad`

```typescript
interface ScraperInSISCourseStudyLoad {
  activity: string   // e.g. "Příprava na přednášky"
  hours: number
}
```

### `ScraperInSISStudyPlan`

```typescript
interface ScraperInSISStudyPlan {
  id: number            // Numeric ID from URL (?stud_plan=...). -1 if not found.
  url: string
  ident: string | null  // Plan code, e.g. "B-AIN1"
  title: string | null  // Plan full title
  faculty: ScraperInSISFaculty | null
  semester: InSISSemester | null
  year: number | null
  level: string | null         // e.g. "bakalářský"
  mode_of_study: string | null // e.g. "prezenční"
  study_length: string | null  // e.g. "3 roky"
  courses: ScraperInSISStudyPlanCourse[] | null
}
```

### `ScraperInSISStudyPlanCourse`

```typescript
interface ScraperInSISStudyPlanCourse {
  id: number | null      // Numeric course ID from href, if present
  url: string | null     // Absolute course URL
  ident: string          // Course code, e.g. "4IT101"
  group: InSISStudyPlanCourseGroup
  category: InSISStudyPlanCourseCategory
}
```

### `ScraperInSISStudyPlans`

Minimal envelope for the list of discovered study plan URLs.

```typescript
interface ScraperInSISStudyPlans {
  urls: string[]
}
```

---

## Job Payload Types (`shared/queue/jobs.ts`)

### Request Jobs (API → Scraper)

```typescript
// Shared base
interface ScraperRequestJobBase {
  type: ScraperJob
  error?: { message: string }
}

interface ScraperInSISCatalogRequestJob extends ScraperRequestJobBase {
  type: 'InSIS:Catalog'
  faculties?: string[]
  periods?: { semester: InSISSemester | null; year: number }[]
  auto_queue_courses?: boolean
}

interface ScraperInSISCourseRequestJob extends ScraperRequestJobBase {
  type: 'InSIS:Course'
  url: string
}

interface ScraperInSISStudyPlansRequestJob extends ScraperRequestJobBase {
  type: 'InSIS:StudyPlans'
  faculties?: string[]
  periods?: { semester: InSISSemester | null; year: number }[]
  auto_queue_study_plans?: boolean
}

interface ScraperInSISStudyPlanRequestJob extends ScraperRequestJobBase {
  type: 'InSIS:StudyPlan'
  url: string
}

interface ScraperInSISSupervisorRequestJob extends ScraperRequestJobBase {
  type: 'InSIS:Supervisor'
  // No additional fields — supervisor derives all parameters at runtime
}

type ScraperRequestJob =
  | ScraperInSISCatalogRequestJob
  | ScraperInSISCourseRequestJob
  | ScraperInSISStudyPlansRequestJob
  | ScraperInSISStudyPlanRequestJob
  | ScraperInSISSupervisorRequestJob
```

### Response Jobs (Scraper → API)

```typescript
interface ScraperInSISCatalogResponseJob {
  type: 'InSIS:Catalog'
  catalog: ScraperInSISCatalog  // { urls: string[] }
}

interface ScraperInSISCourseResponseJob {
  type: 'InSIS:Course'
  course: ScraperInSISCourse | null
}

interface ScraperInSISStudyPlansResponseJob {
  type: 'InSIS:StudyPlans'
  plans: ScraperInSISStudyPlans  // { urls: string[] }
}

interface ScraperInSISStudyPlanResponseJob {
  type: 'InSIS:StudyPlan'
  plan: ScraperInSISStudyPlan | null
}

type ScraperResponseJob =
  | ScraperInSISCatalogResponseJob
  | ScraperInSISCourseResponseJob
  | ScraperInSISStudyPlansResponseJob
  | ScraperInSISStudyPlanResponseJob
```

Note: `InSIS:Supervisor` is **not** in `ScraperResponseJob` — the supervisor job produces no direct response; it only enqueues further work.

---

## Group Code Reference

Group codes are two-character (or longer) codes in InSIS that describe how a course fits into a study plan. See `scraper/src/Utils/InSISUtils.ts` for the full parsing logic.

| First char | Group |
|---|---|
| `f` | `faculty_specific` |
| `c` | `university_wide` |
| `o` | `field_specific_bachelor` |
| `h` | `field_specific_master` |
| `s` | `minor_specialization` |
| `e` | `field_specific_master` (extended/doctoral fallback) |

| Suffix pattern | Category |
|---|---|
| includes `TVS` | `physical_education` |
| includes `SZ` | `state_exam` |
| includes `ZEXCN` | `exchange_program` (checked before `EXC`) |
| includes `EXC` | `prohibited` |
| includes `VOR` | `beyond_scope` |
| starts with `J` or equals `JV` | `language` |
| equals `P` or `BP` | `compulsory` |
| matches `V\d?$` or `VB`/`VM`/`VOL` | `elective` |
| default | `elective` |
