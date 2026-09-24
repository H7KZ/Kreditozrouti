# API response jobs and schedules

The API owns `ScraperRequestQueue` and consumes `ScraperResponseQueue`. Both names come from `@kreditozrouti/core/queue`; payloads come from `@kreditozrouti/types`. `api/src/Handlers/ScraperResponseHandler.ts` dispatches results and retries database deadlocks.

## Result handling

| Result type | API action |
| --- | --- |
| `InSIS:Course` | Upsert faculty and course, reconcile assessments, units, slots, and plan links; delete a known course when InSIS reports it missing |
| `InSIS:StudyPlan` | Upsert the plan and its course links; preserve course idents until course records exist |
| `InSIS:AcademicSchedule` | Upsert academic period and reconcile its events |
| `InSIS:FacultyTimetable` | Update the faculty's public timetable flag |
| `InSIS:GapSweep` | Find missing course idents and enqueue targeted discovery |
| Catalog, plan-list, academic-schedule-list | Discovery results; no direct database sync |

Course slots arrive as clock strings and are stored as minutes from midnight. After a course update, the job publishes `course:updated:<id>` through Redis for the scrape-status stream.

The response worker runs with concurrency 2 and permits two stall recoveries. Failed response jobs receive three attempts with exponential backoff from 5 seconds. See [queue behavior](../scraper/QUEUE.md).

## Production schedules

`api/src/bullmq.ts` registers these BullMQ schedulers only when `ENV` is `production` or `prod`:

| Time | Job |
| --- | --- |
| Daily 01:00 | Academic schedules |
| Daily 02:00 in Jan-Feb and Jun-Sep | Study plans |
| Daily 03:00 in Jan-Feb and Jun-Sep | Catalog for the upcoming period |
| Sunday 00:00 | Faculty timetable visibility |
| Every four hours | Missing-course gap sweep |

Development scrapes use [operator commands](ENDPOINTS.md#operator-routes).
