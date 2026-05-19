# Data Flow

## End-to-End: Course Search

```
User types search term in browser
        │
        ▼
[Client] courses.vue deep-watches filtersStore.filters
  → calls coursesStore.fetchCourses()
  → POST /courses  { title, faculty_ids, days, times, … }
        │
        ▼
[API] CoursesController.handleRequest()
  → Zod validation
  → CourseService.getCourses(filters)
     → Kysely SELECT with WHERE/JOIN/ORDER
     → Returns CourseWithRelationsDTO[]
  → CacheMiddleware stores response (SHA-256 key, 300s TTL)
  → res.json({ courses, facets, pagination })
        │
        ▼
[Client] coursesStore receives response
  → courses list rendered
  → timetableStore.courseStatuses computed
  → conflict badges applied
```

---

## End-to-End: Scraping a New Course

```
[API Scheduler] ScraperInSISCatalogRequestScheduler (prod, nightly 1 AM)
  OR
[Admin] POST /commands/insis/catalog  (dev, manual)
        │
        ▼
[API] ScraperService.enqueueCatalogScrape()
  → scraperRequestQueue.add('InSIS:Catalog', { year, semester })
        │
        ▼  (Redis BullMQ)
        │
        ▼
[Scraper] ScraperRequestHandler routes job → ScraperRequestInSISCatalogJob
  → InSISHTTPClientService.get(catalogUrl)   ← Axios, not Puppeteer
  → ExtractInSISCatalogService.extract($)    ← Cheerio parse
  → for each course ident found:
      scraperRequestQueue.add('InSIS:Course', { ident, year, semester })
        │
        ▼  (Redis BullMQ — one job per course)
        │
        ▼
[Scraper] ScraperRequestInSISCourseJob
  → InSISHTTPClientService.get(courseUrl)
  → ExtractInSISCourseService.extract($)
  → scraperResponseQueue.add('InSIS:Course', { course: ScraperInSISCourse })
        │
        ▼  (Redis BullMQ)
        │
        ▼
[API] ScraperResponseHandler → ScraperResponseInSISCourseJob.process()
  → DB transaction:
      1. upsert insis_faculties
      2. upsert insis_courses
      3. reconcile insis_course_assessments
      4. DELETE + recreate insis_course_units + insis_course_unit_slots
      5. link insis_study_plan_courses
      6. redis.publish('course:updated:{id}')   ← SSE fan-out to waiting clients
```

---

## End-to-End: SSE Live Update

When the client triggers a course scrape (e.g., course page first load):

```
[Client] GET /courses/{ident}/scrape  (EventSource / SSE)
        │
        ▼
[API] CourseScraperController opens SSE connection
  → subscribes to redis 'course:updated:{id}'
  → enqueues InSIS:Course job
        │
        ▼  (scraping happens — see above)
        │
        ▼
[API] redis.publish fires → SSE sends { event: 'done' }
        │
        ▼
[Client] EventSource receives done → re-fetches course data
```

---

## Data Encoding Rules

| Concept | Encoding | Example |
|---------|----------|---------|
| Times | Minutes from midnight (0–1439) | `08:00` → `480` |
| Languages | Pipe-delimited string in DB | `"CS\|EN"` → parsed in service layer |
| Lecturers | Pipe-delimited string in DB | `"Novák J.\|Malá K."` |
| Env vars — API | `API_*` prefix | `API_PORT`, `API_JWT_SECRET` |
| Env vars — Client | `VITE_*` prefix (baked at build) | `VITE_API_URL` |
| Env vars — Scraper | No prefix | `INSIS_BASE_URL` |
| Env vars — Infra | `MYSQL_*`, `REDIS_*` | `MYSQL_ROOT_PASSWORD` |
