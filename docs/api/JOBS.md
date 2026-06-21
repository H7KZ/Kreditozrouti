# API — Response Jobs

The API consumes results from the scraper via `ScraperResponseQueue`. Each incoming job is routed by
`ScraperResponseHandler` based on `job.data.type`, then handled by a dedicated job class.

---

## Job Routing

**File:** `src/Handlers/ScraperResponseHandler.ts`

```typescript
// Simplified routing map:
'InSIS:Course'              → ScraperResponseInSISCourseJob
'InSIS:StudyPlan'           → ScraperResponseInSISStudyPlanJob
'InSIS:AcademicSchedule'    → ScraperResponseInSISAcademicScheduleJob
'InSIS:FacultyTimetable'    → ScraperResponseInSISFacultyTimetableJob
'InSIS:Catalog'             → (no-op — catalog responses just discover URLs; no DB sync needed)
'InSIS:StudyPlans'          → (no-op — same as above)
'InSIS:AcademicSchedules'   → (no-op — discovery metadata only; per-period jobs handle the sync)
'InSIS:FacultyTimetables'   → (no-op — discovery metadata only; logs faculties_count)
```

---

## ScraperResponseInSISCourseJob

**File:** `src/Jobs/ScraperResponseInSISCourseJob.ts`

Syncs a fully scraped `ScraperInSISCourse` into MySQL and notifies waiting SSE clients via Redis.
When the scraper signals that a course no longer exists (`course: null, course_id: <id>`), the job
deletes the ghost course and all its child rows instead of upserting.

### Not-Found / Ghost Course Deletion

When `data.course === null` and `data.course_id` is present, the job calls `deleteCourse(courseId)`:

```
1. SELECT id from insis_courses WHERE id = courseId — no-op if not found
2. Transaction:
   a. SELECT unit ids from insis_courses_units WHERE course_id = ?
   b. DELETE insis_courses_units_slots WHERE unit_id IN (...)
   c. DELETE insis_courses_units WHERE id IN (...)
   d. DELETE insis_courses_assessments WHERE course_id = ?
   e. DELETE insis_study_plans_courses WHERE course_id = ?
   f. DELETE insis_courses WHERE id = ?
3. redis.publish('course:updated:{id}', { status: 'deleted', ... })
4. flushResponseCaches()
```

### Change Detection

If `course.last_modified_date` matches the existing `updated_at` in the DB, the job exits early with no writes. This
prevents unnecessary DB churn when a catalog run re-scrapes unchanged courses.

### Faculty upsert (outside the transaction, read-first)

`upsertFaculty` and the study-plan faculty-ident pre-creation loop run **before** the
transaction below and outside it — faculty rows are shared across hundreds of concurrent
course jobs (5 scraper replicas), and an unconditional `INSERT ... ON DUPLICATE KEY UPDATE`
acquires an exclusive lock on every call, which is a classic MySQL deadlock generator
("Deadlock found when trying to get lock; try restarting transaction") under concurrency.

Both now **SELECT first** and only write when the data actually differs (or the row is
missing): faculty title/visibility changes are extremely rare, so this turns the vast
majority of calls into lock-free reads and removes the contention entirely.

### Transaction

All remaining DB writes happen inside a single Kysely transaction:

```
1. upsert course
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
redis.publish(
	`course:updated:${courseId}`,
	JSON.stringify({
		status: 'done',
		courseId,
		updatedAt: new Date().toISOString()
	})
)

// Flush cached responses so next request gets fresh data
flushResponseCaches() // SCAN + DEL cache:* and course:facets:*
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
   ON DUPLICATE KEY UPDATE course_id = VALUES(course_id)
   — updates the course_id pointer when the same (study_plan_id, ident, group, category)
     row is re-inserted after the course has been re-scraped for a new year/semester.
```

The `course_ident` field allows courses to be linked to study plans even when the course record doesn't exist yet —
`ScraperResponseInSISCourseJob.syncStudyPlansFromCourse` handles the reverse link.

The `ON DUPLICATE KEY UPDATE course_id` ensures that when a course is re-scraped for a new year, the link
always points to the most recently scraped `insis_courses` row rather than accumulating stale ZS-YYYY pointers.

### No Cache Flush

Study plan responses don't flush the full response cache because study plan data changes much less frequently and the
write latency would compound across large catalog runs.

---

## ScraperResponseInSISAcademicScheduleJob

**File:** `src/Jobs/ScraperResponseInSISAcademicScheduleJob.ts`

Syncs a scraped academic period and its events into MySQL.

### Faculty Upsert (read-first)

Checks if the faculty row (by `faculty_ident`) exists. If not, inserts a stub
(`title: null, is_schedule_publicly_visible: false`) to satisfy the FK constraint.
The faculty title is populated when the catalog scrape runs.

### Period Upsert

```
INSERT INTO insis_academic_periods ... ON DUPLICATE KEY UPDATE
Unique key: insis_period_id
Updates: faculty_id, semester, year, level, starts_at, ends_at, last_scraped_at
```

No `label` column — period is identified by semester, year, and level.

### Event Reconciliation

Events have no stable natural key, so they are reconciled via delete+recreate:

```
DELETE FROM insis_academic_schedule_events WHERE period_id = ?
INSERT new events for the period
```

Each event row: `period_id`, `title`, `starts_at` (datetime | null), `ends_at` (datetime | null).

---

## ScraperResponseInSISFacultyTimetablesJob

**File:** `src/Jobs/ScraperResponseInSISFacultyTimetablesJob.ts`

Discovery response for the faculty timetables pipeline. No DB writes — logs `faculties_count` from the response
payload so operators can confirm that discovery completed and how many faculties were queued.

---

## ScraperResponseInSISFacultyTimetableJob

**File:** `src/Jobs/ScraperResponseInSISFacultyTimetableJob.ts`

Updates the `is_schedule_publicly_visible` flag for a single faculty.

### Flow

```
1. INSERT IGNORE INTO insis_faculties (id) VALUES (ident)
   Ensures the faculty row exists before the UPDATE.
   Uses INSERT IGNORE so that concurrent jobs (course, study plan) are not blocked.

2. UPDATE insis_faculties
   SET is_schedule_publicly_visible = <value>
   WHERE id = ident
```

The INSERT IGNORE step satisfies the FK constraint if the faculty has never been seen before. Title and other
faculty fields are populated by subsequent course or study plan scrapes.

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

// Academic schedules: 1 AM daily (year-round — schedule changes affect all students)
upsertJobScheduler(ScraperInSISAcademicSchedulesRequestScheduler, {
    pattern: '0 1 * * *'
}, {
    data: { type: 'InSIS:AcademicSchedules' }
})
```

On startup the API also removes the legacy `SupervisorScheduler` entry from Redis if it exists.

**In development:** schedulers are disabled. Use the `/commands/insis/*` endpoints with a Bearer token to trigger
scrapes manually. See [Scripts](../SCRIPTS.md) for pre-built curl helpers and Makefile targets.

**Scraping modes:** scheduled jobs always use `turbo`. Manual triggers default to `polite`. Pass `"mode": "normal"` or
`"mode": "turbo"` in the request body to override. See [Scraper JOBS.md](../scraper/JOBS.md#scraping-modes) for the
full mode reference.
