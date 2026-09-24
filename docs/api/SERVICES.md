# API services

Controllers validate requests and call services in `apps/api/src/Services/`. Shared request and response types live in `@kreditozrouti/types`.

## Course search

`CourseService.ts` delegates to `Course/` modules:

| Module | Responsibility |
| --- | --- |
| `CourseFilterBuilder` | Builds SQL predicates and only joins tables needed by active filters |
| `CourseQueryService` | Counts matches, pages course IDs, then loads relations in batches |
| `CourseFacetService` | Counts values against the other active filters |
| `CourseCacheService` | Caches facet results in Redis |

The batched relation queries avoid a query per course. `exclude_times` retains a course when at least one available slot avoids the excluded time; courses without slots also remain. `completed_course_idents` applies prerequisite and exclusion rules parsed by `PrerequisiteParser.ts`. When plan IDs are selected, the plan linkage determines membership, so course year and semester filters are skipped.

## Study plan search

`StudyPlanService.ts` delegates to `StudyPlan/` filter, query, facet, and cache modules. It counts and pages plan IDs, loads faculty and course relations in batches, then assembles the response. Facet counts reflect the other active filters.

## Scraping and optimization

`ScraperService.ts` enqueues catalog, course, plan, academic schedule, and faculty timetable work. It also retries failed jobs. `ScraperGapSweeperService.ts` identifies study-plan course idents absent from the course table and triggers targeted discovery.

`OptimizeService.ts` loads candidate courses and calls the pure solver in `@kreditozrouti/core/domain`. Build mode ranks conflict-free schedules and possible one-course removals. Explore mode tries each additional course against the base selection. Request and result fields are defined in [`packages/types/src/optimizer.ts`](../../packages/types/src/optimizer.ts).

`SQLService.ts` runs migrations and seeds at startup. `EmailService.ts` uses Gmail SMTP only when both `GOOGLE_USER` and `GOOGLE_APP_PASSWORD` are set; see [Gmail setup](../setup/GMAIL.md).
