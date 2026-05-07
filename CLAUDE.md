# CLAUDE.md

**Comprehensive guidance for Claude Code agents when working with the Kreditožrouti codebase.**

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
13. [Campus Conflict Detection](#campus-conflict-detection)
14. [Scraper Development](#scraper-development)
15. [Testing](#testing)
16. [Common Tasks](#common-tasks)
17. [Troubleshooting](#troubleshooting)
18. [Documentation](#documentation)
19. [Important Gotchas](#important-gotchas)

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

- Advanced filtering with 10+ criteria
- Real-time timetable preview with drag-and-drop
- Automatic conflict detection (hard overlap + campus travel-time)
- Study plan-aware course suggestions
- Mobile-responsive interface
- Full Czech and English support

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
make clear-redis          # Flush Redis database (deletes all Redis data)

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

### Client Store Architecture

The client uses a layered Pinia store architecture with strict separation of concerns:

```
┌──────────────────────────────────────────────────────────┐
│ wizard.store          Navigation + persistence only       │
│ wizard-data.store     Remote API data for wizard          │
│ completed-courses.store  Completed idents + wizard UI     │
├──────────────────────────────────────────────────────────┤
│ filters.store         SINGLE source of truth for filters  │
│ courses.store         Results, pagination, expansion      │
├──────────────────────────────────────────────────────────┤
│ timetable.store       Selected units, conflict detection  │
│ drag.store            Drag-selection state                │
│ ui.store              viewMode, sidebar, legend           │
│ alerts.store          Global alert queue                  │
└──────────────────────────────────────────────────────────┘
```

**Key invariant:** `courses.store` does NOT own filter state and has NO proxy setters. All filter mutations go through `filters.store`. `timetable.store` does NOT import `courses.store` (cycle broken by snapshotting course data at `addUnit` time).

### Service Responsibilities

**Client (Vue 3 SPA):**
- User interface and interactions
- State management (Pinia, layered by responsibility)
- Route handling (file-based via `unplugin-vue-router`)
- LocalStorage persistence (wizard, timetable, UI)
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
│   │   │   ├── Commands/             # Command endpoints (trigger scraping)
│   │   │   └── Kreditozrouti/        # Course and study plan controllers
│   │   ├── Services/                 # Business logic layer
│   │   │   ├── CourseService.ts      # Course operations
│   │   │   ├── StudyPlanService.ts   # Study plan operations
│   │   │   ├── InSISService.ts       # InSIS integration
│   │   │   ├── DateService.ts        # Date utilities
│   │   │   └── SQLService.ts         # Database utilities
│   │   ├── Database/                 # Database layer
│   │   │   ├── migrations/           # Schema migrations
│   │   │   └── types/                # Generated DB types (per-table files)
│   │   ├── Jobs/                     # BullMQ response handlers
│   │   │   ├── ScraperResponseInSISCourseJob.ts
│   │   │   └── ScraperResponseInSISStudyPlanJob.ts
│   │   ├── Handlers/                 # Job routing logic
│   │   │   └── ScraperResponseHandler.ts
│   │   ├── Schedulers/               # Scheduled jobs
│   │   │   ├── ScraperInSISCatalogRequestScheduler.ts
│   │   │   └── ScraperInSISStudyPlansRequestScheduler.ts
│   │   ├── Routes/                   # Express route definitions
│   │   ├── Validations/              # Zod schemas
│   │   ├── bullmq.ts                 # BullMQ configuration
│   │   ├── app.ts                    # Express app setup
│   │   └── index.ts                  # Entry point
│   ├── bruno/                        # API testing (Bruno)
│   │   └── Kreditozrouti/            # Test collection
│   ├── package.json
│   └── tsconfig.json
│
├── client/                           # Vue 3 SPA
│   ├── src/
│   │   ├── pages/                    # File-based routes
│   │   │   ├── index.vue             # Landing page / wizard (/)
│   │   │   └── courses.vue           # Main app (/courses)
│   │   ├── components/               # Vue components
│   │   │   ├── alert/                # Global alerts (Alert.vue, Alerts.vue)
│   │   │   ├── common/               # Shared components
│   │   │   │   ├── CollapsibleSection.vue  # Reusable chevron-toggle collapsible
│   │   │   │   ├── LanguageSwitcher.vue
│   │   │   │   └── AppFooter.vue
│   │   │   ├── courses/              # Course listing
│   │   │   │   ├── CoursesHeader.vue # App header (logo, plan info, action buttons)
│   │   │   │   ├── CourseTable.vue   # Course list with conflict tags
│   │   │   │   ├── CourseInfo.vue
│   │   │   │   ├── CourseRowExpanded.vue
│   │   │   │   ├── CourseStatusSummary.vue
│   │   │   │   └── UnitSelector.vue  # Campus-conflict alert banner
│   │   │   ├── filters/              # Filter panel
│   │   │   │   ├── FilterPanel.vue
│   │   │   │   ├── FilterCheckboxGroup.vue
│   │   │   │   ├── FilterTimeRange.vue
│   │   │   │   ├── FilterToggle.vue
│   │   │   │   └── CourseStatusFilter.vue
│   │   │   ├── timetable/            # Timetable grid
│   │   │   │   ├── TimetableGrid.vue
│   │   │   │   ├── TimetableCourseBlock.vue  # Orange ring for campus conflict
│   │   │   │   ├── TimetableCourseModal.vue
│   │   │   │   └── TimetableDragPopover.vue
│   │   │   └── wizard/               # Study plan wizard
│   │   │       ├── StudyPlanWizard.vue
│   │   │       ├── WizardStepFaculty.vue
│   │   │       ├── WizardStepYear.vue
│   │   │       ├── WizardStepStudyPlan.vue
│   │   │       ├── WizardStepCompletedCourses.vue  # Debounced search
│   │   │       └── WizardSteps.vue
│   │   ├── stores/                   # Pinia stores
│   │   │   ├── wizard.store.ts           # Navigation + persistence ONLY
│   │   │   ├── wizard-data.store.ts      # Remote data for wizard (NEW)
│   │   │   ├── completed-courses.store.ts # completedCourseIdents + wizard UI (NEW)
│   │   │   ├── courses.store.ts          # Results, pagination, expansion (NO proxy setters)
│   │   │   ├── filters.store.ts          # SINGLE source of truth for all filter state
│   │   │   ├── timetable.store.ts        # Selected units, conflict detection, persistence
│   │   │   ├── drag.store.ts             # Drag selection state
│   │   │   ├── ui.store.ts               # viewMode, sidebar, legend
│   │   │   ├── alerts.store.ts           # Global notification queue
│   │   │   └── index.ts                  # Re-exports all stores
│   │   ├── composables/              # Composition utilities
│   │   │   ├── useCourseLabels.ts    # Translation helpers
│   │   │   ├── useTimetableGrid.ts   # Timetable rendering logic
│   │   │   ├── useSlotMerging.ts     # Merge one-time slots (NEW)
│   │   │   ├── useTimetableDrag.ts   # Drag mouse handlers + lifecycle (NEW)
│   │   │   ├── useTimeUtils.ts       # Time formatting
│   │   │   ├── useDebounce.ts        # Debounce utility
│   │   │   ├── useClickOutside.ts
│   │   │   ├── usePopover.ts
│   │   │   ├── useFacetFiltering.ts
│   │   │   ├── useSlotFormatting.ts
│   │   │   ├── useSlotSorting.ts
│   │   │   ├── useCourseStatusFilter.ts
│   │   │   ├── useCourseUnitSelection.ts
│   │   │   ├── useScheduleSummary.ts
│   │   │   ├── useTimeFilterMatching.ts
│   │   │   └── index.ts              # Re-exports
│   │   ├── utils/                    # Pure utility functions
│   │   │   ├── timetable.ts          # unitsConflict, unitsCampusConflict, checkCourseCompleteness, getCampus, Campus type, CAMPUS_TRAVEL_MINUTES
│   │   │   ├── course.ts             # getSlotType, getUnitTypeColorClass, getCategoryBadgeClass (NEW)
│   │   │   ├── day.ts                # getSlotDay, getDayFromDate, getDayIndex, etc.
│   │   │   ├── localstorage.ts       # loadFromStorage, saveToStorage, removeFromStorage
│   │   │   ├── tailwind.ts
│   │   │   └── pluralization.ts
│   │   ├── types/                    # TypeScript types
│   │   │   ├── course.ts             # CourseStatus (campus-conflict), SlotConflictInfo, SelectedCourseUnit
│   │   │   ├── timetable.ts          # DragSelection, PersistedTimetableState
│   │   │   ├── wizard.ts
│   │   │   ├── alert.ts
│   │   │   ├── api.ts
│   │   │   ├── ui.ts
│   │   │   ├── view.ts
│   │   │   └── index.ts
│   │   ├── locales/                  # i18n translations
│   │   │   ├── en.json               # English
│   │   │   └── cs.json               # Czech
│   │   ├── styles/                   # CSS files
│   │   │   └── insis.css             # InSIS design system
│   │   ├── constants/                # App constants
│   │   ├── services/                 # API service functions (axios wrappers)
│   │   ├── api.ts                    # Axios instance
│   │   ├── App.vue                   # Root component
│   │   ├── index.ts                  # App initialization + bootstrap
│   │   └── index.css                 # Global styles
│   ├── public/                       # Static assets
│   │   ├── logo/
│   │   ├── favicon/
│   │   └── compliance/
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── scraper/                          # Puppeteer scraper
│   ├── src/
│   │   ├── Jobs/
│   │   │   ├── ScraperRequestInSISCourseJob.ts
│   │   │   ├── ScraperRequestInSISStudyPlanJob.ts
│   │   │   ├── ScraperRequestInSISStudyPlansJob.ts
│   │   │   └── ScraperRequestInSISCatalogJob.ts
│   │   ├── Services/
│   │   │   ├── ExtractInSISCourseService.ts
│   │   │   ├── ExtractInSISStudyPlanService.ts
│   │   │   └── InSISQueueService.ts
│   │   ├── bullmq.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── docs/                             # Documentation
│   ├── API.md
│   ├── CLIENT.md
│   ├── SCRAPER.md
│   ├── SCRIPTS.md
│   ├── DEPLOYMENT.md
│   └── compliance/
│
├── docker-compose.local.yml          # Local development
├── docker-compose.yml                # Production deployment
├── Makefile
├── .env.example
├── README.md
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
// Good
interface CourseFilter {
  faculty_ids?: string[]
  levels?: string[]
  title?: string
}

export function filterCourses(filters: CourseFilter): Promise<Course[]> {
  // ...
}

// Bad
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
- **Files:** kebab-case for pages, camelCase for TS files
- **Functions:** camelCase (e.g., `fetchCourses`)
- **Constants:** SCREAMING_SNAKE_CASE (e.g., `CAMPUS_TRAVEL_MINUTES`)
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
// Types defined in api/src/Database/types/
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

**Existing migrations:**
- `0001_insis_faculties.ts`
- `0002_insis_courses.ts`
- `0003_insis_study_plans.ts`
- `20260122151133_insis_courses_unit_id.ts`
- `20260127185356_insis_indexes.ts`

**To create a new migration:**

1. **Create file** in `api/src/Database/migrations/` using a timestamp or sequential prefix

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
  .values({ ident: '4IT101', title_cs: 'Programování v Javě', ects: 6 })
  .execute()

// Update
await db
  .updateTable('insis_courses')
  .set({ ects: 7 })
  .where('ident', '=', '4IT101')
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

### Response Jobs (Sent by Scraper, Processed by API)

**Location:** `api/src/Jobs/`

- `ScraperResponseInSISCourseJob.ts` - Persist course to MySQL
- `ScraperResponseInSISStudyPlanJob.ts` - Persist study plan to MySQL

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
- `POST /study_plan_courses` - Fetch courses for given study plan IDs

#### Command Endpoints (Require `API_COMMAND_TOKEN`)

- `POST /commands/run-insis-catalog-scraper` - Trigger catalog scraping
- `POST /commands/run-insis-course-scraper` - Trigger course scraping
- `POST /commands/run-insis-study-plan-scraper` - Trigger study plan scraping
- `POST /commands/run-insis-study-plans-scraper` - Trigger study plans scraping

### Testing with Bruno

**Location:** `api/bruno/Kreditozrouti/`

Bruno is an alternative to Postman with `.bru` files instead of JSON.

**To use:**
1. Download Bruno: https://www.usebruno.com/
2. Open collection: `api/bruno/Kreditozrouti/`
3. Run requests

### Adding a New Endpoint

1. **Create controller:** `api/src/Controllers/Kreditozrouti/NewController.ts`
2. **Create service:** `api/src/Services/NewService.ts`
3. **Register route:** `api/src/Routes/KreditozroutiRoutes.ts`
4. **Test with Bruno**

---

## Client Development

### Key Concepts

#### File-Based Routing

Routes are **auto-generated** from `/client/src/pages`:

- `pages/index.vue` → `/`
- `pages/courses.vue` → `/courses`

No need to manually configure routes.

#### Pinia Stores

**Location:** `client/src/stores/`

All stores are re-exported from `stores/index.ts`. Import from there:

```typescript
import { useCoursesStore, useFiltersStore, useTimetableStore } from '@client/stores'
```

**Store responsibilities:**

| Store | Owns | Persisted |
|-------|------|-----------|
| `wizard.store.ts` | currentStep, facultyId, year, semester, selectedStudyPlans, completed | Yes (STORAGE_KEYS.WIZARD) |
| `wizard-data.store.ts` | facultyFacets, yearFacets, levelFacets, studyPlans, studyPlanCourses, loading, error | No (transient) |
| `completed-courses.store.ts` | completedCourseIdents, wizard search/filter UI state, category-grouped computeds | Yes (alongside wizard) |
| `courses.store.ts` | courses, facets, pagination (limit/offset/count/total), loading, error, expandedCourseIds | No (transient) |
| `filters.store.ts` | ALL filter state (CoursesFilter), hideConflictingCourses, timetableExcludeTimes | No (transient) |
| `timetable.store.ts` | selectedUnits, conflict/campus-conflict detection, ECTS | Yes (STORAGE_KEYS.TIMETABLE) |
| `drag.store.ts` | dragSelection, showDragPopover, dragPopoverPosition | No (transient) |
| `ui.store.ts` | viewMode, sidebarCollapsed, showLegend | Yes (STORAGE_KEYS.UI) |
| `alerts.store.ts` | alert queue | No (transient) |

**Usage example:**

```typescript
import { useCoursesStore, useFiltersStore } from '@client/stores'

const coursesStore = useCoursesStore()
const filtersStore = useFiltersStore()

// Set a filter (goes through filtersStore, NOT coursesStore)
filtersStore.setFilter('faculty_ids', ['FIS'])

// Fetch with current filters
await coursesStore.fetchCourses()

// Pagination
coursesStore.nextPage()
```

#### Composables

**Location:** `client/src/composables/`

| Composable | Purpose |
|-----------|---------|
| `useCourseLabels` | Translation helpers for faculty, semester, day labels |
| `useTimetableGrid` | Timetable column/row rendering logic |
| `useSlotMerging` | Merge one-time (date-specific) slots that fall on the same weekday |
| `useTimetableDrag` | Drag mouse handlers + global listener lifecycle (extracted from TimetableGrid) |
| `useTimeUtils` | Time formatting (minutes-since-midnight to HH:MM) |
| `useDebounce` | Debounce function execution |
| `useClickOutside` | Click-outside detection |
| `usePopover` | Popover positioning |
| `useFacetFiltering` | Facet checkbox filtering logic |
| `useSlotFormatting` | Format slot time/location strings |
| `useSlotSorting` | Sort slots by day/time |
| `useCourseStatusFilter` | Filter courses by timetable status |
| `useCourseUnitSelection` | Unit add/remove/change logic |
| `useScheduleSummary` | ECTS and conflict summary |
| `useTimeFilterMatching` | Match course slots against time filter selections |

**Usage:**

```vue
<script setup lang="ts">
import { useSlotMerging } from '@client/composables'
import { useTimetableStore } from '@client/stores'
import { toRef } from 'vue'

const timetableStore = useTimetableStore()
const { mergedUnitsByDay } = useSlotMerging(toRef(() => timetableStore.unitsByDay))
</script>
```

#### Utilities

**Location:** `client/src/utils/`

| File | Exports |
|------|---------|
| `timetable.ts` | `unitsConflict`, `unitsCampusConflict`, `checkCourseCompleteness`, `getCampus`, `Campus` type, `CAMPUS_TRAVEL_MINUTES` |
| `course.ts` | `getSlotType`, `getUnitTypeColorClass`, `getCategoryBadgeClass` — no i18n dependency, safe to import from stores |
| `day.ts` | `getSlotDay` (single source of truth for effective slot day), `getDayFromDate`, `getDayIndex`, `parseDateString`, `compareDateStrings` |
| `localstorage.ts` | `loadFromStorage`, `saveToStorage`, `removeFromStorage` |
| `tailwind.ts` | Tailwind class utilities |
| `pluralization.ts` | Czech pluralization rules, datetime/number formats |

#### Internationalization

**Location:** `client/src/locales/`

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t, locale } = useI18n()
</script>

<template>
  <h1>{{ t('pages.courses.title') }}</h1>
</template>
```

Always add new strings to both `en.json` and `cs.json`.

#### Bootstrap Order

`client/src/index.ts` initializes stores in this order:

```typescript
useAlertsStore()
useCoursesStore()
useTimetableStore().hydrate()
useUIStore().hydrate()       // hydrate() IS called — fixes a prior bug
useWizardStore().hydrate()
```

---

## Campus Conflict Detection

### Overview

Campus conflicts detect when two selected courses are on different VŠE campuses with insufficient travel time between them. Unlike hard time overlaps (which are "conflict" / red), campus conflicts are "campus-conflict" (orange/amber).

### Campus Identification

**Location:** `client/src/utils/timetable.ts`

VŠE has two campuses identified by room location prefixes:

| Campus | Prefixes | Examples |
|--------|----------|---------|
| Jižní Město | `JM` | `JM.28`, `JM-A101` |
| Žižkov | `RB`, `NB`, `IB`, `SB` | `NB.169`, `RB.209` |

If a location does not match any prefix, it resolves to `'unknown'` and no campus conflict is reported (conservative approach).

```typescript
export type Campus = 'jizni-mesto' | 'zizkov' | 'unknown'
export const CAMPUS_TRAVEL_MINUTES = 40

export function getCampus(location: string | null | undefined): Campus { ... }
```

### Detection Logic

```typescript
export function unitsCampusConflict(a: SelectedCourseUnit, b: SelectedCourseUnit): boolean
```

A campus conflict is triggered when ALL of the following are true:
1. Both units are on the same day
2. They do NOT already have a hard time overlap (`unitsConflict` returns false)
3. Both locations resolve to known but DIFFERENT campuses
4. The gap between them (end of earlier unit to start of later unit) is `>= 0` and `< CAMPUS_TRAVEL_MINUTES` (40 min)

### Conflict Priority

In `timetable.store.ts`, `courseStatuses` applies this priority:

```
hard conflict > campus-conflict > incomplete > selected
```

### Visual Representation

| Status | Color | Where shown |
|--------|-------|------------|
| `conflict` | Red | TimetableCourseBlock ring, CourseTable tag, UnitSelector |
| `campus-conflict` | Orange/Amber | TimetableCourseBlock ring, CourseTable amber tag, UnitSelector alert with MapPin icon |
| `incomplete` | Yellow/warning | CourseStatusSummary |
| `selected` | Default | Normal |

### CourseStatus Type

```typescript
export interface CourseStatus {
  id: number
  ident: string
  title: string
  titleCs: string
  titleEn: string
  status: 'selected' | 'conflict' | 'campus-conflict' | 'incomplete'
  conflictsWith: string[]       // course idents with hard overlap
  campusConflictsWith: string[] // course idents with campus travel conflict
  missingTypes: CourseUnitType[]
}
```

### Extending Campus Detection

To add a new campus or building prefix:

1. Open `client/src/utils/timetable.ts`
2. Add to `JM_PREFIXES` or `ZIZKOV_PREFIXES` arrays, or add a new campus type to the `Campus` union
3. Update the `getCampus` function to return the new campus identifier
4. The conflict detection logic in `unitsCampusConflict` will automatically pick it up
5. Update i18n strings in `en.json` / `cs.json` if the campus name appears in UI text

To change the travel time threshold, update `CAMPUS_TRAVEL_MINUTES` in `utils/timetable.ts`.

---

## Scraper Development

### Key Concepts

#### Puppeteer

Headless browser automation for JavaScript-heavy pages.

```typescript
import puppeteer from 'puppeteer'

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.goto('https://insis.vse.cz/...')
await page.waitForSelector('.course-title')
const title = await page.$eval('.course-title', el => el.textContent)
await browser.close()
```

#### Cheerio

HTML parsing for static pages (faster than Puppeteer).

```typescript
import * as cheerio from 'cheerio'

const html = await fetch('https://insis.vse.cz/...').then(r => r.text())
const $ = cheerio.load(html)
const title = $('.course-title').text()
```

### Adding a New Scraping Job

1. **Create job:** `scraper/src/Jobs/ScraperRequestNewJob.ts`
2. **Register in scraper worker:** `scraper/src/index.ts`
3. **Create response handler:** `api/src/Jobs/ScraperResponseNewJob.ts`
4. **Register in handler map:** `api/src/Handlers/ScraperResponseHandler.ts`

---

## Testing

### Current State

Unit tests are not yet implemented. This is a high-priority item on the roadmap.

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

### Adding a New Filter

Filters live exclusively in `filters.store.ts`. Components import `useFiltersStore` directly — do NOT add proxy setters to `courses.store.ts`.

1. **Add to API validation:** `api/src/Validations/CoursesFilterValidation.ts`

2. **Add to `createDefaultFilters` in `filters.store.ts`:**

```typescript
function createDefaultFilters(): CoursesFilter {
  return {
    // ... existing
    new_filter: [],
  }
}
```

3. **No setter needed for simple cases** — use `filtersStore.setFilter('new_filter', value)` directly in components. Add a dedicated setter only if the filter needs special logic (e.g., resetting offset, merging with other state).

4. **Add to FilterPanel component:** `client/src/components/filters/FilterPanel.vue`

```vue
<script setup lang="ts">
import { useFiltersStore } from '@client/stores'
const filtersStore = useFiltersStore()
</script>

<template>
  <FilterCheckboxGroup
    label="New Filter"
    :options="coursesStore.facets.new_filter"
    :model-value="filtersStore.filters.new_filter"
    @update:model-value="filtersStore.setFilter('new_filter', $event)"
  />
</template>
```

5. **Update `courses.store.fetchCourses`** to pass the new filter field to the API payload if needed.

### Adding a Database Table

1. **Create migration:** `api/src/Database/migrations/YYYYMMDDHHMMSS_add_new_table.ts`
2. **Update types:** `api/src/Database/types/` (add new type file + export from `index.ts`)
3. **Restart API** to apply migration

### Changing InSIS Data Structure

1. Update scraper extraction logic
2. Update database schema (create migration)
3. Update API response types
4. Update client types
5. Update UI components

---

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
lsof -i :45173
lsof -i :40080
kill -9 <PID>
```

#### Docker Containers Won't Start

```bash
docker compose -f docker-compose.local.yml logs
make stop-local-docker
make run-local-docker
```

#### Puppeteer/Chrome Not Installing

```bash
cd scraper
pnpm run postinstall
# Or use system Chrome
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
```

#### Database Migration Errors

```bash
# Check migration files for syntax errors
# Ensure migration names don't conflict
docker compose -f docker-compose.local.yml logs mysql
```

#### TypeScript Errors After Pull

```bash
make install
rm -rf */node_modules */dist
make install
```

#### Redis Connection Issues

```bash
docker ps | grep redis
make clear-redis
docker compose -f docker-compose.local.yml restart redis
```

---

## Documentation

| Document | Purpose |
|----------|---------|
| [README.md](README.md) | Project overview, quick start, contributing |
| [docs/API.md](docs/API.md) | API architecture, endpoints, services, BullMQ jobs |
| [docs/CLIENT.md](docs/CLIENT.md) | Client architecture, components, stores, composables |
| [docs/SCRAPER.md](docs/SCRAPER.md) | Scraper implementation, jobs, InSIS interaction |
| [docs/SCRIPTS.md](docs/SCRIPTS.md) | Utility scripts and automation tools |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deployment guide and configuration |

---

## Important Gotchas

### 1. filters.store is the Single Source of Truth for Filters

`courses.store` does NOT own filter state. All filter reads and writes go through `useFiltersStore()`. Components import `useFiltersStore` directly — there are no proxy setters in `courses.store`.

```typescript
// Correct
const filtersStore = useFiltersStore()
filtersStore.setFilter('faculty_ids', ['FIS'])

// Wrong — courses.store has no setFacultyIds or similar
const coursesStore = useCoursesStore()
coursesStore.setFacultyIds(['FIS']) // does not exist
```

### 2. timetable.store Does Not Import courses.store

The import cycle was broken by snapshotting course data at `addUnit` time. Each `SelectedCourseUnit` stores `snapshotAvailableTypes` so `checkCourseCompleteness` never needs to look up the full course from `courses.store`.

Do not re-introduce a `useCoursesStore()` call inside `timetable.store`.

### 3. wizard.store is Navigation-Only

`wizard.store` manages only: `currentStep`, `facultyId`, `year`, `semester`, `selectedStudyPlans`, `completed`, and navigation actions. Remote data lives in `wizard-data.store`. Completed course idents live in `completed-courses.store`.

### 4. Campus Conflict vs Hard Conflict

- **Hard conflict** (`'conflict'`): Two selected slots overlap in time. Shown in red.
- **Campus conflict** (`'campus-conflict'`): Slots don't overlap but are on different campuses with < 40 min gap. Shown in orange.
- Unknown locations never trigger campus conflicts (conservative).
- Detection logic is in `client/src/utils/timetable.ts` — pure functions, no store dependency.

### 5. UIStore.hydrate() Must Be Called on Bootstrap

`useUIStore().hydrate()` is called in `client/src/index.ts` during app initialization. Without this, persisted `viewMode` and `sidebarCollapsed` are ignored. Do not remove this call.

### 6. Time Storage Format

Times are stored as **minutes since midnight** (0-1439):

```typescript
// 9:00 AM = 540
// 10:30 AM = 630
// 5:45 PM = 1065

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

### 7. Kysely is NOT an ORM

- No auto-migrations
- No model definitions
- No relationship tracking
- Manual schema management required

### 8. File-Based Routing

Routes are generated from `/client/src/pages`. No manual route config needed.

### 9. Puppeteer Installation

First install may take 5-10 minutes to download Chromium (~300MB):

```bash
cd scraper && pnpm install
```

### 10. LocalStorage Persistence

Client stores that persist to LocalStorage:

- `wizard` key — wizard selections + completedCourseIdents (written by both `wizard.store` and `completed-courses.store`)
- `timetable` key — selected course units
- `ui` key — view mode preferences

Clear browser storage to fully reset the app.

### 11. Environment Variables

Different prefixes for each service:

- API: `API_*`
- Client: `VITE_*`
- Scraper: no prefix
- Shared: `MYSQL_*`, `REDIS_*`

### 12. Scheduled Jobs

Scheduled jobs only run in **production** (`NODE_ENV=production`). In development, trigger manually via `/commands/*` endpoints.

### 13. WizardStepCompletedCourses Search is Debounced

The search input in the completed-courses wizard step uses debouncing. If adding similar search inputs elsewhere in the wizard, follow the same pattern with `useDebounce`.

### 14. Destructive Buttons Use Hover-Red Styling

"Clear timetable" and "Change plan" buttons in `CoursesHeader.vue` use the class pattern:

```
insis-btn insis-btn-secondary hover:bg-red-500 hover:text-white hover:border-red-500
```

Apply the same pattern to any other destructive/irreversible action buttons.

### 15. useSlotMerging and useTimetableDrag are Extracted Composables

These were extracted from `TimetableGrid.vue` for testability:

- `useSlotMerging(unitsByDay)` — pure data transform, no store access
- `useTimetableDrag(gridRef, getTimeFromX)` — registers/cleans up global `mousemove`/`mouseup` listeners via `onMounted`/`onUnmounted`

---

**Happy coding!**

*Last updated: 2026-05-07*
