# Scraper types

The canonical scraped-data and queue payload types are in [`packages/types/src/queue.ts`](../../packages/types/src/queue.ts). Domain enums and time selections are in [`packages/types/src/domain.ts`](../../packages/types/src/domain.ts). Queue names are in [`packages/core/src/queue/names.ts`](../../packages/core/src/queue/names.ts). The API and scraper import these shared packages directly.

## Scraped results

| Type | Main content |
| --- | --- |
| `ScraperInSISCourse` | Course identity, bilingual syllabus, faculty, assessments, timetable, plan links, content hashes |
| `ScraperInSISStudyPlan` | Plan identity, faculty, period, study mode, linked course codes and categories |
| `ScraperInSISAcademicSchedule` | Faculty period, date range, dated events |
| `ScraperInSISFacultyTimetable` | Faculty ident and public visibility flag |
| Catalog and list results | Discovered URLs or counts |

`ScraperRequestJob` and `ScraperResponseJob` are discriminated by `type`. An `InSIS:Course` response carries `course_id` and a nullable `course`; `null` marks a missing course. `InSIS:GapSweep` is an API-owned response-queue job, not an InSIS page scrape.

## Time and optional fields

Scraped timetable `time_from` and `time_to` values are nullable clock strings. The API converts them to integer minutes from midnight for storage. Academic schedule dates use ISO date or date-time strings. Nullable fields preserve missing InSIS data; do not replace them with guessed defaults.
