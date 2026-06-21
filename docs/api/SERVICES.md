# API — Services

Business logic lives in `api/src/Services/`. Controllers are thin: they validate input, call a service, and return.

---

## CourseService

**File:** `src/Services/CourseService.ts` (thin facade — ~20 lines)

`CourseService` is a public delegation facade. All implementation lives in focused sub-modules under
`src/Services/Course/`:

| Sub-module            | Responsibility                                                 |
|-----------------------|----------------------------------------------------------------|
| `CourseFilterBuilder` | `buildFilterQuery`, `applyAllFilters`, join-requirement checks |
| `CourseCacheService`  | `buildFacetCacheKey`, Redis facet cache read/write             |
| `CourseQueryService`  | Pagination, relation loading, `getCoursesByStudyPlan`          |
| `CourseFacetService`  | All `get*Facet` methods, `computeAllFacets`                    |

All existing consumers import from `@api/Services/CourseService` without change.

The combined logic handles paginated course queries, facet calculation, time-conflict filtering, and full-text
search — all while avoiding N+1 queries.

### Study Plan Filter Guard

When `study_plan_ids` is active, `CourseFilterBuilder.applyAllFilters` skips the `years` and `semesters`
WHERE clauses. The `course_id` join already scopes results to exactly the plan's courses; applying a
year/semester filter on `insis_courses` would incorrectly exclude linked courses scraped in a prior year.

### N+1 Avoidance Pattern

Every paginated response follows the same four-step approach:

```
1. COUNT query with all active filters → total
2. Paginated ID query (same filters) → [id1, id2, ...]   (max page_size IDs)
3. Five parallel relation queries (all filtered to the ID list):
   - courses + faculties (join)
   - units + slots       (via jsonArrayFrom subquery)
   - assessments         (via jsonArrayFrom subquery)
   - study_plan_courses  (via jsonArrayFrom subquery)
4. In-memory merge by course ID using Maps
```

The paginated ID query uses `ORDER BY FIELD(id, ...)` when restoring result order after fetching relations.

### `buildFilterQuery`

The core of all course filtering. Conditionally applies joins only when needed:

| Filter                                                            | Join required                                       |
|-------------------------------------------------------------------|-----------------------------------------------------|
| `lecturers`                                                       | `insis_courses_units`                               |
| `exclude_times`, time-slot filters                                | `insis_courses_units` + `insis_courses_units_slots` |
| `study_plan_idents`, `study_plan_groups`, `study_plan_categories` | `insis_study_plans_courses` + `insis_study_plans`   |

Skipping unnecessary joins is intentional — it keeps queries fast for the common case (title search + categorical
filters only).

### Cross-Filtering Facets

Facets show the count of courses matching **all other active filters** but not the facet's own filter. This is what
makes selecting "FIS" narrow the `levels` facet to only levels available within FIS.

Implementation: each facet runs a separate query that applies every other active filter dimension and counts `DISTINCT`
values for its own dimension.

**Fast path** (no joins needed): facets that only use `insis_courses` columns (`faculty_ids`, `semesters`, `years`,
`modes_of_delivery`, `modes_of_completion`, `levels`, `years_of_study`, `ects`).

**Slow path** (joins required): `lecturers` (needs units join + pipe-splitting), `languages` (needs pipe-splitting),
`assessment_methods` (needs assessments join via `ca1` alias).

**Pipe-delimited fields:** `languages` and `lecturers` are stored as `|`-delimited strings. `splitPipeDelimitedFacet`
extracts individual values and deduplicates them across rows.

**Facet caching:** facet results are cached in Redis under `course:facets:{base64(filterJson)}` with a 300s TTL. This is
separate from the full response cache.

### `exclude_times` Filter

The most complex filter. It excludes courses where **every** available time slot conflicts with any of the provided time
exclusions.

SQL logic: a course is excluded if it has units AND all its units' slots conflict. In other words: a course is kept if:

- It has **no units**, OR
- At least one slot in its units does **not** conflict with any exclusion

Conflict detection via `buildSlotConflictConditions` (see [INTERNALS.md](INTERNALS.md)):

- Day-based: same weekday + overlapping time range
- Date-based: same exact date + overlapping time range
- Weekday-of-date: recurring slots whose day matches the excluded date's day-of-week

### Full-Text Search (`title` filter)

Uses MySQL `MATCH ... AGAINST` in boolean mode:

```sql
MATCH (title, title_cs, title_en, ident) AGAINST ('+java* +prog*' IN BOOLEAN MODE)
```

Each word in the input is prefixed with `+` (required) and suffixed with `*` (prefix match). The query is sanitized to
remove MySQL boolean operators before transformation.

---

## StudyPlanService

**File:** `src/Services/StudyPlanService.ts` (thin facade — ~30 lines)

`StudyPlanService` is a public delegation facade. All implementation lives in focused sub-modules under
`src/Services/StudyPlan/`:

| Sub-module               | Responsibility                                                       |
|--------------------------|----------------------------------------------------------------------|
| `StudyPlanFilterBuilder` | `buildFilterQuery`, `needsCoursesJoin`, `applyFilters`               |
| `StudyPlanCacheService`  | `buildFacetCacheKey`, Redis facet cache read/write                   |
| `StudyPlanQueryService`  | Pagination, relation loading (`getStudyPlansWithRelations`)          |
| `StudyPlanFacetService`  | `getStudyPlanFacets`, `computeAllFacetsInParallel`, `getSimpleFacet` |

All existing consumers import from `@api/Services/StudyPlanService` without change.

The combined logic uses the same N+1 avoidance pattern as CourseService:

```
1. COUNT with filters
2. Paginated ID query
3. Parallel: study_plans + faculties, study_plan_courses (with course links)
4. In-memory merge
```

Facets cover: `faculty_ids`, `levels`, `semesters`, `years`, `modes_of_study`, `study_lengths`.

All public methods in `StudyPlan/*` and `Course/*` sub-modules are documented with JSDoc (`@param`/`@returns`).

---

## ScraperService

**File:** `src/Services/ScraperService.ts`

All BullMQ enqueue logic in one place. Controllers and schedulers call these methods; no other code touches the queue
directly.

```typescript
ScraperService.enqueueCatalogScrape(options ?)
// Enqueues InSIS:Catalog with dedup key 'InSIS:Catalog:ManualRun' (30s TTL)

ScraperService.enqueueCourseScrape(url)
// Enqueues InSIS:Course → returns jobId

ScraperService.enqueueStudyPlansScrape(options ?)
// Enqueues InSIS:StudyPlans with dedup key 'InSIS:StudyPlans:ManualRun' (30s TTL)

ScraperService.enqueueStudyPlanScrape(url)
// Enqueues InSIS:StudyPlan → returns jobId

ScraperService.enqueueCourseScrapeById(id)
// Looks up course URL from DB, then calls enqueueCourseScrape(url)
// Throws Errors.notFound() if course doesn't exist
```

**Dedup windows:**

| Job                 | Dedup key                    | TTL            |
|---------------------|------------------------------|----------------|
| Catalog (manual)    | `InSIS:Catalog:ManualRun`    | 30 seconds     |
| StudyPlans (manual) | `InSIS:StudyPlans:ManualRun` | 30 seconds     |
| Single course       | `InSIS:Course:{courseId}`    | until consumed |
| Single study plan   | `InSIS:StudyPlan:{planId}`   | until consumed |

---

## InSISService

**File:** `src/Services/InSISService.ts`

Re-exports `getUpcomingPeriod` and `getPeriodsForLastYears` from `@shared/domain/period` under a class-shaped namespace
for backward compatibility with existing callers.

These are used by the BullMQ scheduler to compute which academic periods to pass to catalog and study-plan scrape jobs.

---

## SQLService

**File:** `src/Services/SQLService.ts`

```typescript
SQLService.migrateToLatest()
// Runs all pending Kysely migrations from Database/migrations/
// Called on every worker startup

SQLService.seedInitialData()
// Runs optional seed scripts from Database/seeds/
// Called after migrations on every worker startup
```

---

## DateService

**File:** `src/Services/DateService.ts`

```typescript
DateService.getDayFromDate(date
:
Date | string
):
InSISDay | null
```

Converts a JavaScript `Date` (or ISO date string) to the Czech day-of-week string used in
`insis_courses_units_slots.day` (e.g., `'Pondělí'`). Returns `null` for weekends if they have no InSIS representation.

Used by `buildSlotConflictConditions` to find recurring weekly slots that fall on a one-time exclusion date.

---

## EmailService

**File:** `src/Services/EmailService.ts`

Wraps Nodemailer. Email sending is optional — only enabled when `GOOGLE_USER` and `GOOGLE_APP_PASSWORD` are set (
`Config.isEmailEnabled()`).
