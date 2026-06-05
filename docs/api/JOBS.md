# API — Response Jobs

The API consumes results from the scraper via `ScraperResponseQueue`. Each incoming job is routed by
`ScraperResponseHandler` based on `job.data.type`, then handled by a dedicated job class.

---

## Job Routing

**File:** `src/Handlers/ScraperResponseHandler.ts`

```typescript
// Simplified routing map:
'InSIS:Course'     → ScraperResponseInSISCourseJob
'InSIS:StudyPlan'  → ScraperResponseInSISStudyPlanJob
'InSIS:Catalog'    → (no - op — catalog
responses
just
discover
URLs;
no
DB
sync
needed
)
'InSIS:StudyPlans' → (no - op — same as above
)
```

---

## ScraperResponseInSISCourseJob

**File:** `src/Jobs/ScraperResponseInSISCourseJob.ts`

Syncs a fully scraped `ScraperInSISCourse` into MySQL and notifies waiting SSE clients via Redis.

### Change Detection

If `course.last_modified_date` matches the existing `updated_at` in the DB, the job exits early with no writes. This
prevents unnecessary DB churn when a catalog run re-scrapes unchanged courses.

### Transaction

All DB writes happen inside a single Kysely transaction:

```
1. upsertFaculty
   INSERT INTO insis_faculties ... ON DUPLICATE KEY UPDATE title, is_schedule_publicly_visible

2. upsert course
   INSERT INTO insis_courses ... ON DUPLICATE KEY UPDATE (all fields)
   Time fields converted: timeToMinutes('9:15') → 555

3. syncAssessmentMethods
   Diff existing vs incoming assessment methods:
   - DELETE removed methods
   - UPDATE changed weights
   - INSERT new methods

4. syncTimetable
   DELETE all existing insis_courses_units WHERE course_id = ?
   INSERT new units row by row
   INSERT new slots for each unit (time_from/time_to → minutes-from-midnight)

5. syncStudyPlansFromCourse
   For each ScraperInSISCourseStudyPlan in course.study_plans:
   - Find matching study plan in DB by ident+semester+year+facultyIdent
   - Upsert insis_study_plans_courses row linking plan ↔ course
```

### Post-Transaction

After the transaction commits:

```typescript
// Notify SSE clients watching this course
redis.publish(`course:updated:${courseId}`, JSON.stringify({
    status: 'done',
    courseId,
    updatedAt: new Date().toISOString()
}))

// Flush cached responses so next request gets fresh data
flushResponseCaches()   // SCAN + DEL cache:* and course:facets:*
```

Cache flushing uses Redis `SCAN` (not `KEYS`) to avoid blocking the Redis event loop on large keyspaces.

### Time Conversion

```typescript
function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
}

// '9:15'  → 555
// '17:45' → 1065
```

---

## ScraperResponseInSISStudyPlanJob

**File:** `src/Jobs/ScraperResponseInSISStudyPlanJob.ts`

Syncs a fully scraped `ScraperInSISStudyPlan` into MySQL.

### Transaction

```
1. upsertFaculty (same as course job)

2. upsert study plan
   INSERT INTO insis_study_plans ... ON DUPLICATE KEY UPDATE (all fields)

3. syncStudyPlanCourses
   DELETE all existing insis_study_plans_courses WHERE study_plan_id = ?
   INSERT new rows for each course in plan.courses:
   - Looks up course_id from DB by ident (nullable if course not yet scraped)
   - Stores course_ident as a cached fallback for future linking
```

The `course_ident` field allows courses to be linked to study plans even when the course record doesn't exist yet —
`ScraperResponseInSISCourseJob.syncStudyPlansFromCourse` handles the reverse link.

### No Cache Flush

Study plan responses don't flush the full response cache because study plan data changes much less frequently and the
write latency would compound across large catalog runs.

---

## BullMQ Worker Configuration

**File:** `src/bullmq.ts`

```typescript
const responseWorker = new Worker(ScraperResponseQueue, handler, {
    concurrency: 4
})
```

Four jobs process in parallel. The handler is wrapped in `withJobLogger` (structured lifecycle logging per job).

**Retry policy:** Response jobs are not retried. If a job fails, the error is logged and the job is marked as failed.
The next scheduled catalog run will re-scrape the affected courses.

**Retention:** Failed jobs are kept for 24 hours (`removeOnFail: { age: 86400 }`), then purged.

---

## Scheduler (Production Only)

**File:** `src/bullmq.ts` → `schedulers()`

The API registers two BullMQ job schedulers on startup. In production only (`Config.isEnvProduction()`).

```typescript
const REGISTRATION_MONTHS_CRON = '1,2,6,7,8,9,11,12'
// Covers: LS window (Nov–Feb) and ZS window (Jun–Sep)
// with 1-week early-start buffer absorbed into month selection

// Catalog scrape: 3 AM during registration months — turbo (no delays, InSIS is quiet at night)
upsertJobScheduler(ScraperInSISCatalogRequestScheduler, {
    pattern: `0 3 * ${REGISTRATION_MONTHS_CRON} *`
}, {
    data: {type: 'InSIS:Catalog', mode: 'turbo', auto_queue_courses: true, periods: [...last 4 years]}
})

// Study plans scrape: 2 AM during registration months — turbo
upsertJobScheduler(ScraperInSISStudyPlansRequestScheduler, {
    pattern: `0 2 * ${REGISTRATION_MONTHS_CRON} *`
}, {
    data: {type: 'InSIS:StudyPlans', mode: 'turbo', auto_queue_study_plans: true, periods: [...last 4 years]}
})
```

On startup the API also removes the legacy `SupervisorScheduler` entry from Redis if it exists.

**In development:** schedulers are disabled. Use the `/commands/insis/*` endpoints with a Bearer token to trigger
scrapes manually. See [Scripts](../SCRIPTS.md) for pre-built curl helpers and Makefile targets.

**Scraping modes:** scheduled jobs always use `turbo`. Manual triggers default to `polite`. Pass `"mode": "normal"` or
`"mode": "turbo"` in the request body to override. See [Scraper JOBS.md](../scraper/JOBS.md#scraping-modes) for the
full mode reference.
