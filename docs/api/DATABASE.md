# API database

The API uses Kysely with MySQL. Table interfaces and the `Database` type are defined in [`packages/types/src/db.ts`](../../packages/types/src/db.ts) and re-exported by `apps/api/src/Database/types.ts`. Migrations live in `apps/api/src/Database/migrations/`; `SQLService` applies them at startup.

## Tables

| Table | Purpose |
| --- | --- |
| `insis_faculties` | Faculty identity and public timetable visibility |
| `insis_courses` | Course metadata, bilingual syllabus, prerequisites, content hash, scrape time |
| `insis_courses_assessments` | Assessment methods and weights |
| `insis_courses_units` | Lecture, exercise, and seminar groups |
| `insis_courses_units_slots` | Scheduled time and place for a unit |
| `insis_study_plans` | Plan metadata |
| `insis_study_plans_courses` | Linked course records and plan categories |
| `insis_study_plans_course_idents` | Course codes discovered before a course record exists |
| `insis_academic_periods` | Faculty, year, semester, and level |
| `insis_academic_schedule_events` | Dated academic events in a period |
| `insis_lecturers` | Lecturers keyed by InSIS person id (not generated) |
| `insis_courses_lecturers` | Course-to-lecturer links with role `lecturer` or `guarantor` |
| `api_plans`, `api_consumers`, `api_keys` | Partner API quota tiers, partner organisations, and hashed API keys (a key may list the browser origins it can be used from) |
| `api_usage_hourly` | Hourly partner request counts per consumer, key, route template and status class |

The canonical table names and columns are in the type file and migrations. Course `languages` and `lecturers` are pipe-delimited strings; service code splits them for output and facets. `lecturers` and `guarantors` on a course stay as display strings; `insis_lecturers` and `insis_courses_lecturers` add the InSIS person id for course-level people and are filled by the course job. Unit-level `lecturer` has no person id.

`insis_faculties.schedule_visibility_checked_at` is set when the faculty-timetable job confirms `is_schedule_publicly_visible`. `NULL` means "never confirmed"; the partner API hides such faculties. API keys are stored as a SHA-256 hash plus a plain lookup `prefix`, never the key.

## Time and links

Slot `time_from` and `time_to` are integer minutes from midnight: `08:00` is `480`. The scraper extracts clock strings; the API converts them during persistence. A plan can reference a course code before that course is scraped; later synchronization fills the course link.

## Schema changes

Add a Kysely migration in `apps/api/src/Database/migrations/` and update the matching table interface in `packages/types/src/db.ts`. Keep the API query and response projections in sync. See [engineering setup](../engineering/SETUP.md) for local MySQL.
