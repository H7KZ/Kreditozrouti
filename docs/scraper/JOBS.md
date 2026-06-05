# Scraper — Jobs Reference

All scraper jobs are plain async functions routed through `ScraperRequestHandler` based on `job.data.type`. Each job
receives strongly-typed data from `@shared/queue/jobs` and writes results back to `ScraperResponseQueue` via
`QueueService`.

## Job Routing Map

| `job.data.type`    | Handler function                   | Source file                                |
|--------------------|------------------------------------|--------------------------------------------|
| `InSIS:Catalog`    | `ScraperRequestInSISCatalogJob`    | `Jobs/ScraperRequestInSISCatalogJob.ts`    |
| `InSIS:Course`     | `ScraperRequestInSISCourseJob`     | `Jobs/ScraperRequestInSISCourseJob.ts`     |
| `InSIS:StudyPlans` | `ScraperRequestInSISStudyPlansJob` | `Jobs/ScraperRequestInSISStudyPlansJob.ts` |
| `InSIS:StudyPlan`  | `ScraperRequestInSISStudyPlanJob`  | `Jobs/ScraperRequestInSISStudyPlanJob.ts`  |

> **Registration window decisions belong to the API, not the scraper.** The API scheduler uses month-scoped cron
> patterns (`1,2,6,7,8,9,11,12`) to only fire during registration periods. The scraper receives jobs and executes them —
> it has no gate logic of its own.

---

## InSIS:Catalog

**Purpose:** Discovers all courses available in InSIS for given faculties and academic periods, then optionally enqueues
individual course scrape jobs.

**Input payload:**

```typescript
{
  type: 'InSIS:Catalog'
  mode: 'turbo' | 'normal' | 'polite'  // Scraping aggressiveness — see Scraping Modes below.
  faculties?: string[]                  // Filter by faculty name (case-insensitive). All if omitted.
  periods?: { semester: 'ZS'|'LS'; year: number }[]  // Filter by period. All if omitted.
  auto_queue_courses?: boolean          // If true, enqueues InSIS:Course for every discovered URL.
  allowed_idents?: string[]             // If set, only courses whose ident is in this list are queued. Absent = no filter.
}
```

> **Note:** Manual triggers via `ScraperService.enqueueCatalogScrape` populate `allowed_idents` from
`DISTINCT course_ident` in `insis_study_plans_courses`. Scheduled runs (nightly cron) omit `allowed_idents` and scrape
> everything — BullMQ schedulers store static job data at definition time, making per-run DB queries impractical.

**Flow — Phase 1: Discovery**

```
GET https://insis.vse.cz/katalog/index.pl?jak=rozsirene
  └─ ExtractInSISCatalogService.extractSearchOptions(html)
       → { faculties: [{id, identifier, name}], periods: [{id, identifier, yearId, semester, year}] }
  └─ apply faculty/period filters from job data
```

**Flow — Phase 2: Scraping**

```
Flatten faculties × periods into combos array.
Run runWithConcurrency(combos, catalogConcurrencyForMode(mode), scrapeCatalogPage):

  For each (faculty, period) combo (in parallel, mode-bounded):
    POST https://insis.vse.cz/katalog/
      body: fakulta=<id>&obdobi=<yearId>&obdobi_fak=<id>&jak=rozsirene&...
    └─ ExtractInSISCatalogService.extractCourses(html)
         → CatalogCourse[] of unique { url, ident } pairs
    └─ if allowed_idents present: filter courses to only those whose ident is in the set
    └─ QueueService.addCatalogResponse(urls)
         → sends InSIS:Catalog response to API
    └─ if auto_queue_courses=true:
         QueueService.queueCourseRequests(courses, mode)
         → addBulk with dedup key 'InSIS:Course:{courseId}'
         → delay: index * leafDelayForMode(mode) per job (crash-safe, stored in Redis)
```

**Concurrency by mode (Phase 2):**

| Mode     | Catalog concurrency | Leaf job delay |
|----------|--------------------:|---------------:|
| `turbo`  |                   6 |           0 ms |
| `normal` |                   3 |       1 000 ms |
| `polite` |      1 (sequential) |       3 000 ms |

**Output:** Multiple `InSIS:Catalog` response jobs (one per faculty/period), each with a `catalog.urls` array. Also
queues `InSIS:Course` jobs if `auto_queue_courses` is set.

**Error handling:** A failed faculty/period page is logged and skipped; the job continues with remaining combinations.
Returns `null` only if Phase 1 discovery fails entirely.

---

## InSIS:Course

**Purpose:** Scrapes a single course syllabus page and extracts all structured course data including metadata, syllabus
content, assessment methods, timetable, and study plan references.

**Input payload:**

```typescript
{
  type: 'InSIS:Course'
  url: string   // Full InSIS syllabus URL (must contain ?predmet=<id>)
}
```

**Flow:**

```
1. Extract courseId from URL (/[?&;]predmet=(\d+)/)
2. GET url + lang=cz param via InSISHTTPClientService
   └─ on failure: throw InSISNetworkError (retried up to 3×)

3. ExtractInSISCourseService.extract(html, url)
   Internally:
   ├─ sanitizeBodyHtml (normalize &nbsp;)
   ├─ resolveId (from <input name="predmet"> or URL)
   ├─ extractBasicInfo (ident, title_cs/en, ects, mode_of_delivery/completion, languages)
   ├─ extractSemesterAndYear (from "Semestr:" row)
   ├─ extractFaculty (from page header h1, applies is_schedule_publicly_visible rules)
   ├─ extractLevelAndYear (from "Doporučený typ a ročník studia:", with MBA/kurz fallback)
   ├─ extractPeople (lecturers + guarantors, with "(garant)" sibling-text detection)
   ├─ extractSyllabusContent (8 text fields, literature split into required/recommended)
   ├─ extractAssessmentMethods (table rows → [{method, weight}])
   ├─ extractTimetable (only if faculty.is_schedule_publicly_visible)
   ├─ extractStudyPlans (from "Kód programu" tables, one entry per semester per plan)
   ├─ extractStudyLoad (activity + hours table)
   └─ extractAuditInfo (last_modified_by + last_modified_date from body text)

4. QueueService.addCourseResponse(course)
   → sends ScraperInSISCourse via InSIS:Course response job

5. return course
```

**Output:** One `InSIS:Course` response job containing the full `ScraperInSISCourse` object.

**Error handling:**

| Error type                     | Class                                          | Retry?                                             |
|--------------------------------|------------------------------------------------|----------------------------------------------------|
| HTTP failure (4xx/5xx/timeout) | `InSISNetworkError`                            | Yes — up to 3× with exponential backoff (10s base) |
| HTML parse failure             | `InSISParseError` extends `UnrecoverableError` | No — BullMQ bypasses retry queue                   |

**Faculty schedule visibility rules** (baked into `extractFaculty`):

| Faculty ident | Year threshold | `is_schedule_publicly_visible` |
|---------------|----------------|--------------------------------|
| `CTVS` (PE)   | ≥ 2017         | `false`                        |
| `OZS`         | ≥ 2020         | `false`                        |
| `IOM`         | ≥ 2021         | `false`                        |
| `CESP`        | ≥ 2022         | `false`                        |
| All others    | any            | `true`                         |

When `false`, the timetable extraction step is skipped and `timetable` is set to `[]`.

---

## InSIS:StudyPlans

**Purpose:** Traverses the InSIS study plans hierarchy (faculty → program → specialization → plan) using breadth-first
search, collecting all leaf plan URLs. Optionally enqueues individual `InSIS:StudyPlan` jobs.

**Input payload:**

```typescript
{
  type: 'InSIS:StudyPlans'
  mode: 'turbo' | 'normal' | 'polite'  // Scraping aggressiveness — see Scraping Modes below.
  faculties?: string[]                  // Filter by faculty title (case-insensitive)
  periods?: { semester: 'ZS'|'LS'; year: number }[]  // Filter navigation by period
  auto_queue_study_plans?: boolean
}
```

**Flow:**

```
1. GET https://insis.vse.cz/katalog/plany.pl?lang=cz
   └─ ExtractInSISStudyPlanService.extractFaculties(html)
        → [{title, url}] for each faculty link
   └─ apply faculties filter

2. traverseHierarchy(client, faculty_urls, periods, bfsConcurrencyForMode(mode))
   BFS loop (max depth 8, concurrency driven by mode):
   
   For each URL at the current level (in parallel, mode-bounded):
     GET url via client.getSilent()
     
     ├─ extractPlanUrls(html)    → URLs containing 'stud_plan='  → collected as leaves
     └─ extractNavigationUrls(html) → URLs without 'stud_plan=' → next-level frontier
         └─ if periods filter active and URL lacks 'poc_obdobi=':
              match nav texts against period filter (extractSemester + extractYear)
   
   Repeat with next-level frontier until depth=8 or no more URLs

3. QueueService.addStudyPlansResponse({ urls })
   → sends InSIS:StudyPlans response to API

4. if auto_queue_study_plans:
   QueueService.queueStudyPlanRequests(urls, extractIdFn, mode, concurrency=20)
   → one InSIS:StudyPlan job per URL, dedup key 'InSIS:StudyPlan:{planId}'
   → delay: index * leafDelayForMode(mode) per job (crash-safe, stored in Redis)
```

**Output:** One `InSIS:StudyPlans` response job with `plans.urls` array. Optionally queues `InSIS:StudyPlan` jobs.

**Limits:**

| Parameter                      | turbo |   normal |   polite | Reason                                             |
|--------------------------------|------:|---------:|---------:|----------------------------------------------------|
| `MaxDrillDepth`                |     8 |        8 |        8 | Guards against unexpected circular nav structures  |
| BFS concurrency                |    10 |        4 |        2 | Mode-driven — see `bfsConcurrencyForMode()`        |
| Leaf job delay                 |  0 ms | 1 000 ms | 3 000 ms | Per-job delay stored in BullMQ (Redis), crash-safe |
| Study plan enqueue concurrency |    20 |       20 |       20 | Redis writes, not HTTP — concurrency not a concern |

**Error handling:** Individual page failures via `getSilent` return `null` and are skipped. Returns `null` only if the
initial faculty list fetch fails.

---

## InSIS:StudyPlan

**Purpose:** Scrapes a single study plan page — metadata (ident, title, faculty, semester/year, level, mode, length) and
the full course list with group/category classification.

**Input payload:**

```typescript
{
  type: 'InSIS:StudyPlan'
  url: string   // Full URL containing stud_plan=<id>
}
```

**Flow:**

```
1. Extract planId from URL (/stud_plan=(\d+)/)
2. GET url via InSISHTTPClientService

3. ExtractInSISStudyPlanService.extract(html, url)
   ├─ extractIdFromUrl → id
   ├─ extractIdentAndTitle → ident (e.g. "B-AIN1"), title
   ├─ extractFaculty → { ident, title, is_schedule_publicly_visible: false }
   ├─ extractSemesterAndYear (from "Počáteční období:" row)
   ├─ getRowValueCaseInsensitive: level, mode_of_study, study_length
   └─ extractCourses
        → iterates all <tr> rows
        → detects group header rows (matches "XX - Description" pattern)
        → collects course rows (.uis-hl-table) with ident, href, group, category

4. QueueService.addStudyPlanResponse(plan)
   → sends ScraperInSISStudyPlan via InSIS:StudyPlan response job
```

**Output:** One `InSIS:StudyPlan` response job containing the full `ScraperInSISStudyPlan` object.

**Error handling:** On HTTP failure or parse exception, logs error via `LoggerJobContext` and returns `null` (job
completes without retry).

---

## Scraping Modes

`InSIS:Catalog` and `InSIS:StudyPlans` jobs accept a required `mode` field that controls how aggressively the scraper
hits InSIS. This protects InSIS during peak daytime usage when students are actively browsing.

| Mode     | When to use                      | Catalog concurrency | BFS concurrency | Leaf job delay |
|----------|----------------------------------|--------------------:|----------------:|---------------:|
| `turbo`  | Scheduled 2 AM / 3 AM night runs |                   6 |              10 |           0 ms |
| `normal` | Manual off-hours trigger         |                   3 |               4 |   1 000 ms/job |
| `polite` | Manual daytime trigger (default) |      1 (sequential) |               2 |   3 000 ms/job |

**Leaf job delay** applies to `InSIS:Course` and `InSIS:StudyPlan` jobs enqueued by the meta-job. The delay is set as a
BullMQ `delay` option at enqueue time (stored in Redis) — it survives scraper crashes and restarts. At `polite` + 1000
courses, the spread is ~50 minutes.

**Scheduled jobs** always use `turbo` (set in `api/src/bullmq.ts`). Manual triggers via `/commands/insis/*` default to
`polite` if no `mode` is provided in the request body.

See `scraper/src/Utils/ThrottleUtils.ts` for the exact values.

---

## Handler & Timing

`ScraperRequestHandler` measures wall-clock time for every job using `process.hrtime()` and logs the result as
`duration_ms` in the wide-event log. All logging flows through `LoggerJobContext` (AsyncLocalStorage), so job-level
fields are accumulated throughout the call stack and emitted as a single JSON line on completion.

See [Internals](INTERNALS.md) for details on the logger and error classes.
