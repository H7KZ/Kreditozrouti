# Shared — Queue Contracts

Types and constants shared between the API (producer) and scraper (consumer) for the BullMQ job system. Stored in
`shared/queue/`.

---

## `shared/queue/names.ts`

Queue name constants used by both sides to ensure they reference the same Redis keys.

```typescript
// API → Scraper (request jobs)
ScraperRequestQueue = 'ScraperRequestQueue'

// Scraper → API (response jobs)
ScraperResponseQueue = 'ScraperResponseQueue'

// BullMQ scheduler names (API side, production only)
ScraperInSISCatalogRequestScheduler = 'ScraperInSISCatalogRequestScheduler'
ScraperInSISStudyPlansRequestScheduler = 'ScraperInSISStudyPlansRequestScheduler'
```

Both the API and scraper import these constants — never hardcode the string literals.

---

## `shared/queue/jobs.ts`

Job payload types for messages that flow through `ScraperRequestQueue` and `ScraperResponseQueue`.

Full reference: [docs/scraper/TYPES.md — Job payload types](../scraper/TYPES.md#job-payload-types-sharedqueuejobsts)

### Request jobs (API → Scraper)

```typescript
interface ScraperRequestJob {
    type: ScraperJob   // 'InSIS:Catalog' | 'InSIS:Course' | 'InSIS:StudyPlans' | 'InSIS:StudyPlan'
    // ...type-specific payload fields
}
```

Each `type` variant carries a different payload:

| `type`             | Key payload fields                            |
|--------------------|-----------------------------------------------|
| `InSIS:Catalog`    | `semester`, `year`, `auto_queue_courses`      |
| `InSIS:Course`     | `url`, `course_ident`, `semester`, `year`     |
| `InSIS:StudyPlans` | `semester`, `year`                            |
| `InSIS:StudyPlan`  | `url`, `study_plan_ident`, `semester`, `year` |

### Response jobs (Scraper → API)

```typescript
interface ScraperResponseJob {
    type: ScraperJob
    // ...type-specific result fields
}
```

Response payloads carry the scraped data that the API persists to MySQL. The API's `ScraperResponseHandler` routes each
job by `type` to the appropriate handler.

---

## `shared/queue/insis.ts`

Scraped data shapes — the structured objects the scraper extracts from InSIS HTML and sends back to the API.

Full reference: [docs/scraper/TYPES.md — Scraped data types](../scraper/TYPES.md#scraped-data-types-sharedqueueinsists)

```typescript
interface ScraperInSISCourse {
    ident: string
    title_cs: string | null
    title_en: string | null
    annotation_cs: string | null
    annotation_en: string | null
    ects: number | null
    semester: InSISSemester
    year: number
    language: string | null
    mode_of_completion: string | null
    mode_of_delivery: string | null
    capacity: number | null
    faculty_ident: string | null
    lecturer: string | null
    guarantor: string | null
    units: ScraperInSISCourseUnit[]
    assessments: ScraperInSISCourseAssessment[]
}

interface ScraperInSISCourseUnit {
    type: string | null    // raw string, normalised to CourseUnitType by API
    capacity: number | null
    note: string | null
    lecturer: string | null
    slots: ScraperInSISCourseUnitSlot[]
}

interface ScraperInSISCourseUnitSlot {
    day: string | null     // raw InSIS day string
    date: string | null    // DD.MM.YYYY for one-time slots
    time_from: string | null  // 'HH:MM'
    time_to: string | null    // 'HH:MM'
    location: string | null
    type: string | null
}

interface ScraperInSISStudyPlan {
    ident: string
    title: string | null
    faculty_ident: string | null
    semester: InSISSemester
    year: number
    courses: ScraperInSISStudyPlanCourse[]
}

interface ScraperInSISStudyPlanCourse {
    course_ident: string
    group: string | null    // raw group string, normalised by API
    category: string | null // raw category string, normalised by API
}
```
