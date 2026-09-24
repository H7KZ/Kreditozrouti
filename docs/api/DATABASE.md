# API database

The API uses Kysely with MySQL. Table interfaces and the `Database` type are defined in [`packages/types/src/db.ts`](../../packages/types/src/db.ts) and re-exported by `api/src/Database/types.ts`. Migrations live in `api/src/Database/migrations/`; `SQLService` applies them at startup.

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

The canonical table names and columns are in the type file and migrations. Course `languages` and `lecturers` are pipe-delimited strings; service code splits them for output and facets.

## Time and links

Slot `time_from` and `time_to` are integer minutes from midnight: `08:00` is `480`. The scraper extracts clock strings; the API converts them during persistence. A plan can reference a course code before that course is scraped; later synchronization fills the course link.

## Schema changes

Add a Kysely migration in `api/src/Database/migrations/` and update the matching table interface in `packages/types/src/db.ts`. Keep the API query and response projections in sync. See [engineering setup](../engineering/SETUP.md) for local MySQL.
