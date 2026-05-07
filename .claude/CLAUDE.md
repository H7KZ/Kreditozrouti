# CLAUDE.md

**Comprehensive guidance for Claude Code when working with the Kreditožrouti codebase.**

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Quick Start](#quick-start)
3. [Development Commands](#development-commands)
4. [Architecture](#architecture)
5. [Project Structure](#project-structure)
6. [Tech Stack & Key Libraries](#tech-stack--key-libraries)
7. [Development Workflow](#development-workflow)
8. [Code Style & Conventions](#code-style--conventions)
9. [Database & Migrations](#database--migrations)
10. [BullMQ Job System](#bullmq-job-system)
11. [API Development](#api-development)
12. [Client Development](#client-development)
13. [Scraper Development](#scraper-development)
14. [Testing](#testing)
15. [Common Tasks](#common-tasks)
16. [Troubleshooting](#troubleshooting)
17. [Documentation](#documentation)
18. [Important Gotchas](#important-gotchas)

---

## Project Overview

**Kreditožrouti** is a modern course scheduling system for VŠE (Prague University of Economics and Business) students. It scrapes course data from InSIS (the university's information system) and presents it in a clean, filterable, user-friendly interface.

### The Problem We Solve

Every semester, 16,000+ VŠE students struggle with InSIS's limitations:
- No cross-filtering (can't search by day, time, lecturer, and faculty simultaneously)
- No timetable preview (students use spreadsheets to check conflicts)
- No study-plan awareness (manual cross-referencing of course requirements)
- No conflict detection (overlapping courses discovered only after manual building)

### Our Solution

- ✅ Advanced filtering with 10+ criteria
- ✅ Real-time timetable preview with drag-and-drop
- ✅ Automatic conflict detection
- ✅ Study plan-aware course suggestions
- ✅ Mobile-responsive interface
- ✅ Full Czech and English support

### Core Workflow

```
1. Client sends course search → API
2. API enqueues scraping job → BullMQ (ScraperRequestQueue)
3. Scraper processes job, scrapes InSIS → BullMQ (ScraperResponseQueue)
4. API workers process response → MySQL
5. Client queries API → Displays results
```

### Project Goals

- **Student-First:** Prioritize usability and speed
- **Reliable:** Accurate data from InSIS
- **Performant:** Fast searches, instant filtering
- **Maintainable:** Clean code, comprehensive tests, clear documentation
- **Accessible:** Support multiple languages, mobile devices

---

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 10.20.0+
- Docker & Docker Compose
- Make (optional but recommended)

### Setup

```bash
# 1. Clone and enter directory
git clone https://github.com/H7KZ/Kreditozrouti.git
cd Kreditozrouti

# 2. Copy environment variables
cp .env.example .env
# Edit .env with your configuration

# 3. Start infrastructure (MySQL, Redis, phpMyAdmin)
make run-local-docker

# 4. Install dependencies
make install

# 5. Run all services
make dev
```

### Access Points

- **Client:** http://localhost:45173
- **API:** http://localhost:40080
- **phpMyAdmin:** http://localhost:48080 (user: kreditozrouti, pass: kreditozrouti)
- **Redis Commander:** Not exposed by default

---

## Development Commands

### Essential Commands

```bash
# Installation
make install              # Install all project dependencies

# Development
make dev                  # Run all services in parallel (API + Client + Scraper)
make dev-api              # Run API only (port 40080)
make dev-client           # Run Client only (port 45173)
make dev-scraper          # Run Scraper only (background worker)

# Code Quality
make lint                 # Lint all projects (ESLint)
make format               # Format all projects (Prettier)

# Build
make build                # Build all projects for production
```

### Docker Commands

```bash
# Infrastructure
make run-local-docker     # Start MySQL, Redis, phpMyAdmin
make stop-local-docker    # Stop all Docker services
make clear-redis          # Flush Redis database (⚠️ deletes all Redis data)

# Production
make build-docker-images  # Build production Docker images
docker compose up -d      # Deploy with production config
```

### Database Commands

```bash
# Migrations run automatically on API startup
# To manually trigger migrations:
cd api && pnpm run migrate

# To create a new migration:
# 1. Create file: api/src/Database/migrations/0003_your_description.ts
# 2. Follow pattern from existing migrations
# 3. Restart API to apply
```

### Individual Service Commands

```bash
# API
cd api
pnpm install
pnpm run dev              # Development mode
pnpm run build            # Production build
pnpm run lint             # Lint API code
pnpm run format           # Format API code

# Client
cd client
pnpm install
pnpm run dev              # Development mode (Vite dev server)
pnpm run build            # Production build
pnpm run preview          # Preview production build
pnpm run type-check       # TypeScript type checking
pnpm run lint             # Lint client code
pnpm run format           # Format client code

# Scraper
cd scraper
pnpm install
pnpm run dev              # Development mode
pnpm run build            # Production build
pnpm run lint             # Lint scraper code
pnpm run format           # Format scraper code
```

---

## Architecture

### System Architecture

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

### Communication Flow

1. **Client → API (HTTP)**
   - User actions trigger API requests
   - RESTful endpoints return JSON
   - Session managed via Redis-backed cookies

2. **API → BullMQ → Scraper (Job Queue)**
   - API enqueues scraping jobs to Redis
   - Scraper workers consume jobs
   - Results sent back via response queue

3. **Scraper → InSIS (Web Scraping)**
   - Puppeteer for JavaScript-heavy pages
   - Cheerio for HTML parsing
   - Respects rate limits and robots.txt

4. **API → MySQL (Data Persistence)**
   - Kysely query builder for type-safe SQL
   - Migrations run automatically on startup
   - Normalized schema with foreign keys

### Service Responsibilities

**Client (Vue 3 SPA):**
- User interface and interactions
- State management (Pinia)
- Route handling (file-based)
- LocalStorage persistence
- i18n translations

**API (Express 5):**
- HTTP endpoints for client
- BullMQ job orchestration
- Data persistence to MySQL
- Session management (Redis)
- Scheduled scraping jobs (production)

**Scraper (Node.js Worker):**
- Headless browser automation (Puppeteer)
- HTML parsing (Cheerio)
- InSIS data extraction
- Job processing (BullMQ)
- Rate limiting and error handling

---

## Project Structure

```
Kreditozrouti/
├── api/                              # Express API server
│   ├── src/
│   │   ├── Controllers/              # HTTP request handlers
│   │   │   └── Kreditozrouti/        # Course and study plan controllers
│   │   ├── Services/                 # Business logic layer
│   │   │   ├── CourseService.ts      # Course operations
│   │   │   ├── StudyPlanService.ts   # Study plan operations
│   │   │   ├── InSISService.ts       # InSIS integration
│   │   │   └── SQLService.ts         # Database utilities
│   │   ├── Database/                 # Database layer
│   │   │   ├── kysely.ts             # Kysely instance
│   │   │   ├── migrations/           # Schema migrations
│   │   │   └── types.ts              # Generated DB types
│   │   ├── Jobs/                     # BullMQ response handlers
│   │   │   ├── ScraperResponseInSISCourseJob.ts
│   │   │   └── ScraperResponseInSISStudyPlanJob.ts
│   │   ├── Handlers/                 # Job routing logic
│   │   │   └── ScraperResponseHandler.ts
│   │   ├── Schedulers/               # Scheduled jobs
│   │   │   ├── ScraperInSISCatalogRequestScheduler.ts
│   │   │   └── ScraperInSISStudyPlansRequestScheduler.ts
│   │   ├── bullmq.ts                 # BullMQ configuration
│   │   ├── express.ts                # Express app setup
│   │   └── index.ts                  # Entry point
│   ├── bruno/                        # API testing (Bruno)
│   │   └── Kreditozrouti/            # Test collection
│   ├── package.json
│   └── tsconfig.json
│
├── client/                           # Vue 3 SPA
│   ├── src/
│   │   ├── pages/                    # File-based routes
│   │   │   ├── index.vue             # Landing page (/)
│   │   │   └── courses.vue           # Main app (/courses)
│   │   ├── components/               # Vue components
│   │   │   ├── alert/                # Global alerts
│   │   │   ├── common/               # Shared components
│   │   │   │   ├── LanguageSwitcher.vue
│   │   │   │   └── AppFooter.vue     # Global footer
│   │   │   ├── courses/              # Course listing
│   │   │   ├── filters/              # Filter panel
│   │   │   ├── timetable/            # Timetable grid
│   │   │   └── wizard/               # Study plan wizard
│   │   ├── stores/                   # Pinia stores
│   │   │   ├── alerts.store.ts       # Global notifications
│   │   │   ├── courses.store.ts      # Course filtering & search
│   │   │   ├── timetable.store.ts    # Schedule management
│   │   │   ├── ui.store.ts           # UI state
│   │   │   ├── wizard.store.ts       # Study plan wizard
│   │   │   └── index.ts              # Store exports
│   │   ├── composables/              # Composition utilities
│   │   │   ├── useCourseLabels.ts    # Translation helpers
│   │   │   ├── useTimetableGrid.ts   # Timetable logic
│   │   │   ├── useTimeUtils.ts       # Time formatting
│   │   │   └── index.ts              # Composable exports
│   │   ├── types/                    # TypeScript types
│   │   │   ├── course.ts
│   │   │   ├── timetable.ts
│   │   │   ├── wizard.ts
│   │   │   └── index.ts
│   │   ├── locales/                  # i18n translations
│   │   │   ├── en.json               # English
│   │   │   └── cs.json               # Czech
│   │   ├── styles/                   # CSS files
│   │   │   └── insis.css             # InSIS design system
│   │   ├── utils/                    # Utility functions
│   │   ├── constants/                # App constants
│   │   ├── api.ts                    # Axios instance
│   │   ├── App.vue                   # Root component
│   │   ├── index.ts                  # App initialization
│   │   └── index.css                 # Global styles
│   ├── public/                       # Static assets
│   │   ├── logo/                     # Logo images
│   │   ├── favicon/                  # Favicons
│   │   └── compliance/               # Legal documents
│   ├── package.json
│   ├── vite.config.ts                # Vite configuration
│   └── tsconfig.json
│
├── scraper/                          # Puppeteer scraper
│   ├── src/
│   │   ├── Jobs/                     # Scraping job implementations
│   │   │   ├── ScraperRequestInSISCourseJob.ts
│   │   │   ├── ScraperRequestInSISStudyPlanJob.ts
│   │   │   ├── ScraperRequestInSISStudyPlansJob.ts
│   │   │   └── ScraperRequestInSISCatalogJob.ts
│   │   ├── Services/                 # Scraping business logic
│   │   │   ├── ExtractInSISCourseService.ts
│   │   │   ├── ExtractInSISStudyPlanService.ts
│   │   │   └── InSISQueueService.ts
│   │   ├── bullmq.ts                 # BullMQ worker
│   │   └── index.ts                  # Entry point
│   ├── package.json
│   └── tsconfig.json
│
├── docs/                             # Documentation
│   ├── API.md                        # API documentation
│   ├── CLIENT.md                     # Client documentation
│   ├── SCRAPER.md                    # Scraper documentation
│   ├── SCRIPTS.md                    # Scripts documentation
│   ├── DEPLOYMENT.md                 # Deployment guide
│   ├── compliance/                   # Legal documents
│   │   ├── kreditozrouti-compliance-cs.pdf
│   │   └── kreditozrouti-compliance-en.pdf
│   └── kreditozrouti-marketing.docx  # Marketing materials
│
├── docker-compose.local.yml          # Local development
├── docker-compose.yml                # Production deployment
├── Makefile                          # Convenience commands
├── .env.example                      # Environment template
├── README.md                         # Project README
└── CLAUDE.md                         # This file
```

---

## Tech Stack & Key Libraries

### Frontend (Client)

| Library | Version | Purpose | Documentation |
|---------|---------|---------|---------------|
| Vue 3 | ^3.5 | Progressive JavaScript framework | [vuejs.org](https://vuejs.org) |
| Pinia | ^3.0 | State management | [pinia.vuejs.org](https://pinia.vuejs.org) |
| Vue Router 4 | ^4.6 | File-based routing | [router.vuejs.org](https://router.vuejs.org) |
| Tailwind CSS 4 | ^4.1 | Utility-first CSS | [tailwindcss.com](https://tailwindcss.com) |
| Vue I18n | ^11.2 | Internationalization | [vue-i18n.intlify.dev](https://vue-i18n.intlify.dev) |
| Axios | ^1.13 | HTTP client | [axios-http.com](https://axios-http.com) |
| Vite | ^7.3 | Build tool & dev server | [vitejs.dev](https://vitejs.dev) |
| TypeScript | ~5.9 | Type safety | [typescriptlang.org](https://typescriptlang.org) |

**Key Plugins:**
- `unplugin-vue-router` - Auto-generates routes from `/src/pages`
- `@vueuse/core` - Vue composition utilities
- `lucide-vue-next` - Icon library
- `@intlify/unplugin-vue-i18n` - i18n plugin for Vite

### Backend (API)

| Library | Version | Purpose | Documentation |
|---------|---------|---------|---------------|
| Express | ^5.0 | Web framework | [expressjs.com](https://expressjs.com) |
| Kysely | ^0.28 | Type-safe SQL query builder | [kysely.dev](https://kysely.dev) |
| BullMQ | ^5.0 | Redis-based job queue | [docs.bullmq.io](https://docs.bullmq.io) |
| Zod | ^4.3 | Schema validation | [zod.dev](https://zod.dev) |
| MySQL2 | ^3.0 | MySQL driver | [npmjs.com/package/mysql2](https://npmjs.com/package/mysql2) |
| Redis | ^4.0 | Redis client | [redis.io](https://redis.io) |
| TypeScript | ~5.9 | Type safety | [typescriptlang.org](https://typescriptlang.org) |

**Key Middleware:**
- `express-session` + `connect-redis` - Session management
- `cors` - Cross-origin resource sharing
- `helmet` - Security headers

### Scraper

| Library | Version | Purpose | Documentation |
|---------|---------|---------|---------------|
| Puppeteer | ^23.0 | Headless browser automation | [pptr.dev](https://pptr.dev) |
| Cheerio | ^1.0 | HTML parsing | [cheerio.js.org](https://cheerio.js.org) |
| BullMQ | ^5.0 | Job processing | [docs.bullmq.io](https://docs.bullmq.io) |
| TypeScript | ~5.9 | Type safety | [typescriptlang.org](https://typescriptlang.org) |

### DevOps & Tools

- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **pnpm** - Fast, disk space efficient package manager
- **ESLint** - Linting
- **Prettier** - Code formatting
- **Bruno** - API testing (alternative to Postman)
- **Make** - Build automation

---

## Development Workflow

### Best Practices

1. **Always read files before editing**
   - Use Read tool to understand existing code
   - Check for similar patterns in the codebase
   - Follow existing code style

2. **Keep changes focused**
   - One feature/fix per commit
   - Avoid refactoring unrelated code
   - Keep PRs small and reviewable

3. **Test your changes**
   - Run linter: `make lint`
   - Format code: `make format`
   - Test in browser for client changes
   - Use Bruno for API changes

4. **Update documentation**
   - Update README.md if adding features
   - Update relevant docs/ files
   - Add JSDoc comments for complex functions
   - Update i18n translations for new UI text

### Git Workflow

```bash
# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Make changes, test, lint, format
make lint
make format

# 3. Commit with conventional commits
git add .
git commit -m "feat: add your feature description"
# or: fix:, docs:, style:, refactor:, test:, chore:

# 4. Push to fork
git push origin feature/your-feature-name

# 5. Create Pull Request on GitHub
```

### Conventional Commits

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

---

## Code Style & Conventions

### TypeScript

- **Strict mode enabled** - All type errors must be resolved
- **Prefer interfaces over types** for object shapes
- **Use explicit return types** for exported functions
- **Avoid `any`** - Use `unknown` or proper types
- **Use destructuring** where it improves readability

**Example:**

```typescript
// ✅ Good
interface CourseFilter {
  faculty_ids?: string[]
  levels?: string[]
  title?: string
}

export function filterCourses(filters: CourseFilter): Promise<Course[]> {
  // ...
}

// ❌ Bad
export function filterCourses(filters: any) {
  // ...
}
```

### Vue 3

- **Use Composition API** with `<script setup>`
- **Prefer `ref` over `reactive`** for primitives
- **Use `computed` for derived state**
- **Keep components focused** - Single responsibility
- **Extract reusable logic** to composables

**Example:**

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const count = ref(0)
const doubled = computed(() => count.value * 2)

function increment() {
  count.value++
}
</script>

<template>
  <button @click="increment">
    {{ t('button.count', { count: doubled }) }}
  </button>
</template>
```

### Naming Conventions

- **Components:** PascalCase (e.g., `CourseTable.vue`)
- **Files:** kebab-case (e.g., `use-course-labels.ts`)
- **Functions:** camelCase (e.g., `fetchCourses`)
- **Constants:** SCREAMING_SNAKE_CASE (e.g., `API_BASE_URL`)
- **Types/Interfaces:** PascalCase (e.g., `CourseFilter`)
- **CSS classes:** kebab-case (e.g., `insis-btn-primary`)

### File Organization

- **Group by feature**, not by type
- **Keep related files together**
- **Use index.ts for exports**
- **Avoid deep nesting** (max 3-4 levels)

---

## Database & Migrations

### Kysely Query Builder

**Important:** Kysely is a **query builder**, NOT an ORM. It does NOT:
- Auto-generate migrations
- Track schema changes
- Provide models or entities
- Handle relationships automatically

**What it DOES:**
- Provide type-safe SQL queries
- Validate queries at compile time
- Support all SQL features
- Work with raw SQL when needed

### Database Schema

```typescript
// Generated types from migrations
interface Database {
  insis_faculties: FacultyTable
  insis_courses: CourseTable
  insis_course_assessments: CourseAssessmentTable
  insis_course_units: CourseUnitTable
  insis_course_unit_slots: CourseUnitSlotTable
  insis_study_plans: StudyPlanTable
  insis_study_plan_courses: StudyPlanCourseTable
}
```

**Tables:**
- `insis_faculties` - Faculty metadata (FIS, NF, etc.)
- `insis_courses` - Course metadata (syllabus, lecturers, ECTS)
- `insis_course_assessments` - Assessment methods per course
- `insis_course_units` - Course units (lectures, seminars, exercises)
- `insis_course_unit_slots` - Time slots for units
- `insis_study_plans` - Study plan metadata
- `insis_study_plan_courses` - Many-to-many relation

### Creating Migrations

Migrations run **automatically** on API startup via `SQLService.migrateToLatest()`.

**To create a new migration:**

1. **Create file:** `api/src/Database/migrations/0003_your_description.ts`

2. **Follow pattern:**

```typescript
import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('new_table')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('new_table').execute()
}
```

3. **Restart API** to apply migration

**Migration naming:**
- Use numeric prefixes: `0001_`, `0002_`, `0003_`
- Or timestamps: `20260122151133_`
- Descriptive names: `0003_add_course_tags_table.ts`

### Query Examples

```typescript
// Select with filters
const courses = await db
  .selectFrom('insis_courses')
  .selectAll()
  .where('faculty_id', '=', 'FIS')
  .where('year', '=', 2024)
  .orderBy('ident', 'asc')
  .execute()

// Join
const coursesWithUnits = await db
  .selectFrom('insis_courses')
  .innerJoin('insis_course_units', 'insis_courses.id', 'insis_course_units.course_id')
  .selectAll('insis_courses')
  .select(['insis_course_units.type', 'insis_course_units.capacity'])
  .execute()

// Insert
await db
  .insertInto('insis_courses')
  .values({
    ident: '4IT101',
    title_cs: 'Programování v Javě',
    title_en: 'Programming in Java',
    ects: 6,
    // ...
  })
  .execute()

// Update
await db
  .updateTable('insis_courses')
  .set({ ects: 7 })
  .where('ident', '=', '4IT101')
  .execute()

// Delete
await db
  .deleteFrom('insis_courses')
  .where('id', '=', courseId)
  .execute()
```

---

## BullMQ Job System

### Architecture

```
API → ScraperRequestQueue → Scraper → ScraperResponseQueue → API
```

### Request Jobs (Sent by API, Processed by Scraper)

**Location:** `scraper/src/Jobs/`

- `ScraperRequestInSISCourseJob.ts` - Scrape single course page
- `ScraperRequestInSISStudyPlanJob.ts` - Scrape single study plan page
- `ScraperRequestInSISStudyPlansJob.ts` - Scrape study plans catalog
- `ScraperRequestInSISCatalogJob.ts` - Scrape course catalog

**Example:**

```typescript
// API enqueues job
await scraperRequestQueue.add('ScraperRequestInSISCourseJob', {
  courseIdent: '4IT101',
  year: 2024,
  semester: 'ZS',
})

// Scraper processes job
export class ScraperRequestInSISCourseJob {
  async process(job: Job) {
    const { courseIdent, year, semester } = job.data

    // 1. Open browser, navigate to course page
    const page = await browser.newPage()
    await page.goto(`https://insis.vse.cz/...`)

    // 2. Extract data
    const courseData = await extractCourseData(page)

    // 3. Enqueue response
    await scraperResponseQueue.add('ScraperResponseInSISCourseJob', {
      courseData,
    })
  }
}
```

### Response Jobs (Sent by Scraper, Processed by API)

**Location:** `api/src/Jobs/`

- `ScraperResponseInSISCourseJob.ts` - Persist course to MySQL
- `ScraperResponseInSISStudyPlanJob.ts` - Persist study plan to MySQL

**Example:**

```typescript
export class ScraperResponseInSISCourseJob {
  async process(job: Job) {
    const { courseData } = job.data

    // 1. Validate data
    const validated = CourseSchema.parse(courseData)

    // 2. Upsert to database
    await db
      .insertInto('insis_courses')
      .values(validated)
      .onConflict((oc) => oc.column('ident').doUpdateSet(validated))
      .execute()
  }
}
```

### Job Routing

**API:** `ScraperResponseHandler.ts` routes response jobs by type

```typescript
export class ScraperResponseHandler {
  private jobs = new Map([
    ['ScraperResponseInSISCourseJob', new ScraperResponseInSISCourseJob()],
    ['ScraperResponseInSISStudyPlanJob', new ScraperResponseInSISStudyPlanJob()],
  ])

  async handle(job: Job) {
    const handler = this.jobs.get(job.name)
    if (!handler) throw new Error(`Unknown job: ${job.name}`)
    await handler.process(job)
  }
}
```

### Scheduled Jobs (Production Only)

**Location:** `api/src/Schedulers/`

- `ScraperInSISCatalogRequestScheduler.ts` - Daily at 1 AM in Jan, Feb, Aug, Sep
- `ScraperInSISStudyPlansRequestScheduler.ts` - Daily at 2 AM in Jan, Feb, Aug, Sep

---

## API Development

### Endpoints

**Base URL:** `http://localhost:40080`

#### Public Endpoints

- `GET /health` - Health check
- `POST /courses` - Fetch courses with filters
- `POST /study_plans` - Fetch study plans with filters

#### Command Endpoints (Require `API_COMMAND_TOKEN`)

- `POST /commands/run-insis-catalog-scraper` - Trigger catalog scraping
- `POST /commands/run-insis-course-scraper` - Trigger course scraping
- `POST /commands/run-insis-study-plan-scraper` - Trigger study plan scraping
- `POST /commands/run-insis-study-plans-scraper` - Trigger study plans scraping

### Testing with Bruno

**Location:** `api/bruno/Kreditozrouti/`

Bruno is an alternative to Postman with `.bru` files instead of JSON.

**Files:**
- `Health Check.bru`
- `Kreditožrouti/Courses.bru`
- `Kreditožrouti/Study Plans.bru`
- `Commands/Run InSIS Catalog Scraper.bru`

**To use:**
1. Download Bruno: https://www.usebruno.com/
2. Open collection: `api/bruno/Kreditozrouti/`
3. Run requests

### Adding a New Endpoint

1. **Create controller:** `api/src/Controllers/Kreditozrouti/NewController.ts`

```typescript
import { Request, Response } from 'express'
import { NewService } from '@api/Services/NewService'

export class NewController {
  static async handleRequest(req: Request, res: Response) {
    try {
      const result = await NewService.doSomething(req.body)
      res.json(result)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }
}
```

2. **Create service:** `api/src/Services/NewService.ts`

```typescript
export class NewService {
  static async doSomething(data: any) {
    // Business logic here
    return { success: true }
  }
}
```

3. **Register route:** `api/src/express.ts`

```typescript
import { NewController } from './Controllers/Kreditozrouti/NewController'

app.post('/new-endpoint', NewController.handleRequest)
```

4. **Test with Bruno:** Create `.bru` file in `api/bruno/Kreditozrouti/`

---

## Client Development

### Key Concepts

#### File-Based Routing

Routes are **auto-generated** from `/client/src/pages`:

- `pages/index.vue` → `/`
- `pages/courses.vue` → `/courses`
- `pages/about.vue` → `/about`
- `pages/[id].vue` → `/:id` (dynamic route)

**No need to manually configure routes!**

#### Pinia Stores

**Location:** `client/src/stores/`

- `wizard.store.ts` - Study plan wizard state (persisted)
- `courses.store.ts` - Course filtering & search (transient)
- `timetable.store.ts` - Selected units & scheduling (persisted)
- `ui.store.ts` - View mode & UI state (persisted)
- `alerts.store.ts` - Global notifications (transient)

**Usage:**

```typescript
import { useCoursesStore } from '@client/stores'

const coursesStore = useCoursesStore()

// Read state
console.log(coursesStore.courses)

// Call actions
await coursesStore.fetchCourses()
coursesStore.setTitle('Java')

// Computed getters
if (coursesStore.hasActiveFilters) {
  // ...
}
```

#### Composables

**Location:** `client/src/composables/`

Reusable composition functions:

- `useCourseLabels()` - Translation helpers
- `useTimetableGrid()` - Timetable rendering
- `useTimeUtils()` - Time formatting
- `useDebounce()` - Debounce function execution

**Usage:**

```vue
<script setup lang="ts">
import { useCourseLabels } from '@client/composables'

const { getFacultyLabel, getDayLabel } = useCourseLabels()

const facultyName = getFacultyLabel('FIS')
// → "Faculty of Informatics and Statistics"
</script>
```

#### Internationalization

**Location:** `client/src/locales/`

Translations for Czech (cs) and English (en).

**Usage:**

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
</script>

<template>
  <h1>{{ t('pages.courses.title') }}</h1>
  <button @click="locale = 'cs'">Čeština</button>
  <button @click="locale = 'en'">English</button>
</template>
```

### Adding a New Component

1. **Create component:** `client/src/components/category/ComponentName.vue`

```vue
<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  title: string
  count?: number
}

const props = withDefaults(defineProps<Props>(), {
  count: 0,
})

const isVisible = ref(true)
</script>

<template>
  <div v-if="isVisible" class="component-wrapper">
    <h2>{{ props.title }}</h2>
    <p>Count: {{ props.count }}</p>
  </div>
</template>
```

2. **Use in parent:**

```vue
<script setup lang="ts">
import ComponentName from '@client/components/category/ComponentName.vue'
</script>

<template>
  <ComponentName title="Hello" :count="42" />
</template>
```

### Adding Translations

1. **Add to English:** `client/src/locales/en.json`

```json
{
  "myFeature": {
    "title": "My Feature",
    "description": "This is my feature"
  }
}
```

2. **Add to Czech:** `client/src/locales/cs.json`

```json
{
  "myFeature": {
    "title": "Moje Funkce",
    "description": "Toto je má funkce"
  }
}
```

3. **Use in component:**

```vue
<template>
  <h1>{{ t('myFeature.title') }}</h1>
  <p>{{ t('myFeature.description') }}</p>
</template>
```

---

## Scraper Development

### Key Concepts

#### Puppeteer

Headless browser automation for JavaScript-heavy pages.

**Example:**

```typescript
import puppeteer from 'puppeteer'

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox'],
})

const page = await browser.newPage()
await page.goto('https://insis.vse.cz/...')

// Wait for selector
await page.waitForSelector('.course-title')

// Extract data
const title = await page.$eval('.course-title', el => el.textContent)

await browser.close()
```

#### Cheerio

HTML parsing for static pages (faster than Puppeteer).

**Example:**

```typescript
import * as cheerio from 'cheerio'

const html = await fetch('https://insis.vse.cz/...').then(r => r.text())
const $ = cheerio.load(html)

const title = $('.course-title').text()
const ects = parseInt($('.ects-value').text())
```

### Adding a New Scraping Job

1. **Create job:** `scraper/src/Jobs/ScraperRequestNewJob.ts`

```typescript
import { Job } from 'bullmq'

export class ScraperRequestNewJob {
  static jobName = 'ScraperRequestNewJob'

  async process(job: Job) {
    const { param1, param2 } = job.data

    // 1. Scrape data
    const data = await this.scrapeData(param1, param2)

    // 2. Enqueue response
    await scraperResponseQueue.add('ScraperResponseNewJob', { data })
  }

  private async scrapeData(param1: string, param2: number) {
    // Scraping logic here
    return { /* scraped data */ }
  }
}
```

2. **Register job:** `scraper/src/index.ts`

```typescript
import { ScraperRequestNewJob } from './Jobs/ScraperRequestNewJob'

worker.on('active', async (job) => {
  if (job.name === 'ScraperRequestNewJob') {
    await new ScraperRequestNewJob().process(job)
  }
})
```

3. **Create response handler:** `api/src/Jobs/ScraperResponseNewJob.ts`

```typescript
export class ScraperResponseNewJob {
  async process(job: Job) {
    const { data } = job.data

    // Persist to database
    await db.insertInto('new_table').values(data).execute()
  }
}
```

---

## Testing

### Current State

⚠️ **Unit tests are not yet implemented.** This is a high-priority item on the roadmap.

### Testing Strategy

When adding tests, follow this structure:

**API:**
- Unit tests for services
- Integration tests for endpoints
- Test with Bruno for manual testing

**Client:**
- Component tests with Vue Test Utils
- E2E tests with Playwright or Cypress
- Visual regression testing

**Scraper:**
- Mock Puppeteer for unit tests
- Test with real pages in staging

### Manual Testing

1. **Client:**
   - Run `make dev-client`
   - Open http://localhost:45173
   - Test user flows manually

2. **API:**
   - Run `make dev-api`
   - Use Bruno to test endpoints
   - Check MySQL data with phpMyAdmin

3. **Scraper:**
   - Run `make dev-scraper`
   - Trigger jobs via API commands
   - Check logs for errors

---

## Common Tasks

### Adding a New Filter to Courses

1. **Add to type:** `client/src/types/course.ts`

```typescript
interface CoursesFilter {
  // ... existing filters
  new_filter?: string[]
}
```

2. **Add to store:** `client/src/stores/courses.store.ts`

```typescript
const state = reactive<CoursesState>({
  filters: {
    // ... existing
    new_filter: [],
  },
})

function setNewFilter(values: string[]) {
  state.filters.new_filter = values
  fetchCourses()
}

return {
  // ...
  setNewFilter,
}
```

3. **Add to FilterPanel:** `client/src/components/filters/FilterPanel.vue`

```vue
<FilterCheckboxGroup
  label="New Filter"
  :options="coursesStore.facets.new_filter"
  :model-value="coursesStore.filters.new_filter"
  @update:model-value="coursesStore.setNewFilter"
/>
```

4. **Update API:** Support filter in `api/src/Services/CourseService.ts`

### Adding a Database Table

1. **Create migration:** `api/src/Database/migrations/0004_add_new_table.ts`

```typescript
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('new_table')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('new_table').execute()
}
```

2. **Update types:** `api/src/Database/types.ts`

```typescript
interface Database {
  // ... existing tables
  new_table: NewTable
}

interface NewTable {
  id: number
  name: string
}
```

3. **Restart API** to apply migration

### Changing InSIS Data Structure

1. **Update scraper extraction logic**
2. **Update database schema (create migration)**
3. **Update API response types**
4. **Update client types**
5. **Update UI components**

---

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port
lsof -i :45173
lsof -i :40080

# Kill process
kill -9 <PID>
```

#### Docker Containers Won't Start

```bash
# Check logs
docker compose -f docker-compose.local.yml logs

# Restart containers
make stop-local-docker
make run-local-docker

# Remove volumes and restart
docker compose -f docker-compose.local.yml down -v
make run-local-docker
```

#### Puppeteer/Chrome Not Installing

```bash
# Manually install Chrome
cd scraper
pnpm run postinstall

# Or use system Chrome
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
```

#### Database Migration Errors

```bash
# Check migration files for syntax errors
# Ensure migrations are numbered correctly (0001, 0002, ...)
# Check MySQL logs in Docker
docker compose -f docker-compose.local.yml logs mysql
```

#### TypeScript Errors After Pull

```bash
# Reinstall dependencies
make install

# Clear build cache
rm -rf */node_modules */dist
make install
```

#### Redis Connection Issues

```bash
# Check Redis is running
docker ps | grep redis

# Clear Redis data
make clear-redis

# Restart Redis
docker compose -f docker-compose.local.yml restart redis
```

### Debug Mode

**API:**
```bash
cd api
DEBUG=* pnpm run dev
```

**Client:**
```bash
cd client
VITE_DEBUG=true pnpm run dev
```

### Logs Location

- **API logs:** Console output
- **Scraper logs:** Console output
- **MySQL logs:** Docker logs
- **Redis logs:** Docker logs

---

## Documentation

### Comprehensive Guides

| Document | Purpose |
|----------|---------|
| [README.md](../README.md) | Project overview, quick start, contributing |
| [docs/API.md](../docs/API.md) | API architecture, endpoints, services, BullMQ jobs |
| [docs/CLIENT.md](../docs/CLIENT.md) | Client architecture, components, stores, composables |
| [docs/SCRAPER.md](../docs/SCRAPER.md) | Scraper implementation, jobs, InSIS interaction |
| [docs/SCRIPTS.md](../docs/SCRIPTS.md) | Utility scripts and automation tools |
| [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) | Production deployment guide and configuration |

### Quick Reference

- **Setup:** [Quick Start](#quick-start)
- **Commands:** [Development Commands](#development-commands)
- **Architecture:** [Architecture](#architecture)
- **Database:** [Database & Migrations](#database--migrations)
- **Job Queue:** [BullMQ Job System](#bullmq-job-system)
- **API:** [API Development](#api-development)
- **Client:** [Client Development](#client-development)
- **Scraper:** [Scraper Development](#scraper-development)

---

## Important Gotchas

### 1. Cross-Project Imports

✅ **Allowed:** Client and API can import types from each other

```typescript
// Client importing API types
import type { Course } from '@api/Database/types'

// API importing Scraper types
import type { ScraperJobData } from '@scraper/types'
```

❌ **Not Allowed:** Importing runtime code across projects

### 2. Time Storage Format

Times are stored as **minutes since midnight** (0-1439):

```typescript
// 9:00 AM = 540 minutes
// 10:30 AM = 630 minutes
// 5:45 PM = 1065 minutes

// Conversion helper
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}
```

### 3. Kysely is NOT an ORM

- No auto-migrations
- No model definitions
- No relationship tracking
- Manual schema management

**You must create migrations manually!**

### 4. File-Based Routing

Routes are generated from `/client/src/pages`:

- File changes auto-update routes
- No need to configure routes manually
- Use kebab-case for file names
- Dynamic routes: `[id].vue`

### 5. Puppeteer Installation

First install may take 5-10 minutes to download Chrome:

```bash
cd scraper
pnpm install
# Downloads Chromium (~300MB)
```

### 6. Session Management

Sessions stored in Redis, not memory:

- Sessions persist across API restarts
- Clear Redis to reset sessions
- Session secret in `.env`

### 7. InSIS Rate Limiting

**Respect InSIS limits:**
- Max 1 request per second
- Use delays between requests
- Handle 429 errors gracefully
- Cache aggressively

### 8. LocalStorage Persistence

Client stores persist to LocalStorage:

- `wizard` - Study plan selections
- `timetable` - Selected course units
- `ui` - View mode preferences

**Clear browser storage to reset!**

### 9. Environment Variables

Different prefixes for each service:

- API: `API_*`
- Client: `VITE_*`
- Scraper: No prefix
- Shared: `MYSQL_*`, `REDIS_*`

### 10. Scheduled Jobs

Scheduled jobs only run in **production** (`NODE_ENV=production`):

- `ScraperInSISCatalogRequestScheduler` - 1 AM
- `ScraperInSISStudyPlansRequestScheduler` - 2 AM

In development, trigger manually via `/commands/*` endpoints.

---

## Final Notes

### Key Principles

1. **Student-First:** Prioritize usability and UX
2. **Data Accuracy:** Validate all scraped data
3. **Performance:** Optimize for speed (caching, indexing)
4. **Maintainability:** Write clean, documented code
5. **Type Safety:** Use TypeScript everywhere

### Getting Help

- **Documentation:** Check `docs/` folder first
- **Issues:** Search GitHub issues
- **Code Examples:** Look at existing similar code
- **Ask Questions:** Create GitHub discussion

### Contributing

See [README.md](../README.md#-contributing) for full contributing guide.

**Quick tips:**
- Follow existing patterns
- Keep PRs focused and small
- Update documentation
- Use conventional commits
- Run linter and formatter

---

**Happy coding! 🚀**

*Last updated: 2026-02-01*
