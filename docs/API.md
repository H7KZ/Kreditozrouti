# API Documentation

Comprehensive documentation for the Kreditozrouti API service.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Directory Structure](#directory-structure)
- [Routes & Endpoints](#routes--endpoints)
- [Controllers](#controllers)
- [Services](#services)
- [Database](#database)
- [BullMQ Jobs](#bullmq-jobs)
- [Middleware](#middleware)
- [Configuration](#configuration)
- [Validation](#validation)
- [Error Handling](#error-handling)
- [Caching Strategy](#caching-strategy)
- [Security](#security)
- [Performance](#performance)

---

## Overview

The API is an Express.js backend service that provides course and study plan data scraped from InSIS. It uses Kysely for type-safe database queries, BullMQ for job queue management, and Redis for caching and session storage.

**Key Features:**
- Advanced filtering with cross-filtering facets
- Optimized query patterns (batch loading + in-memory merging)
- Redis caching with 5-minute TTL
- BullMQ integration for async scraping
- Type-safe database operations via Kysely
- Zod-based request validation
- Production-ready error handling and logging

**Tech Stack:**
- Express 5
- Kysely (MySQL query builder)
- BullMQ (job queue)
- Redis (cache + session store)
- Zod (validation)
- Pino (logging)
- Sentry (error tracking)

---

## Architecture

### Request Flow

```
CLIENT
  ↓
EXPRESS ROUTES (Kreditozrouti, Commands)
  ↓
MIDDLEWARE (Parser, Logger, Auth)
  ↓
CONTROLLERS (Courses, StudyPlans, Commands)
  ↓
SERVICES (CourseService, StudyPlanService)
  ↓
KYSELY QUERIES → REDIS CACHE
  ↓
MYSQL DATABASE
```

### Job Processing Flow

```
CONTROLLER (enqueue scraping request)
  ↓
SCRAPER REQUEST QUEUE → Scraper service processes
  ↓
SCRAPER RESPONSE QUEUE → API worker processes
  ↓
RESPONSE HANDLERS (ScraperResponseInSISCourseJob, etc.)
  ↓
MYSQL DATABASE (persist scraped data)
```

### Query Optimization Pattern

All list endpoints use this pattern to avoid N+1 queries:

1. **Count Query** - Get total matching records
2. **Paginated ID Query** - Get only IDs for current page
3. **Parallel Relation Loads** - Load courses, faculties, units, etc. in parallel
4. **In-Memory Merge** - Combine results using FIELD() ordering
5. **Facet Computation** - Parallel queries for filter options

Result: Maximum 4-5 queries per request, regardless of page size.

---

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10.20.0+
- MySQL 8+
- Redis 7+

### Installation

```bash
cd api
pnpm install
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Required
REDIS_URI=redis://127.0.0.1:46379
MYSQL_URI=mysql://root:root@127.0.0.1:43306/kreditozrouti

# Optional
ENV=local
API_PORT=40080
API_URI=http://localhost:40080
API_ALLOWED_ORIGINS=http://localhost:45173
API_SESSION_SECRET=your-secret-key
API_COMMAND_TOKEN=your-admin-token
```

### Running

```bash
# Development mode (single worker)
pnpm run dev

# Development with 4 workers (cluster mode)
pnpm run dev 4

# Build
pnpm run build

# Production
pnpm run preview
```

### Testing with Bruno

API tests are in `/api/bruno/Kreditozrouti/`:

```bash
# Install Bruno: https://www.usebruno.com/
# Open collection: api/bruno/Kreditozrouti
```

Test files:
- `Health Check.bru` - Health endpoint
- `Kreditožrouti/Courses.bru` - Course search
- `Kreditožrouti/Study Plans.bru` - Study plan search
- `Commands/*.bru` - Admin scraper commands

---

## Directory Structure

```
api/
├── src/
│   ├── Config/              # Environment configuration
│   │   └── Config.ts       # Centralized config management
│   ├── Context/            # Logging contexts
│   │   ├── LoggerAPIContext.ts    # API request logging
│   │   └── LoggerJobContext.ts    # Job logging
│   ├── Controllers/        # HTTP request handlers
│   │   ├── Kreditozrouti/  # Main endpoints
│   │   │   ├── CoursesController.ts
│   │   │   ├── StudyPlansController.ts
│   │   │   └── types/      # Request/Response types
│   │   └── Commands/       # Admin endpoints
│   ├── Database/          # Schema & migrations
│   │   ├── types/         # Kysely table definitions
│   │   ├── migrations/    # Schema migrations (numbered)
│   │   └── seeds/         # Initial data scripts
│   ├── Enums/            # Constant enumerations
│   ├── Error/            # Error handling classes
│   ├── Handlers/         # Request/job handlers
│   ├── Interfaces/       # TypeScript interfaces
│   ├── Jobs/             # BullMQ job handlers
│   ├── Middlewares/      # Express middleware
│   ├── Routes/           # Route definitions
│   ├── Services/         # Business logic
│   ├── Validations/      # Zod schemas
│   ├── I18n/            # Translations (cs, en)
│   ├── Emails/          # Email templates
│   ├── app.ts           # Express app config
│   ├── bullmq.ts        # Queue/worker setup
│   ├── clients.ts       # DB, Redis, i18n clients
│   ├── index.ts         # Entry point (with clustering)
│   └── sentry.ts        # Error tracking
├── bruno/               # API test collections
├── package.json
├── tsconfig.json
└── Dockerfile
```

---

## Routes & Endpoints

### Main API Routes

| Method | Endpoint | Controller | Auth | Description |
|--------|----------|-----------|------|-------------|
| `POST` | `/courses` | CoursesController | Public | Search courses with filtering |
| `POST` | `/study_plans` | StudyPlansController | Public | Search study plans with filtering |
| `GET` | `/health` | Built-in | Public | Health check (returns "OK") |

### Admin Command Routes

| Method | Endpoint | Controller | Auth | Description |
|--------|----------|-----------|------|-------------|
| `POST` | `/commands/insis/catalog` | RunInSISCatalogScraperController | Bearer token | Scrape InSIS course catalog |
| `POST` | `/commands/insis/course` | RunInSISCourseScraperController | Bearer token | Scrape single course |
| `POST` | `/commands/insis/studyplans` | RunInSISStudyPlansScraperController | Bearer token | Scrape study plans list |
| `POST` | `/commands/insis/studyplan` | RunInSISStudyPlanScraperController | Bearer token | Scrape single study plan |

**Authentication:** Command endpoints require `Authorization: Bearer <API_COMMAND_TOKEN>` header.

---

## Controllers

### CoursesController

**Route:** `POST /courses`

**Purpose:** Advanced course search with complex filtering and faceted navigation.

**Request Body:** See [CoursesFilterValidation](#validation)

**Response Structure:**

```typescript
{
  data: Course[], // Array of course objects with relations
  facets: {
    faculties: FacetItem[],      // Available faculties
    days: FacetItem[],            // Days with classes
    lecturers: FacetItem[],       // Lecturer names
    languages: FacetItem[],       // Course languages
    levels: FacetItem[],          // Study levels
    semesters: FacetItem[],       // Available semesters
    years: FacetItem[],           // Available years
    groups: FacetItem[],          // Study plan groups
    categories: FacetItem[],      // Study plan categories
    ects: FacetItem[],            // ECTS credit values
    modes_of_completion: FacetItem[],
    time_range: { min: number, max: number } // Minutes from midnight
  },
  meta: {
    limit: number,
    offset: number,
    count: number,  // Results on current page
    total: number   // Total matching results
  }
}
```

**Features:**
- Cross-filtering: Facets reflect available options given current filters
- Redis caching: 5-minute TTL for results and facets
- Optimized queries: Batch loading with in-memory merging
- Conditional joins: Only includes necessary tables

**Example Request:**

```json
{
  "semesters": ["ZS"],
  "years": [2024],
  "faculty_ids": ["FIT"],
  "levels": ["Bachelor"],
  "ects": [3, 4, 5, 6],
  "include_times": [
    { "day": "Monday", "time_from": "09:00", "time_to": "12:00" }
  ],
  "limit": 20,
  "offset": 0,
  "sort_by": "ident",
  "sort_dir": "asc"
}
```

---

### StudyPlansController

**Route:** `POST /study_plans`

**Purpose:** Study plan search with filtering.

**Request Body:** See [StudyPlansFilterValidation](#validation)

**Response Structure:**

```typescript
{
  data: StudyPlan[], // Array of study plans with relations
  facets: {
    faculties: FacetItem[],
    levels: FacetItem[],
    semesters: FacetItem[],
    years: FacetItem[],
    modes_of_studies: FacetItem[],
    study_lengths: FacetItem[]
  },
  meta: {
    limit: number,
    offset: number,
    count: number,
    total: number
  }
}
```

---

### Command Controllers

All command controllers follow the same pattern:

1. Validate request body with Zod
2. Enqueue scraping job to BullMQ
3. Return job ID for tracking

**Example: RunInSISCourseScraperController**

```typescript
// Request
{
  "url": "https://insis.vse.cz/course/4IT101"
}

// Response
{
  "job": {
    "id": "12345",
    "name": "InSIS:Course",
    "data": { "type": "InSIS:Course", "url": "..." }
  }
}
```

---

## Services

### CourseService

**Location:** `src/Services/CourseService.ts`

Type-safe service for course querying and filtering.

**Key Methods:**

#### `getCoursesWithRelations(filters, limit, offset)`

Returns paginated courses with all relations loaded.

**Query Pattern:**
1. Count total matching courses
2. Get paginated course IDs
3. Load relations in parallel:
   - Courses (full records)
   - Faculties
   - Course units
   - Unit slots
   - Course assessments
   - Study plan courses
4. Merge relations in-memory
5. Return structured data

**Returns:**
```typescript
{
  data: CourseWithRelations[],
  count: number,
  total: number
}
```

---

#### `getCourseFacets(filters)`

Computes facet counts for UI filter options.

**Fast Path:** No complex filters active
- Direct table queries without joins
- Redis cached for 5 minutes

**Slow Path:** Complex filters active (times, slots, study plans)
- Full query with conditional joins
- Cross-filtering: excludes current facet from filters

**Parallel Facet Computation:**
- `getSimpleFacet()` - Direct column facets
- `getDayFacet()` - Day of week from slots
- `getLecturerFacet()` - Lecturer names (course + unit)
- `getLanguageFacet()` - Languages (pipe-delimited parsing)
- `getGroupFacet()` - Study plan course groups
- `getCategoryFacet()` - Study plan course categories
- `getTimeRangeFacet()` - Min/max time for slider

**Returns:** Object with facet arrays and time range.

---

#### `buildFilterQuery(filters, ignore)`

Constructs base filtered Kysely query.

**Conditional Joins:**
- Units/Slots: Only if time filters, day filters, or lecturer filters active
- Study Plans: Only if study plan filters active

**Returns:** Kysely query with all filters applied.

---

### StudyPlanService

**Location:** `src/Services/StudyPlanService.ts`

Type-safe service for study plan querying.

**Key Methods:**

#### `getStudyPlansWithRelations(filters, limit, offset)`

Returns paginated study plans with relations.

**Query Pattern:** Same as CourseService (count → IDs → parallel loads → merge).

---

#### `getStudyPlanFacets(filters)`

Computes facet counts for study plan filters.

**Fast Path:** No course filters
- Direct queries without joins

**Slow Path:** Course filters active
- Joins with insis_study_plans_courses

**Parallel Facet Computation:**
- Faculty, level, semester, year, mode of study, study length

---

### InSISService

**Location:** `src/Services/InSISService.ts`

Utility service for academic period calculations.

**Key Methods:**

#### `getUpcomingPeriod(date?: Date)`

Determines the next semester to scrape.

**Logic:**
- Jan/Feb → Previous year's Summer (LS)
- Aug-Nov → Current year's Winter (ZS)
- Dec → Next year's Winter (ZS)

**Returns:** `{ semester: "ZS" | "LS", year: number }`

---

#### `getPeriodsForLastYears(yearsBack: number)`

Generates historical periods for dropdowns.

**Returns:** Array of `{ semester, year }` for last N years (N * 2 periods).

---

### SQLService

**Location:** `src/Services/SQLService.ts`

Database schema management service.

**Key Methods:**

#### `migrateToLatest()`

Executes pending Kysely migrations.

**Process:**
1. Load migrations from `/src/Database/migrations/`
2. Execute in order (numbered prefixes)
3. Log success/failure for each
4. Exit with code 1 on failure

**Called:** On API startup in `src/index.ts`

---

#### `seedInitialData()`

Dynamically loads and runs seed scripts.

**Process:**
1. Scan `/src/Database/seeds/` for `.js`, `.ts`, `.mjs`, `.mts` files
2. Import each module
3. Call exported `seed(db)` function
4. Continue on individual seed failures

**Called:** After migrations on startup.

---

### EmailService

**Location:** `src/Services/EmailService.ts`

Email delivery service using Nodemailer.

**Configuration:** Gmail SMTP with `GOOGLE_USER` and `GOOGLE_APP_PASSWORD`.

---

## Database

### Schema Overview

**Tables:**
- `insis_faculties` - Faculty metadata
- `insis_courses` - Course data (syllabus, credits, lecturers)
- `insis_courses_assessments` - Assessment methods per course
- `insis_courses_units` - Timetable units (lectures, seminars)
- `insis_courses_units_slots` - Individual time slots for units
- `insis_study_plans` - Study plan metadata
- `insis_study_plans_courses` - Course-to-plan many-to-many relation

### Table Definitions

#### insis_faculties

```sql
CREATE TABLE insis_faculties (
  id VARCHAR(32) PRIMARY KEY,
  title VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Relations:**
- One-to-many: `insis_courses`, `insis_study_plans`

---

#### insis_courses

```sql
CREATE TABLE insis_courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  faculty_id VARCHAR(32) NULL,
  url VARCHAR(255),
  ident VARCHAR(32),
  title VARCHAR(1024),
  title_cs VARCHAR(1024),
  title_en VARCHAR(1024),
  ects SMALLINT UNSIGNED,
  mode_of_delivery TEXT,
  mode_of_completion TEXT,
  languages TEXT, -- Pipe-delimited: "EN|CS|DE"
  level VARCHAR(255),
  year_of_study INT,
  semester VARCHAR(8), -- "ZS" or "LS"
  year SMALLINT UNSIGNED,
  lecturers TEXT, -- Pipe-delimited: "Smith|Johnson"
  prerequisites TEXT,
  recommended_programmes TEXT,
  required_work_experience TEXT,
  aims_of_the_course TEXT,
  learning_outcomes TEXT,
  course_contents TEXT,
  special_requirements TEXT,
  literature TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (faculty_id) REFERENCES insis_faculties(id) ON DELETE SET NULL,
  INDEX idx_semester_year (semester, year),
  INDEX idx_faculty (faculty_id),
  INDEX idx_ident (ident)
);
```

**Relations:**
- Many-to-one: `insis_faculties`
- One-to-many: `insis_courses_assessments`, `insis_courses_units`, `insis_study_plans_courses`

---

#### insis_courses_assessments

```sql
CREATE TABLE insis_courses_assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  method TEXT,
  weight SMALLINT UNSIGNED, -- Percentage in final grade
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (course_id) REFERENCES insis_courses(id) ON DELETE CASCADE
);
```

---

#### insis_courses_units

```sql
CREATE TABLE insis_courses_units (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  lecturer VARCHAR(255),
  capacity SMALLINT UNSIGNED,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (course_id) REFERENCES insis_courses(id) ON DELETE CASCADE
);
```

**Relations:**
- Many-to-one: `insis_courses`
- One-to-many: `insis_courses_units_slots`

---

#### insis_courses_units_slots

```sql
CREATE TABLE insis_courses_units_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  unit_id INT NOT NULL,
  type VARCHAR(255), -- "Lecture", "Seminar", etc.
  frequency ENUM('weekly', 'single') NULL,
  date VARCHAR(255), -- For single occurrences
  day VARCHAR(255), -- Day of week for recurring
  time_from SMALLINT UNSIGNED, -- Minutes from midnight (0-1439)
  time_to SMALLINT UNSIGNED, -- Minutes from midnight (0-1439)
  location VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (unit_id) REFERENCES insis_courses_units(id) ON DELETE CASCADE,
  INDEX idx_day (day),
  INDEX idx_time (time_from, time_to)
);
```

**Time Storage:**
- Times stored as minutes from midnight
- 9:00 AM = 540 minutes
- Enables efficient range queries

---

#### insis_study_plans

```sql
CREATE TABLE insis_study_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  faculty_id VARCHAR(32) NULL,
  url TEXT,
  ident VARCHAR(64), -- Plan code: "P-AIN"
  title VARCHAR(255),
  semester VARCHAR(8), -- "ZS" or "LS"
  year SMALLINT UNSIGNED,
  level VARCHAR(64),
  mode_of_study VARCHAR(64),
  study_length VARCHAR(64),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (faculty_id) REFERENCES insis_faculties(id) ON DELETE SET NULL,
  INDEX idx_semester_year (semester, year),
  INDEX idx_faculty (faculty_id),
  INDEX idx_ident (ident)
);
```

**Relations:**
- Many-to-one: `insis_faculties`
- One-to-many: `insis_study_plans_courses`

---

#### insis_study_plans_courses

```sql
CREATE TABLE insis_study_plans_courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  study_plan_id INT NOT NULL,
  course_id INT NULL, -- Linked when course scraped
  course_ident VARCHAR(32), -- Cached for lookup
  group VARCHAR(32), -- Course group in plan
  category VARCHAR(32), -- Course category in plan
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (study_plan_id) REFERENCES insis_study_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES insis_courses(id) ON DELETE SET NULL,
  INDEX idx_course (course_id),
  INDEX idx_ident (course_ident)
);
```

**Purpose:** Links courses to study plans with group/category metadata.

---

### Migrations

**Location:** `src/Database/migrations/`

**Naming Convention:**
- Numeric prefixes: `0001_description.ts`, `0002_description.ts`
- Timestamp prefixes: `20260122151133_description.ts`

**Creating Migrations:**

```typescript
import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('table_name')
    .addColumn('id', 'integer', col => col.primaryKey().autoIncrement())
    .addColumn('name', 'varchar(255)', col => col.notNull())
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('table_name').execute()
}
```

**Execution:** Migrations run automatically on API startup via `SQLService.migrateToLatest()`.

---

### Database Clients

**MySQL (Kysely):**
```typescript
const mysql = new Kysely<Database>({
  dialect: new MysqlDialect({
    pool: createPool({
      uri: Config.mysql.uri,
      connectionLimit: 100,
      acquireTimeout: 10000,
      waitForConnections: true,
      enableKeepAlive: true,
      keepAliveInitialDelay: 30000
    })
  }),
  log(event) {
    if (event.level === 'query' && event.queryDurationMillis > 500) {
      console.warn('Slow query detected:', event)
    }
  }
})
```

**Redis (ioredis):**
```typescript
const redis = new Redis({
  host: Config.redis.uri,
  password: Config.redis.password,
  maxRetriesPerRequest: null // Required for BullMQ
})
```

---

## BullMQ Jobs

### Queue Architecture

**Request Queue:** `ScraperRequestQueue`
- Producer: API controllers
- Consumer: Scraper service (external)
- Purpose: Enqueue scraping jobs

**Response Queue:** `ScraperResponseQueue`
- Producer: Scraper service (external)
- Consumer: API workers
- Concurrency: 4 parallel jobs
- Purpose: Persist scraped data

---

### Job Types

#### Request Jobs (API → Scraper)

**InSIS:Catalog**
```typescript
{
  type: "InSIS:Catalog",
  faculties?: string[],
  periods: { semester: "ZS" | "LS", year: number }[],
  auto_queue_courses: boolean
}
```

**InSIS:Course**
```typescript
{
  type: "InSIS:Course",
  url: string
}
```

**InSIS:StudyPlans**
```typescript
{
  type: "InSIS:StudyPlans",
  faculties?: string[],
  periods: { semester: "ZS" | "LS", year: number }[],
  auto_queue_study_plans: boolean
}
```

**InSIS:StudyPlan**
```typescript
{
  type: "InSIS:StudyPlan",
  url: string
}
```

---

#### Response Jobs (Scraper → API)

**InSIS:Course**

Handled by `ScraperResponseInSISCourseJob`.

**Process:**
1. Upsert faculty record
2. Insert/update course record (ON DUPLICATE KEY UPDATE)
3. Reconcile assessments:
   - Delete removed methods
   - Update changed weights
   - Insert new methods
4. Reconcile timetable:
   - Delete existing units & slots
   - Recreate units with new slots
   - Convert time strings to minutes
5. Link to study plans:
   - Update `insis_study_plans_courses.course_id` where match found

---

**InSIS:StudyPlan**

Handled by `ScraperResponseInSISStudyPlanJob`.

**Process:**
1. Upsert faculty record
2. Insert/update study plan record
3. Reconcile study plan courses:
   - Delete removed courses
   - Update existing courses
   - Insert new courses (course_id initially NULL)

---

### Scheduled Jobs (Production Only)

**Catalog Scraper:**
```typescript
// Daily at 1 AM in Jan, Feb, Aug, Sep
Pattern: '0 1 * 1-2,8-9 *'

Data: {
  type: 'InSIS:Catalog',
  auto_queue_courses: true,
  periods: [upcomingPeriod]
}
```

**Study Plans Scraper:**
```typescript
// Daily at 2 AM in Jan, Feb, Aug, Sep
Pattern: '0 2 * 1-2,8-9 *'

Data: {
  type: 'InSIS:StudyPlans',
  auto_queue_study_plans: true,
  periods: periodsForLastFourYears
}
```

---

### Job Handler

**Location:** `src/Handlers/ScraperResponseHandler.ts`

Routes response jobs by type:

```typescript
export default async function ScraperResponseHandler(
  job: Job<ScraperResponseJob>
): Promise<void> {
  switch (job.data.type) {
    case 'InSIS:Course':
      await ScraperResponseInSISCourseJob(job.data)
      break
    case 'InSIS:StudyPlan':
      await ScraperResponseInSISStudyPlanJob(job.data)
      break
    default:
      // Skip unsupported types
      break
  }
}
```

---

## Middleware

### Global Middleware Stack

Applied to all requests in order:

1. **Static Files** - Serves `/assets` directory
2. **CORS** - Origin validation, credentials allowed
3. **Helmet** - Security headers, disables X-Powered-By
4. **Session** - Redis-backed sessions, 1-day expiry
5. **Compression** - gzip response compression
6. **Morgan** - HTTP request logging (dev/combined)
7. **Response Time** - Records response duration header
8. **Health Check** - `GET /health` returns "OK"

---

### Route-Specific Middleware

**Public Routes (`/courses`, `/study_plans`):**
1. `ParserJSONMiddleware` - Parse JSON request body
2. `LoggerMiddleware` - Log request timing and context

**Command Routes (`/commands/*`):**
1. `ParserJSONMiddleware` - Parse JSON request body
2. `CommandMiddleware` - Validate Bearer token

---

### Middleware Details

#### CommandMiddleware

**Location:** `src/Middlewares/CommandMiddleware.ts`

Validates Bearer token for admin endpoints.

```typescript
// Extract token from Authorization header
const token = req.headers.authorization?.replace('Bearer ', '')

// Validate against environment variable
if (token !== Config.commandToken) {
  throw new Exception(401, ErrorTypeEnum.AUTHORIZATION, ErrorCodeEnum.UNAUTHORIZED)
}
```

---

#### LoggerMiddleware

**Location:** `src/Middlewares/LoggerMiddleware.ts`

Logs requests with timing and context.

**Features:**
- Records request start time
- Logs on response completion:
  - Status ≥500: `log.error()`
  - Status ≥400: `log.warn()`
  - Status <400: `log.info()` (10% sampling)
- Attaches wideEvent to `res.locals` for context tracking

**Context Fields:**
```typescript
{
  method: 'POST',
  path: '/courses',
  timestamp: '2025-01-31T12:00:00.000Z',
  environment: 'local',
  service: 'api',
  duration_ms: 245,
  status_code: 200,
  cache: true // If response served from cache
}
```

---

#### ParserMiddleware

**Location:** `src/Middlewares/ParserMiddleware.ts`

Parses request bodies.

**Exports:**
- `ParserJSONMiddleware` - Parses JSON (default for most routes)
- `ParserRawMiddleware` - Parses binary data
- `ParserURLEncodedMiddleware` - Parses form data

---

## Configuration

### Config Object

**Location:** `src/Config/Config.ts`

Centralized configuration management.

```typescript
const Config = {
  // Environment
  env: process.env.ENV || 'local',

  // API
  port: parseInt(process.env.API_PORT || '40080'),
  uri: process.env.API_URI || 'http://localhost:40080',
  domain: process.env.API_DOMAIN || 'localhost',
  allowedOrigins: (process.env.API_ALLOWED_ORIGINS || '').split(','),
  sessionSecret: process.env.API_SESSION_SECRET || 'default-secret',
  commandToken: process.env.API_COMMAND_TOKEN,
  fileDestination: process.env.API_FILE_DESTINATION || 'uploads/',

  // External Services
  sentry: {
    dsn: process.env.SENTRY_DSN,
    release: process.env.SENTRY_RELEASE
  },
  google: {
    user: process.env.GOOGLE_USER,
    appPassword: process.env.GOOGLE_APP_PASSWORD
  },
  client: {
    uri: process.env.CLIENT_URI || 'http://localhost:45173',
    createURL: (path: string) => `${Config.client.uri}${path}`
  },

  // Databases
  redis: {
    uri: process.env.REDIS_URI!,
    password: process.env.REDIS_PASSWORD
  },
  mysql: {
    uri: process.env.MYSQL_URI!
  },

  // Helpers
  isEmailEnabled: () => !!Config.google.user && !!Config.google.appPassword,
  isEnvProduction: () => Config.env === 'production',
  isEnvDevelopment: () => Config.env === 'development',
  isEnvLocal: () => Config.env === 'local'
}
```

---

### Required Environment Variables

Must be set for API to start:

- `REDIS_URI` - Redis connection string
- `MYSQL_URI` - MySQL connection URI

**Validation:** `CheckRequiredEnvironmentVariables(Config)` called on startup.

---

### Optional Environment Variables

- `ENV` - Runtime environment (local/development/production)
- `API_PORT` - Server port (default: 40080)
- `API_URI` - Public API URI
- `API_DOMAIN` - Top-level domain for cookies
- `API_ALLOWED_ORIGINS` - CORS allowed origins (comma-separated)
- `API_SESSION_SECRET` - Session encryption key
- `API_COMMAND_TOKEN` - Bearer token for admin commands
- `API_FILE_DESTINATION` - Upload directory path
- `SENTRY_DSN` - Sentry error tracking DSN
- `SENTRY_RELEASE` - Release version for Sentry
- `GOOGLE_USER` - Gmail account for email delivery
- `GOOGLE_APP_PASSWORD` - Gmail app-specific password
- `CLIENT_URI` - Frontend URL (default: http://localhost:45173)

---

## Validation

### Zod Schemas

**Location:** `src/Validations/`

#### CoursesFilterValidation

**Location:** `src/Validations/CoursesFilterValidation.ts`

```typescript
{
  // Identity filters
  ids: z.array(z.coerce.number()).optional(),
  idents: z.array(z.string()).optional(),
  title: z.string().optional(),

  // Academic period
  semesters: z.array(SemesterSchema).optional(), // "ZS" | "LS"
  years: z.array(z.coerce.number()).optional(),

  // Organizational
  faculty_ids: z.array(z.string()).optional(),
  levels: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),

  // Time filters
  include_times: z.array(TimeSelectionSchema).optional(),
  exclude_times: z.array(TimeSelectionSchema).optional(),

  // Personnel
  lecturers: z.array(z.string()).optional(),

  // Study plan
  study_plan_ids: z.array(z.coerce.number()).optional(),
  groups: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),

  // Properties
  ects: z.array(z.coerce.number()).optional(),
  mode_of_completions: z.array(z.string()).optional(),
  mode_of_deliveries: z.array(z.string()).optional(),

  // Pagination & sorting
  limit: z.coerce.number().min(0).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sort_by: z.enum(['ident', 'title', 'faculty_id', 'year', 'semester', 'level', 'ects']).optional(),
  sort_dir: z.enum(['asc', 'desc']).optional()
}
```

**TimeSelectionSchema:**
```typescript
{
  day: DaySchema, // "Monday" | "Tuesday" | ...
  time_from: z.string(), // "HH:MM"
  time_to: z.string() // "HH:MM"
}
.refine(data => data.time_from < data.time_to, {
  message: 'time_from must be before time_to'
})
```

---

#### StudyPlansFilterValidation

**Location:** `src/Validations/StudyPlansFilterValidation.ts`

```typescript
{
  // Identity
  ids: z.array(z.coerce.number()).optional(),
  idents: z.array(z.string()).optional(),
  title: z.string().optional(),

  // Academic period
  semesters: z.array(SemesterSchema).optional(),
  years: z.array(z.coerce.number()).optional(),

  // Organizational
  faculty_ids: z.array(z.string()).optional(),
  levels: z.array(z.string()).optional(),
  mode_of_studies: z.array(z.string()).optional(),
  study_lengths: z.array(z.string()).optional(),

  // Course filters
  has_course_ids: z.array(z.coerce.number()).optional(),
  has_course_idents: z.array(z.string()).optional(),

  // Pagination & sorting
  limit: z.coerce.number().min(0).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sort_by: z.enum(['ident', 'title', 'faculty_id', 'year', 'semester', 'level']).optional(),
  sort_dir: z.enum(['asc', 'desc']).optional()
}
```

---

### Shared Schemas

**Location:** `src/Validations/index.ts`

```typescript
export const SemesterSchema = z.enum(['ZS', 'LS'])
export const DaySchema = z.enum([
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
])
```

---

## Error Handling

### Exception Class

**Location:** `src/Error/Exception.ts`

Custom error class extending `Error`.

```typescript
class Exception extends Error implements APIError {
  constructor(
    public status = 500,
    public type = ErrorTypeEnum.UNKNOWN,
    public code = ErrorCodeEnum.UNKNOWN,
    public message = 'An unexpected error occurred.',
    public details: APIErrorDetails = {}
  )
}
```

---

### Error Types & Codes

**Location:** `src/Enums/ErrorEnum.ts`

**Error Types:**
```typescript
enum ErrorTypeEnum {
  UNKNOWN = 'UNKNOWN',
  ZOD_VALIDATION = 'ZOD_VALIDATION',
  AUTHORIZATION = 'AUTHORIZATION'
}
```

**Error Codes:**
```typescript
enum ErrorCodeEnum {
  UNKNOWN = '0',
  UNAUTHORIZED = '401_000',
  VALIDATION_FAILED = '403_000',
  INTERNAL_ERROR = '500_000',
  EMAIL_NOT_SENT = '500_001'
}
```

---

### Global Error Handler

**Location:** `src/Handlers/ErrorHandler.ts`

Catches all errors and formats responses.

```typescript
export default function ErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof Exception) {
    res.status(err.status).json({
      type: err.type,
      code: err.code,
      message: err.message,
      details: err.details
    })
  } else {
    // Unexpected error
    console.error(err)
    sentry.captureException(err)

    res.status(500).json({
      type: ErrorTypeEnum.UNKNOWN,
      code: ErrorCodeEnum.UNKNOWN,
      message: 'An unexpected error occurred.'
    })
  }
}
```

---

### Error Response Format

```typescript
{
  type: string,    // ErrorTypeEnum
  code: string,    // ErrorCodeEnum
  message: string, // Human-readable message
  details?: {      // Optional additional info
    zodIssues?: ZodIssue[] // For validation errors
  }
}
```

---

### Logging Errors

**API Context:**
```typescript
LoggerAPIContext.add(res, {
  error: 'Description',
  stack: error.stack
})
```

**Job Context:**
```typescript
LoggerJobContext.add({
  error: 'Description',
  message: error.message,
  type: error.constructor.name
})
```

---

## Caching Strategy

### Cache Layers

#### 1. Course Results Cache

**Key:** `insis:courses:{JSON.stringify(filters)}`
**TTL:** 5 minutes (300 seconds)

```typescript
const cacheKey = `insis:courses:${JSON.stringify(filters)}`
const cached = await redis.get(cacheKey)

if (cached) {
  const data = JSON.parse(cached)
  LoggerAPIContext.add(res, { cache: true })
  return data
}

// ... query database ...

await redis.setex(cacheKey, 300, JSON.stringify(results))
```

---

#### 2. Course Facets Cache

**Key:** `course:facets:{base64(JSON.stringify(relevantFilters))}`
**TTL:** 5 minutes

**Relevant Filters:** Excludes pagination, sorting, and time filters for better cache hit rate.

```typescript
const relevantFilters = {
  ids: filters.ids,
  idents: filters.idents,
  title: filters.title,
  semesters: filters.semesters,
  years: filters.years,
  faculty_ids: filters.faculty_ids,
  // ... (excludes limit, offset, sort_by, sort_dir, include_times, exclude_times)
}

const cacheKey = `course:facets:${Buffer.from(JSON.stringify(relevantFilters)).toString('base64')}`
```

---

#### 3. Study Plan Results Cache

**Key:** `insis:study_plans:{JSON.stringify(filters)}`
**TTL:** 5 minutes

Same pattern as course results cache.

---

#### 4. Study Plan Facets Cache

**Key:** `studyplan:facets:{base64(JSON.stringify(relevantFilters))}`
**TTL:** 5 minutes

Same pattern as course facets cache.

---

#### 5. Session Store

**Key:** `session:{sessionId}`
**TTL:** 1 day (86400 seconds)

Managed by `connect-redis`:

```typescript
store: new RedisStore({
  client: redis,
  prefix: 'session:',
  ttl: 86400
})
```

---

### Cache Invalidation

**Strategy:** Time-based expiration (TTL)

**Manual Invalidation:** Can flush Redis:
```bash
make clear-redis
```

**Considerations:**
- Results cached for 5 minutes (reasonable for course data)
- Scraper updates happen asynchronously
- Cache warmup on first request after invalidation

---

## Security

### Authentication & Authorization

#### Session Management

- **Store:** Redis-backed sessions
- **TTL:** 1 day
- **Cookie:** HttpOnly, Secure (production), SameSite
- **Secret:** `API_SESSION_SECRET` environment variable

#### Command Endpoint Protection

- **Method:** Bearer token validation
- **Token:** `API_COMMAND_TOKEN` environment variable
- **Header:** `Authorization: Bearer <token>`
- **Middleware:** `CommandMiddleware`

---

### CORS Configuration

```typescript
app.use(cors({
  origin: Config.allowedOrigins, // From API_ALLOWED_ORIGINS
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
```

---

### Security Headers (Helmet)

```typescript
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for API
  crossOriginEmbedderPolicy: false,
  xPoweredBy: false // Hides Express
}))
```

---

### Input Validation

- **All endpoints:** Zod schema validation
- **Type coercion:** Strings → numbers where appropriate
- **Range validation:** Pagination limits, time ranges
- **SQL injection:** Prevented by Kysely parameterization
- **XSS:** N/A (API returns JSON, not HTML)

---

### Error Disclosure

- **Production:** Generic error messages
- **Development:** Detailed errors with stack traces
- **Sentry:** All errors reported to Sentry
- **Logs:** Structured logging with Pino

---

### Rate Limiting

**Not implemented.** Consider adding rate limiting for production:

```bash
pnpm add express-rate-limit
```

---

## Performance

### Query Optimization

#### Batch Loading Pattern

All list endpoints use this pattern:

1. **Count Query** - Get total matching records
2. **Paginated ID Query** - Get only IDs for current page
3. **Parallel Relation Loads** - Load data in parallel
4. **In-Memory Merge** - Combine using FIELD() ordering

**Result:** Maximum 4-5 queries per request, regardless of page size.

**Example:**
```typescript
// 1. Count
const total = await query.count()

// 2. Paginated IDs
const courseIds = await query
  .select('id')
  .limit(limit)
  .offset(offset)
  .execute()

// 3. Parallel loads
const [courses, faculties, units, ...] = await Promise.all([
  loadCourses(courseIds),
  loadFaculties(courseIds),
  loadUnits(courseIds),
  ...
])

// 4. Merge (preserving order)
return mergeCourseRelations(courses, faculties, units, ...)
```

---

### Conditional Joins

Only includes necessary tables based on active filters.

**Example:**
```typescript
// No time filters? Skip units/slots joins
const needsUnitJoin = filters.include_times || filters.exclude_times || filters.lecturers

if (needsUnitJoin) {
  query = query
    .leftJoin('insis_courses_units', 'insis_courses.id', 'insis_courses_units.course_id')
    .leftJoin('insis_courses_units_slots', 'insis_courses_units.id', 'insis_courses_units_slots.unit_id')
}
```

---

### Caching Strategy

**5-minute TTL:**
- Course results
- Study plan results
- Course facets
- Study plan facets

**1-day TTL:**
- Sessions

**Redis Performance:**
- In-memory storage (sub-millisecond reads)
- Connection pooling via ioredis
- Pipelining for batch operations

---

### Parallel Execution

**Facet Computation:**
```typescript
const facets = await Promise.all([
  getSimpleFacet('faculty_id'),
  getSimpleFacet('level'),
  getDayFacet(),
  getLecturerFacet(),
  getLanguageFacet(),
  // ... all facets computed in parallel
])
```

**Relation Loading:**
```typescript
const [courses, faculties, units, slots, assessments, studyPlanCourses] = await Promise.all([
  loadCourses(courseIds),
  loadFaculties(courseIds),
  loadUnits(courseIds),
  loadSlots(unitIds),
  loadAssessments(courseIds),
  loadStudyPlanCourses(courseIds)
])
```

---

### Database Connection Pooling

```typescript
const pool = createPool({
  uri: Config.mysql.uri,
  connectionLimit: 100,        // Max concurrent connections
  acquireTimeout: 10000,        // 10 seconds
  waitForConnections: true,     // Queue requests
  enableKeepAlive: true,        // Keep connections alive
  keepAliveInitialDelay: 30000  // 30 seconds
})
```

---

### Logging

**Sampling:** 10% of successful requests logged

```typescript
if (status < 400 && Math.random() > 0.1) {
  return // Skip logging 90% of successful requests
}

log.info(context)
```

**Threshold Logging:**
```typescript
if (event.level === 'query' && event.queryDurationMillis > 500) {
  console.warn('Slow query detected:', event)
  sentry.captureMessage('Slow query', {
    level: 'warning',
    extra: event
  })
}
```

---

### Cluster Mode

API supports multi-worker clustering:

```typescript
// Start with 4 workers
pnpm run dev 4
```

**Benefits:**
- Utilizes multiple CPU cores
- Automatic worker restart on crash
- Load distribution across workers

**Limitations:**
- Shared Redis for cache/sessions
- BullMQ workers run in each process (configure concurrency accordingly)

---

## Development Guide

### Adding a New Endpoint

1. **Create Controller** in `src/Controllers/`
2. **Define Types** in `src/Controllers/<name>/types/`
3. **Create Validation** in `src/Validations/`
4. **Add Route** in `src/Routes/`
5. **Update Service** if needed in `src/Services/`

**Example:**

```typescript
// src/Controllers/Example/ExampleController.ts
export default async function ExampleController(req: Request, res: Response) {
  const filters = ExampleFilterValidation.parse(req.body)
  const results = await ExampleService.getExample(filters)
  res.json(results)
}

// src/Routes/ExampleRoutes.ts
router.post('/example', ExampleController)
```

---

### Adding a Database Migration

1. **Create file** in `src/Database/migrations/`
2. **Name with prefix**: `0005_add_example_table.ts`
3. **Implement up/down**:

```typescript
import { Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('example_table')
    .addColumn('id', 'integer', col => col.primaryKey().autoIncrement())
    .addColumn('name', 'varchar(255)', col => col.notNull())
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('example_table').execute()
}
```

4. **Update types** in `src/Database/types/`
5. **Restart API** (migrations run automatically)

---

### Adding a BullMQ Job

**Request Job:**

1. **Create job type** in `/scraper/src/Interfaces/ScraperRequestJob.ts`
2. **Implement job** in `/scraper/src/Jobs/`
3. **Register in scraper** worker

**Response Job:**

1. **Create job type** in `/scraper/src/Interfaces/ScraperResponseJob.ts`
2. **Implement handler** in `/api/src/Jobs/`
3. **Add to router** in `src/Handlers/ScraperResponseHandler.ts`

---

### Adding a Facet

1. **Create facet method** in service:

```typescript
static async getNewFacet(
  filters: Filters,
  ignore: (keyof Filters)[]
): Promise<FacetItem[]> {
  const query = this.buildFilterQuery(filters, [...ignore, 'new_field'])

  const results = await query
    .select('new_field')
    .select(db => db.fn.count('id').as('count'))
    .groupBy('new_field')
    .execute()

  return results.map(r => ({
    value: r.new_field,
    count: Number(r.count)
  }))
}
```

2. **Add to facets computation**:

```typescript
const facets = await Promise.all([
  // ... existing facets
  this.getNewFacet(filters, Object.keys(filters))
])
```

3. **Update response type** in `src/Controllers/<name>/types/`

---

### Debugging

**Enable query logging:**
```typescript
// src/clients.ts
log(event) {
  if (event.level === 'query') {
    console.log('Query:', event.query.sql)
    console.log('Parameters:', event.query.parameters)
  }
}
```

**Check Redis cache:**
```bash
docker exec -it kreditozrouti-redis redis-cli
> KEYS *
> GET "insis:courses:..."
```

**View BullMQ jobs:**
```bash
docker exec -it kreditozrouti-redis redis-cli
> KEYS bull:*
> HGETALL "bull:ScraperResponseQueue:12345"
```

**Tail logs:**
```bash
# In development
pnpm run dev

# In production
pm2 logs api
```

---

### Testing

**Manual Testing:**
1. Open Bruno
2. Load collection from `/api/bruno/Kreditozrouti`
3. Run requests

**Automated Testing:**
Not yet implemented. Consider adding:
- Jest for unit tests
- Supertest for integration tests

---

### Deployment

**Docker:**
```bash
# Build image
make build-docker-images

# Run container
docker run -p 40080:40080 kreditozrouti-api
```

**Environment:**
- Set all required environment variables
- Configure Sentry DSN for error tracking
- Enable scheduled jobs (production only)
- Set up proper session secret
- Configure CORS for production domain

---

## Troubleshooting

### Common Issues

**Migrations not running:**
- Check MySQL connection
- Verify migration file naming (numeric prefix)
- Check logs for migration errors

**Cache not working:**
- Verify Redis connection
- Check Redis memory usage
- Ensure TTL is set correctly

**Slow queries:**
- Check query logs (>500ms warning)
- Verify indexes on filtered columns
- Consider reducing page size

**BullMQ jobs not processing:**
- Check Redis connection (`maxRetriesPerRequest: null`)
- Verify worker is running
- Check job queue: `KEYS bull:*` in Redis CLI

**Session issues:**
- Verify `API_SESSION_SECRET` is set
- Check Redis session store
- Verify cookie settings (Secure, SameSite)

---

## Additional Resources

- [Kysely Documentation](https://kysely.dev/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Express Documentation](https://expressjs.com/)
- [Zod Documentation](https://zod.dev/)
- [Redis Documentation](https://redis.io/docs/)
- [Pino Documentation](https://getpino.io/)

---

## Contributing

When contributing to the API:

1. Follow existing patterns (services, controllers, validation)
2. Add appropriate error handling
3. Update this documentation
4. Test with Bruno collection
5. Ensure migrations are reversible
6. Add logging context where appropriate
7. Consider caching strategy for new endpoints
