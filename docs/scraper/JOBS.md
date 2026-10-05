# Scraper jobs

`ScraperRequestHandler` selects a job by the payload's `type`. The API schedules discovery jobs; scraper jobs may enqueue narrower work through `QueueService`.

| Request type | What it does | Result |
| --- | --- | --- |
| `InSIS:Catalog` | Search faculty and period combinations for course URLs; optionally queue matching courses | Catalog URL list |
| `InSIS:Course` | Read Czech and English syllabus pages, assessments, timetable, and plan links | Course data, or a not-found marker |
| `InSIS:StudyPlans` | Walk plan navigation and optionally queue individual plans | Plan URL list |
| `InSIS:StudyPlan` | Parse one plan and its course codes, groups, and categories | Plan data |
| `InSIS:AcademicSchedules` | Discover faculties and periods | Counts plus per-period jobs |
| `InSIS:AcademicSchedule` | Parse dated events in one period | Schedule and events |
| `InSIS:FacultyTimetables` | Discover faculty timetable pages | Count plus per-faculty jobs |
| `InSIS:FacultyTimetable` | Decide whether a faculty timetable is publicly visible | Faculty ident and visibility flag |

The source of truth for request and result fields is [`packages/types/src/queue.ts`](../../packages/types/src/queue.ts). Catalog and plan discovery can filter faculties or periods. The catalog also supports `allowed_idents`, used for targeted missing-course sweeps.

Course jobs compare content hashes and skip unchanged pages. A missing course can produce `course: null`, which lets the API remove a stale record.

## Failure behavior

Network and parse failures in a course job are thrown for BullMQ retries; a rate-limit response moves the job to BullMQ's delayed set using its retry-after value. Some bulk and discovery jobs log a failed item and continue or return `null`. Check the individual job before changing this behavior. A global outbound limiter can refuse a request when its wait cap is exceeded or Redis is unavailable; it does not send that request to InSIS.

See [queue behavior](QUEUE.md) for attempts, delays, and deduplication.
