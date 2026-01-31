# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kreditozrouti is a university course scheduling system that scrapes InSIS (university information system), stores course data, and provides a frontend for students to browse courses and study plans. The system consists of three main services that communicate via BullMQ job queues backed by Redis.

**Core Workflow:**
1. API receives requests from Client or triggers scheduled scraping jobs
2. API enqueues scraping requests to BullMQ (ScraperRequestQueue)
3. Scraper processes jobs, scrapes InSIS, and enqueues results to BullMQ (ScraperResponseQueue)
4. API workers process responses and persist data to MySQL
5. Client queries API for course/study plan data

## Development Commands

```bash
# Install all dependencies (requires pnpm 10.20.0+)
make install

# Run all services in parallel (API, Client, Scraper)
make dev

# Run individual services
make dev-api
make dev-client
make dev-scraper

# Code quality
make lint
make format

# Build all projects
make build

# Docker operations
make run-local-docker      # Start MySQL, Redis, phpMyAdmin
make clear-redis           # Flush Redis database
make build-docker-images   # Build production Docker images
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT (Vue 3)           API (Express)       SCRAPER       │
│  Port 45173               Port 40080          (Background)  │
│  ┌─────────────┐         ┌─────────────┐     ┌───────────┐  │
│  │ Vue Router  │  HTTP   │ Controllers │     │ Puppeteer │  │
│  │ Pinia       │ ──────► │ Services    │ ◄───│ Cheerio   │  │
│  │ Tailwind    │         │ Kysely QB   │     │ BullMQ    │  │
│  └─────────────┘         └─────────────┘     └───────────┘  │
│                                │   ▲              │         │
│                                ▼   │              │         │
│                          ┌─────────────┐          │         │
│                          │   MySQL 8   │          │         │
│                          │ Port 43306  │          │         │
│                          └─────────────┘          │         │
│                                                   │         │
│                          ┌─────────────┐          │         │
│                          │    Redis    │ ◄────────┘         │
│                          │ Port 46379  │   (Job Queue)      │
│                          └─────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

**Communication Flow:**
- Client calls API via HTTP/JSON
- API enqueues scraping jobs via BullMQ
- Scraper processes jobs and stores results in MySQL
- Both API and Scraper use Redis for job queue coordination

## Key Tech Stack

| Service  | Framework     | Key Libraries                                    |
|----------|---------------|--------------------------------------------------|
| API      | Express 5     | Kysely, BullMQ, Zod, connect-redis, Nodemailer   |
| Client   | Vue 3 + Vite  | Pinia, Vue Router (auto-routes), Tailwind CSS 4  |
| Scraper  | Node.js       | Puppeteer, Cheerio, BullMQ                       |

**Important Notes:**
- Kysely is a query builder, not an ORM. It does NOT auto-sync schema changes.
- Migrations must be manually created in `/api/src/Database/migrations/` with numeric prefixes (e.g., `0001_`, `0002_`).
- API runs migrations automatically on startup via `SQLService.migrateToLatest()`.
- Client uses file-based routing via `unplugin-vue-router` - routes are auto-generated from `/client/src/pages`.

## Project Structure

- `/api` - Express backend with Kysely query builder
  - `/src/Controllers/Kreditozrouti` - HTTP request handlers (Courses, StudyPlans)
  - `/src/Services` - Domain services (CourseService, StudyPlanService, InSISService)
  - `/src/Database/migrations` - Kysely migrations (numbered 0001-, 0002-, etc.)
  - `/src/Jobs` - BullMQ response job handlers (e.g., ScraperResponseInSISCourseJob)
  - `/src/Handlers` - Routing logic for BullMQ job types (ScraperResponseHandler)
  - `/src/bullmq.ts` - BullMQ queue and worker initialization
  - `/bruno` - Bruno API testing collection (alternative to Postman)
- `/client` - Vue 3 SPA
  - `/src/pages` - File-based routing via unplugin-vue-router (auto-generates routes)
  - `/src/stores` - Pinia stores (alerts, courses, ui, timetable, wizard)
  - `/src/locales` - i18n translations (en, cs)
- `/scraper` - Headless browser scraping service
  - `/src/Jobs` - Scraping job implementations (e.g., ScraperRequestInSISCourseJob)
  - `/src/Services` - Scraping business logic (ExtractInSISCourseService, InSISQueueService)

## Path Aliases

All projects use TypeScript path aliases:
- `@api/*` - API source files
- `@client/*` - Client source files
- `@scraper/*` - Scraper source files

Cross-project imports are supported (e.g., client can import API types).

## Database

- **Query Builder:** Kysely (type-safe SQL query builder, not an ORM)
- **Migrations:** Run automatically on API startup via `SQLService.migrateToLatest()`
- **Tables:**
  - `insis_faculties` - Faculty metadata
  - `insis_courses` - Course metadata (syllabus, lecturers, credits)
  - `insis_course_assessments` - Assessment methods per course
  - `insis_course_units` - Timetable units (lectures, seminars)
  - `insis_course_unit_slots` - Individual time slots for units
  - `insis_study_plans` - Study plan metadata
  - `insis_study_plan_courses` - Many-to-many relation between study plans and courses

**Migration Naming:**
- Use numeric prefixes: `0001_description.ts`, `0002_description.ts`
- Later migrations may use timestamps: `20260122151133_description.ts`

## Environment Setup

1. Copy `.env.example` to `.env`
2. Run `make run-local-docker` to start MySQL and Redis
3. Run `make install` to install dependencies
4. Run `make dev` to start all services

## BullMQ Job Flow

**Request Jobs (Scraper):**
- `ScraperRequestInSISCourseJob` - Scrape single course page
- `ScraperRequestInSISStudyPlanJob` - Scrape single study plan page
- `ScraperRequestInSISStudyPlansJob` - Scrape study plans catalog
- `ScraperRequestInSISCatalogJob` - Scrape course catalog

**Response Jobs (API):**
- `ScraperResponseInSISCourseJob` - Persist scraped course to MySQL
- `ScraperResponseInSISStudyPlanJob` - Persist scraped study plan to MySQL

**Job Routing:**
- API: `ScraperResponseHandler` in `/api/src/Handlers` routes response jobs by type
- Scraper: Jobs are imported and registered in scraper's worker initialization

**Scheduled Jobs (Production Only):**
- `ScraperInSISCatalogRequestScheduler` - Daily at 1 AM in Jan, Feb, Aug, Sep
- `ScraperInSISStudyPlansRequestScheduler` - Daily at 2 AM in Jan, Feb, Aug, Sep

## API Endpoints

- `POST /courses` - Fetch course data (via CoursesController)
- `POST /study_plans` - Fetch study plan data (via StudyPlansController)
- `GET /health` - Health check
- `POST /commands/run-insis-catalog-scraper` - Trigger catalog scraping
- `POST /commands/run-insis-course-scraper` - Trigger course scraping
- `POST /commands/run-insis-study-plan-scraper` - Trigger study plan scraping
- `POST /commands/run-insis-study-plans-scraper` - Trigger study plans catalog scraping

**Authentication:**
- `/commands/*` endpoints require `API_COMMAND_TOKEN` header
- No user authentication system (this is an internal tool)

## API Testing

The project uses **Bruno** (not Postman) for API testing. Collection files are in `/api/bruno/Kreditozrouti/`:
- `Health Check.bru` - Test health endpoint
- `Kreditožrouti/Courses.bru` - Test courses endpoint
- `Kreditožrouti/Study Plans.bru` - Test study plans endpoint
- `Commands/*.bru` - Test scraper command endpoints

Bruno files use `.bru` extension and can be opened with the Bruno desktop application.

## Internationalization

Client supports English (en) and Czech (cs) locales via Vue I18n. Translation files are in `/client/src/locales`.

## Common Gotchas

1. **Cross-project imports**: API can import from Scraper via `@scraper/*` alias. Client can import API types via `@api/*`. This is intentional for sharing TypeScript interfaces.

2. **Time storage**: Course time slots are stored as minutes since midnight (e.g., 540 = 9:00 AM). Convert with `timeToMinutes()` helper in ScraperResponseInSISCourseJob.

3. **Puppeteer installation**: Scraper's `postinstall` script downloads Chrome automatically. On first install, this may take several minutes.

4. **Cluster mode**: API supports multiple workers via command-line args (e.g., `pnpm run dev 4` for 4 workers). Default is 1 worker in dev mode.

5. **Session management**: API uses Redis-backed sessions via `connect-redis`. Session secret is configured in `API_SESSION_SECRET` env var.

6. **Kysely migrations**: Unlike ORMs, Kysely does NOT auto-generate migrations from schema changes. You must manually create migration files with `db.schema` DDL statements.
