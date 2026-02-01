# Scraper Documentation

Comprehensive documentation for the Kreditozrouti Scraper service.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Directory Structure](#directory-structure)
- [Job Types](#job-types)
- [Services](#services)
- [HTTP Client](#http-client)
- [Data Extraction](#data-extraction)
- [Queue Management](#queue-management)
- [Configuration](#configuration)
- [Error Handling](#error-handling)
- [Logging](#logging)
- [Utilities](#utilities)
- [Design Patterns](#design-patterns)
- [Development Guide](#development-guide)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Scraper is a headless Node.js service that scrapes course and study plan data from InSIS (VSE's information system). It processes scraping jobs from a BullMQ queue, extracts structured data using Cheerio, and sends results back to the API for persistence.

**Key Features:**
- Automated discovery of courses and study plans
- HTML parsing with Cheerio (lightweight, no browser overhead)
- Job-based architecture with BullMQ
- Structured logging with AsyncLocalStorage
- Deduplication to prevent re-scraping
- Graceful error handling
- Puppeteer available (unused, for future features)

**Tech Stack:**
- Node.js 22+
- BullMQ (job queue)
- Axios (HTTP requests)
- Cheerio (HTML parsing)
- Turndown (HTML to Markdown)
- Pino (logging)
- Sentry (error tracking)

---

## Architecture

### Job Processing Flow

```
┌─────────────────────────────────────┐
│ API enqueues request to BullMQ      │
├─────────────────────────────────────┤
│ ScraperRequestQueue (Redis)         │
│  - Job type + parameters            │
│  - Deduplication IDs                │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Worker picks up job (concurrency: 1)│
├─────────────────────────────────────┤
│ ScraperRequestHandler (router)      │
│  - Measures execution duration      │
│  - Creates LoggerJobContext         │
│  - Routes to specific job type      │
└──────────────┬──────────────────────┘
               │
       ┌───────┼───────┬───────┬───────┐
       ▼       ▼       ▼       ▼       ▼
    Catalog  Course  Plans  StudyPlan Job
    Job      Job     Job     Job    Handler
       │       │       │       │       │
       └───────┼───────┴───────┴───────┘
               ▼
   ┌─────────────────────────────┐
   │ HTTP Request to InSIS       │
   │ - Axios with browser headers│
   │ - Czech language preference │
   └──────────────┬──────────────┘
                  │
                  ▼
   ┌─────────────────────────────┐
   │ Extract data via Cheerio    │
   │ - Parse HTML tables/rows    │
   │ - Extract URLs/IDs          │
   │ - Clean text values         │
   └──────────────┬──────────────┘
                  │
                  ▼
   ┌─────────────────────────────┐
   │ Queue response to API       │
   │ - Add to ResponseQueue      │
   │ - API persists to MySQL     │
   └─────────────────────────────┘
```

### Service Layer Architecture

```
┌─────────────────────────────────────┐
│         Job Handlers                │
│  (ScraperRequestInSISCourseJob)     │
└──────────────┬──────────────────────┘
               │
       ┌───────┼───────┬───────┐
       ▼       ▼       ▼       ▼
  HTTP Client Extract Queue  Utils
  Service     Service Service (HTML,
  (Axios)     (Cheerio)(BullMQ) HTTP)
       │       │       │       │
       └───────┴───────┴───────┘
                  │
                  ▼
         ┌────────────────┐
         │ LoggerContext  │
         │ (AsyncLocal)   │
         └────────────────┘
```

---

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10.20.0+
- Redis 7+
- Chrome browser (auto-downloaded by Puppeteer postinstall)

### Installation

```bash
cd scraper
pnpm install
```

The postinstall script automatically downloads Chrome:
```bash
npx puppeteer browsers install chrome
```

### Environment Variables

The scraper uses the root `.env` file (same as API):

```env
# Required
REDIS_URI=redis://127.0.0.1:46379
REDIS_PASSWORD=redis

# Optional
ENV=local
SENTRY_DSN=
SENTRY_RELEASE=local
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

---

## Directory Structure

```
scraper/
├── src/
│   ├── index.ts                      # Entry point with cluster management
│   ├── bullmq.ts                     # Queue/worker initialization
│   ├── clients.ts                    # Redis client setup
│   ├── sentry.ts                     # Error tracking configuration
│   ├── Config/
│   │   └── Config.ts                # Configuration management
│   ├── Context/
│   │   └── LoggerJobContext.ts      # Structured logging context
│   ├── Handlers/
│   │   └── ScraperRequestHandler.ts # Main job router
│   ├── Jobs/                         # Job implementations
│   │   ├── ScraperRequestInSISCatalogJob.ts
│   │   ├── ScraperRequestInSISCourseJob.ts
│   │   ├── ScraperRequestInSISStudyPlansJob.ts
│   │   └── ScraperRequestInSISStudyPlanJob.ts
│   ├── Services/                     # Business logic
│   │   ├── InSISHTTPClientService.ts
│   │   ├── ExtractInSISCatalogService.ts
│   │   ├── ExtractInSISCourseService.ts
│   │   ├── ExtractInSISStudyPlanService.ts
│   │   ├── InSISQueueService.ts
│   │   ├── MarkdownService.ts
│   │   └── DateService.ts
│   ├── Interfaces/                   # TypeScript interfaces
│   │   ├── ScraperInSISCourse.ts
│   │   ├── ScraperInSISStudyPlan.ts
│   │   ├── ScraperInSISCatalog.ts
│   │   ├── ScraperRequestJob.ts
│   │   ├── ScraperResponseJob.ts
│   │   ├── ScraperQueue.ts
│   │   └── ScraperSchedulers.ts
│   ├── Types/                        # Type definitions
│   │   ├── ScraperJob.ts
│   │   ├── InSISSemester.ts
│   │   └── InSISStudyPlanCourseCategory.ts
│   └── Utils/                        # Helper utilities
│       ├── HTMLUtils.ts              # DOM/text manipulation
│       ├── HTTPUtils.ts              # HTTP header generation
│       ├── InSISUtils.ts             # Semester/year extraction
│       └── ConcurrencyUtils.ts       # Parallel task execution
├── package.json
├── tsconfig.json
└── Dockerfile
```

---

## Job Types

### Overview

The scraper handles 4 types of scraping jobs:

| Job Type | Purpose | Input | Output |
|----------|---------|-------|--------|
| `InSIS:Catalog` | Discover course URLs | Faculties, periods | List of course URLs |
| `InSIS:Course` | Scrape course details | Course URL | Full course data |
| `InSIS:StudyPlans` | Discover study plan URLs | Faculties, periods | List of plan URLs |
| `InSIS:StudyPlan` | Scrape plan details | Plan URL | Full study plan data |

---

### Job 1: InSIS:Catalog

**Purpose:** Discover and extract all course URLs from the InSIS catalog.

**Location:** `src/Jobs/ScraperRequestInSISCatalogJob.ts`

**Two-Phase Process:**

#### Phase 1: Discovery

1. GET `https://insis.vse.cz/katalog/index.pl?jak=rozsirene`
2. Parse extended search form
3. Extract available faculties from form inputs
4. Extract available academic periods (semester + year combinations)
5. Filter by user-specified faculties/periods if provided

#### Phase 2: Scraping

For each faculty + period combination:
1. POST form with search parameters
2. Parse response HTML
3. Extract all course syllabus URLs using regex: `syllabus.pl?predmet=`
4. Deduplicate URLs
5. Optionally auto-queue individual course requests

**Input:**

```typescript
{
  type: 'InSIS:Catalog',
  faculties?: string[],              // e.g., ['FIS', 'ESF']
  periods?: Array<{
    semester: 'ZS' | 'LS',
    year: number
  }>,
  auto_queue_courses?: boolean       // Auto-queue discovered courses
}
```

**Output:**

```typescript
{
  catalog: {
    urls: string[]  // Array of course syllabus URLs
  }
}
```

**Example Flow:**

```typescript
// Request
{
  type: 'InSIS:Catalog',
  faculties: ['FIS'],
  periods: [{ semester: 'ZS', year: 2024 }],
  auto_queue_courses: true
}

// Phase 1: Discovery
GET https://insis.vse.cz/katalog/index.pl?jak=rozsirene
→ Extract: FIS faculty, all periods
→ Filter: Keep only ZS 2024

// Phase 2: Scraping
POST https://insis.vse.cz/katalog/index.pl
  with: fakulta=FIS, obdobi_fak=ZS 2023/2024
→ Extract: 150 course URLs

// Auto-queue
For each URL:
  → Add InSIS:Course job to queue

// Response
{
  catalog: {
    urls: [
      'https://insis.vse.cz/katalog/syllabus.pl?predmet=12345',
      // ... 149 more
    ]
  }
}
```

---

### Job 2: InSIS:Course

**Purpose:** Scrape detailed course information from a single syllabus page.

**Location:** `src/Jobs/ScraperRequestInSISCourseJob.ts`

**Process:**

1. GET course URL with `lang=cz` parameter
2. Parse HTML using Cheerio
3. Extract comprehensive course data (see below)
4. Convert syllabus sections to Markdown
5. Queue response to API

**Input:**

```typescript
{
  type: 'InSIS:Course',
  url: string  // e.g., 'https://insis.vse.cz/katalog/syllabus.pl?predmet=12345'
}
```

**Extracted Data:**

```typescript
{
  id: number,                    // Course ID
  url: string,                   // Original URL
  ident: string,                 // Course code (e.g., '4IT101')

  // Titles
  title: string,                 // Default title
  title_cs: string,              // Czech title
  title_en: string,              // English title

  // Basic info
  ects: number,                  // ECTS credits
  mode_of_delivery: string,      // E.g., 'Prezenční'
  mode_of_completion: string,    // E.g., 'Zkouška'
  languages: string[],           // ['Čeština', 'Angličtina']

  // Context
  faculty: {
    ident: string,               // Faculty code (e.g., 'FIS')
    title: string                // Faculty name
  },
  semester: 'ZS' | 'LS',
  year: number,
  level: string,                 // E.g., 'Bachelor'
  year_of_study: number,         // Recommended year

  // Personnel
  lecturers: string[],           // Array of lecturer names

  // Syllabus content (Markdown)
  prerequisites: string,
  recommended_programmes: string,
  required_work_experience: string,
  aims_of_the_course: string,
  learning_outcomes: string,
  course_contents: string,
  special_requirements: string,
  literature: string,

  // Assessment
  assessment_methods: Array<{
    method: string,              // E.g., 'Zkouška'
    weight: number               // Percentage (0-100)
  }>,

  // Timetable
  timetable: Array<{
    lecturer: string,
    capacity: number,
    note: string,
    slots: Array<{
      type: string,              // E.g., 'Lecture', 'Seminar'
      frequency: 'weekly' | 'single',
      date: string,              // For single events
      day: string,               // Day of week
      time_from: string,         // 'HH:MM'
      time_to: string,           // 'HH:MM'
      location: string
    }>
  }>,

  // Study plan references
  study_plans: Array<{
    facultyIdent: string,
    ident: string,               // Plan code
    semester: 'ZS' | 'LS',
    year: number,
    group: string,               // Group code
    category: string             // Category code
  }>
}
```

**Example Flow:**

```typescript
// Request
{
  type: 'InSIS:Course',
  url: 'https://insis.vse.cz/katalog/syllabus.pl?predmet=12345'
}

// Scraping
GET https://insis.vse.cz/katalog/syllabus.pl?predmet=12345&lang=cz
→ Parse HTML with Cheerio
→ Extract all fields
→ Convert syllabus HTML to Markdown

// Response
{
  course: {
    id: 12345,
    ident: '4IT101',
    title: 'Programování v Javě',
    ects: 6,
    // ... full course data
  }
}
```

---

### Job 3: InSIS:StudyPlans

**Purpose:** Discover all study plan URLs via breadth-first traversal of the hierarchy.

**Location:** `src/Jobs/ScraperRequestInSISStudyPlansJob.ts`

**Hierarchical Traversal:**

InSIS organizes study plans in a tree structure:
```
Root
├── Faculty 1
│   ├── Level (Bachelor)
│   │   ├── Mode (Full-time)
│   │   │   ├── Semester (ZS 2024)
│   │   │   │   └── Study Plan (FINAL URL)
```

**Process:**

1. Start at `https://insis.vse.cz/katalog/plany.pl?lang=cz`
2. Extract faculty links (level 0)
3. For each level (max depth = 8):
   - Fetch all URLs at current level concurrently (10 parallel)
   - Classify URLs as:
     - **Navigation URLs**: Intermediate (no `stud_plan=` parameter)
     - **Final Plan URLs**: Leaves (contain `stud_plan=` parameter)
   - Add final URLs to result set
   - Continue with next level's navigation URLs
4. Filter by faculties/periods if specified
5. Optionally auto-queue individual plan requests

**Input:**

```typescript
{
  type: 'InSIS:StudyPlans',
  faculties?: string[],
  periods?: Array<{
    semester: 'ZS' | 'LS',
    year: number
  }>,
  auto_queue_study_plans?: boolean
}
```

**Output:**

```typescript
{
  study_plans: {
    urls: string[]  // Array of study plan URLs
  }
}
```

**Example Flow:**

```typescript
// Request
{
  type: 'InSIS:StudyPlans',
  faculties: ['FIS'],
  periods: [{ semester: 'ZS', year: 2024 }]
}

// Level 0: Faculties
GET https://insis.vse.cz/katalog/plany.pl?lang=cz
→ Extract: [FIS link, ESF link, ...]
→ Filter: Keep only FIS

// Level 1: Study Levels
GET https://insis.vse.cz/katalog/plany.pl?fakulta=FIS
→ Extract: [Bachelor link, Master link, ...]
→ All are navigation URLs

// Level 2: Study Modes
GET https://insis.vse.cz/katalog/plany.pl?fakulta=FIS&uroven=BC
→ Extract: [Full-time link, Part-time link, ...]
→ All are navigation URLs

// Level 3: Semesters
GET https://insis.vse.cz/katalog/plany.pl?fakulta=FIS&uroven=BC&forma=P
→ Extract: [ZS 2024 link, LS 2024 link, ...]
→ Filter by period: Keep only ZS 2024

// Level 4: Final Plans
GET https://insis.vse.cz/katalog/plany.pl?fakulta=FIS&uroven=BC&forma=P&obdobi=ZS
→ Extract: 25 study plan URLs (contain stud_plan= parameter)
→ All are final URLs

// Response
{
  study_plans: {
    urls: [
      'https://insis.vse.cz/katalog/syllabus_planu.pl?stud_plan=12345',
      // ... 24 more
    ]
  }
}
```

---

### Job 4: InSIS:StudyPlan

**Purpose:** Scrape detailed study plan information from a single plan page.

**Location:** `src/Jobs/ScraperRequestInSISStudyPlanJob.ts`

**Process:**

1. GET study plan URL
2. Parse HTML using Cheerio
3. Extract plan metadata and course list
4. Parse group codes for categorization
5. Queue response to API

**Input:**

```typescript
{
  type: 'InSIS:StudyPlan',
  url: string  // e.g., 'https://insis.vse.cz/katalog/syllabus_planu.pl?stud_plan=12345'
}
```

**Extracted Data:**

```typescript
{
  id: number,                    // Plan ID
  url: string,                   // Original URL
  ident: string,                 // Plan code (e.g., 'P-AIN')
  title: string,                 // Plan name

  // Context
  faculty: {
    ident: string,               // Faculty code
    title: string                // Faculty name
  },
  semester: 'ZS' | 'LS',
  year: number,

  // Properties
  level: string,                 // E.g., 'Bachelor'
  mode_of_study: string,         // E.g., 'Full-time'
  study_length: string,          // E.g., '3 years'

  // Courses
  courses: Array<{
    ident: string,               // Course code (e.g., '4IT101')
    group: string,               // Group code (parsed)
    category: string             // Category code (parsed)
  }>
}
```

**Group Code Parsing:**

InSIS encodes course categorization in group codes like `fP`, `oV`, `hJ3`:

**Group Prefixes** (scope):
- `f` = faculty_specific
- `c` = university_wide
- `o` = field_specific_bachelor
- `h` = field_specific_master
- `s` = minor_specialization
- `e` = field_specific_doctoral

**Category Suffixes** (type):
- `P` = compulsory
- `V` = elective
- `J` = language
- `SZ` = state_exam
- `TVS` = physical_education
- `EXC` = prohibited
- `VOR` = beyond_scope
- `ZEXCN` = exchange_program

**Parsing Example:**
- `fP` → group: `faculty_specific`, category: `compulsory`
- `oV2` → group: `field_specific_bachelor`, category: `elective`
- `hJ3` → group: `field_specific_master`, category: `language`

**Example Flow:**

```typescript
// Request
{
  type: 'InSIS:StudyPlan',
  url: 'https://insis.vse.cz/katalog/syllabus_planu.pl?stud_plan=12345'
}

// Scraping
GET https://insis.vse.cz/katalog/syllabus_planu.pl?stud_plan=12345
→ Parse HTML with Cheerio
→ Extract plan metadata
→ Extract course table with group codes
→ Parse group codes (e.g., 'fP' → compulsory, faculty_specific)

// Response
{
  study_plan: {
    id: 12345,
    ident: 'P-AIN',
    title: 'Applied Informatics',
    faculty: { ident: 'FIS', title: 'Faculty of Informatics' },
    semester: 'ZS',
    year: 2024,
    level: 'Bachelor',
    courses: [
      { ident: '4IT101', group: 'faculty_specific', category: 'compulsory' },
      { ident: '4IT201', group: 'field_specific_bachelor', category: 'elective' },
      // ... more courses
    ]
  }
}
```

---

## Services

### InSISHTTPClientService

**Location:** `src/Services/InSISHTTPClientService.ts`

Type-safe HTTP client wrapper around Axios with browser-like headers.

**Purpose:** Make HTTP requests to InSIS with consistent configuration and error handling.

#### Factory Method

```typescript
createInSISClient(logPrefix?: string): InSISHTTPClient
```

Creates a pre-configured client instance.

#### Methods

**`get<T>(url: string, config?: AxiosRequestConfig): Promise<HttpResponse<T>>`**

Performs GET request.

```typescript
const client = createInSISClient('course')
const response = await client.get<string>(url)

if (response.success) {
  const html = response.data
  // Parse HTML
} else {
  console.error('Request failed:', response.error)
}
```

**`post<T>(url: string, data: any, config?: AxiosRequestConfig): Promise<HttpResponse<T>>`**

Performs POST request with URLSearchParams encoding.

```typescript
const response = await client.post<string>(url, {
  fakulta: 'FIS',
  obdobi_fak: 'ZS 2023/2024'
})
```

**`getSilent<T>(url: string, config?: AxiosRequestConfig): Promise<T | null>`**

GET request that returns null on failure (no logging).

```typescript
const html = await client.getSilent<string>(url)
if (!html) return // Failed silently
```

#### Browser Headers

Client automatically includes:

```typescript
{
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'cs,en-US;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Referer': 'https://insis.vse.cz'
}
```

#### Error Handling

- Axios errors: Extracts status, statusText, message
- Network errors: Logs error message
- All errors logged to `LoggerJobContext`
- Returns `{ success: false, error }` structure

---

### ExtractInSISCatalogService

**Location:** `src/Services/ExtractInSISCatalogService.ts`

Parses InSIS catalog pages to extract search options and course URLs.

#### Methods

**`extractSearchOptions(html: string)`**

Extracts available faculties and academic periods from extended search form.

```typescript
const options = ExtractInSISCatalogService.extractSearchOptions(html)

// Result
{
  faculties: Array<{
    id: string,        // E.g., 'FIS'
    identifier: string,// E.g., 'FIS'
    name: string       // E.g., 'Fakulta informatiky a statistiky'
  }>,
  periods: Array<{
    id: string,        // E.g., 'ZS 2023/2024'
    semester: 'ZS' | 'LS',
    year: number       // E.g., 2024
  }>
}
```

**`extractCourseUrls(html: string): string[]`**

Extracts all course syllabus URLs from catalog search results.

```typescript
const urls = ExtractInSISCatalogService.extractCourseUrls(html)

// Result
[
  'https://insis.vse.cz/katalog/syllabus.pl?predmet=12345',
  'https://insis.vse.cz/katalog/syllabus.pl?predmet=12346',
  // ...
]
```

---

### ExtractInSISCourseService

**Location:** `src/Services/ExtractInSISCourseService.ts`

Comprehensive parser for InSIS course syllabus pages.

#### Methods

**`extractIdFromUrl(url: string): number | null`**

Extracts course ID from URL parameter.

```typescript
const id = ExtractInSISCourseService.extractIdFromUrl(
  'https://insis.vse.cz/katalog/syllabus.pl?predmet=12345'
)
// Returns: 12345
```

**`extractIdFromHtml(html: string): number | null`**

Extracts course ID from hidden form input.

```typescript
const id = ExtractInSISCourseService.extractIdFromHtml(html)
```

**`extract(html: string, url: string): ScraperInSISCourse | null`**

Main extraction method. Parses all course data from HTML.

```typescript
const course = ExtractInSISCourseService.extract(html, url)

if (!course) {
  console.error('Failed to extract course')
  return
}

// course contains all fields (see Job 2 documentation)
```

#### Internal Parsing Methods

- `extractBasicInfo()` - Code, titles, ECTS, delivery mode, languages
- `extractSemesterAndYear()` - Parse period string
- `extractFaculty()` - Parse from page header
- `extractLevelAndYear()` - Study level + year recommendation
- `extractLecturers()` - From anchor tags or multi-line cells
- `extractSyllabusContent()` - Sections and literature (HTML → Markdown)
- `extractAssessmentMethods()` - Table with methods and weights
- `extractTimetable()` - Complex table parsing with slots
- `extractStudyPlans()` - Faculty-program-semester tables

---

### ExtractInSISStudyPlanService

**Location:** `src/Services/ExtractInSISStudyPlanService.ts`

Parser for InSIS study plan pages and hierarchies.

#### Methods

**`extractFaculties(html: string)`**

Extracts faculty links from study plans homepage.

```typescript
const faculties = ExtractInSISStudyPlanService.extractFaculties(html)

// Result
[
  {
    identifier: 'FIS',
    name: 'Fakulta informatiky a statistiky',
    url: 'https://insis.vse.cz/katalog/plany.pl?fakulta=FIS'
  },
  // ...
]
```

**`extractNavigationUrls(html: string): string[]`**

Extracts intermediate navigation URLs (not final plans).

```typescript
const navUrls = ExtractInSISStudyPlanService.extractNavigationUrls(html)

// URLs without stud_plan= parameter
```

**`extractPlanUrls(html: string): string[]`**

Extracts final study plan URLs.

```typescript
const planUrls = ExtractInSISStudyPlanService.extractPlanUrls(html)

// URLs with stud_plan= parameter
```

**`parseGroupCode(code: string): { group: string, category: string }`**

Parses InSIS group code to extract scope and category.

```typescript
const { group, category } = ExtractInSISStudyPlanService.parseGroupCode('fP')
// group: 'faculty_specific'
// category: 'compulsory'

const { group, category } = ExtractInSISStudyPlanService.parseGroupCode('oV2')
// group: 'field_specific_bachelor'
// category: 'elective'
```

**Parsing Rules** (order matters - longest matches first):

1. `TVS*` → group from prefix, category: `physical_education`
2. `*SZ*` → group from prefix, category: `state_exam`
3. `*ZEXCN*` → group from prefix, category: `exchange_program`
4. `*EXC` → group from prefix, category: `prohibited`
5. `*VOR` → group from prefix, category: `beyond_scope`
6. `*J*` → group from prefix, category: `language`
7. `*P` → group from prefix, category: `compulsory`
8. `*V*` → group from prefix, category: `elective`

**`extract(html: string, url: string): ScraperInSISStudyPlan | null`**

Main extraction method. Parses study plan metadata and courses.

```typescript
const plan = ExtractInSISStudyPlanService.extract(html, url)

if (!plan) {
  console.error('Failed to extract study plan')
  return
}

// plan contains all fields (see Job 4 documentation)
```

---

### InSISQueueService

**Location:** `src/Services/InSISQueueService.ts`

Manages BullMQ queue operations for scraping jobs.

#### Methods

**`addCatalogResponse(urls: string[]): Promise<void>`**

Adds catalog scraping result to response queue.

```typescript
await InSISQueueService.addCatalogResponse([
  'https://insis.vse.cz/katalog/syllabus.pl?predmet=12345',
  // ... more URLs
])
```

**`addCourseResponse(course: ScraperInSISCourse): Promise<void>`**

Adds scraped course to response queue.

```typescript
await InSISQueueService.addCourseResponse(course)
```

**`addStudyPlansResponse(plans: { urls: string[] }): Promise<void>`**

Adds study plans list to response queue.

```typescript
await InSISQueueService.addStudyPlansResponse({ urls })
```

**`addStudyPlanResponse(plan: ScraperInSISStudyPlan): Promise<void>`**

Adds scraped study plan to response queue.

```typescript
await InSISQueueService.addStudyPlanResponse(plan)
```

**`queueCourseRequests(courses: string[]): Promise<void>`**

Bulk adds course scraping requests with deduplication.

```typescript
await InSISQueueService.queueCourseRequests([
  'https://insis.vse.cz/katalog/syllabus.pl?predmet=12345',
  // ... more URLs
])

// Each job gets deduplication ID: 'InSIS:Course:12345'
```

**`queueStudyPlanRequests(urls: string[], extractIdFn): Promise<void>`**

Bulk adds study plan scraping requests with deduplication.

```typescript
await InSISQueueService.queueStudyPlanRequests(
  urls,
  (url) => extractIdFromUrl(url) // Custom ID extraction
)

// Each job gets deduplication ID: 'InSIS:StudyPlan:12345'
```

---

### MarkdownService

**Location:** `src/Services/MarkdownService.ts`

Converts HTML content to Markdown using Turndown.

#### Methods

**`convertToMarkdown(html: string): string`**

Converts HTML to clean Markdown.

```typescript
const markdown = MarkdownService.convertToMarkdown(`
  <h2>Course Aims</h2>
  <p>This course teaches <strong>Java programming</strong>.</p>
  <ul>
    <li>Object-oriented concepts</li>
    <li>Design patterns</li>
  </ul>
`)

// Result:
// ## Course Aims
//
// This course teaches **Java programming**.
//
// - Object-oriented concepts
// - Design patterns
```

**Configuration:**
- Heading style: `setext` (underlined H1/H2)
- Bullet list marker: `-`
- Removes extra blank lines

---

### DateService

**Location:** `src/Services/DateService.ts`

Date parsing utilities with Prague timezone support.

#### Methods

**`parseDate(dateString: string): Date | null`**

Parses date strings in various formats.

```typescript
const date = DateService.parseDate('31.1.2024')
// Returns: Date object in Europe/Prague timezone

const date = DateService.parseDate('2024-01-31')
// Returns: Date object
```

**Supported Formats:**
- `DD.MM.YYYY`
- `YYYY-MM-DD`
- ISO 8601

---

## HTTP Client

### Request Configuration

**Base URL:** `https://insis.vse.cz`

**Endpoints:**
- Catalog: `/katalog/`
- Extended search: `/katalog/index.pl?jak=rozsirene`
- Course syllabus: `/katalog/syllabus.pl?predmet={id}`
- Study plans: `/katalog/plany.pl?lang=cz`
- Study plan detail: `/katalog/syllabus_planu.pl?stud_plan={id}`

### Browser Emulation

The client emulates Chrome 142 on Windows to avoid detection:

```typescript
{
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept-Language': 'cs,en-US;q=0.9,en;q=0.8',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Referer': 'https://insis.vse.cz'
}
```

### Request Helpers

**`withCzechLang(url: string): string`**

Adds Czech language parameter to URL.

```typescript
const url = withCzechLang('https://insis.vse.cz/katalog/syllabus.pl?predmet=12345')
// Returns: 'https://insis.vse.cz/katalog/syllabus.pl?predmet=12345&lang=cz'
```

---

## Data Extraction

### HTML Parsing with Cheerio

Cheerio provides jQuery-like API for HTML parsing without a browser.

**Basic Pattern:**

```typescript
import * as cheerio from 'cheerio'

const $ = cheerio.load(html)

// Select elements
const title = $('h1.course-title').text()
const links = $('a[href*="syllabus.pl"]')
  .map((_, el) => $(el).attr('href'))
  .get()

// Traverse DOM
$('table.timetable tr').each((_, row) => {
  const cells = $(row).find('td')
  const day = $(cells[0]).text()
  const time = $(cells[1]).text()
  // ...
})
```

### Common Extraction Patterns

#### Pattern 1: Label-Value Pairs

```typescript
function getRowValueCaseInsensitive($: CheerioAPI, label: string): string {
  const row = $('tr').filter((_, el) => {
    const text = $(el).text().toLowerCase()
    return text.includes(label.toLowerCase())
  }).first()

  return row.find('td').eq(1).text().trim()
}

// Usage
const ects = getRowValueCaseInsensitive($, 'počet kreditů')
```

#### Pattern 2: Multi-Line Cells

```typescript
function parseMultiLineCell($: CheerioAPI, element: Cheerio<any>): string[] {
  const html = element.html() || ''
  return html
    .split('<br>')
    .map(line => $(line).text().trim())
    .filter(Boolean)
}

// Usage
const lecturers = parseMultiLineCell($, $('td.lecturers'))
```

#### Pattern 3: Table Extraction

```typescript
function extractTable($: CheerioAPI, selector: string) {
  const rows: any[] = []

  $(`${selector} tr`).each((i, row) => {
    if (i === 0) return // Skip header

    const cells = $(row).find('td')
    rows.push({
      col1: $(cells[0]).text().trim(),
      col2: $(cells[1]).text().trim(),
      // ...
    })
  })

  return rows
}

// Usage
const assessments = extractTable($, 'table.assessment-methods')
```

#### Pattern 4: Section Content

```typescript
function getSectionContent($: CheerioAPI, header: string): string {
  const h2 = $('h2').filter((_, el) =>
    $(el).text().includes(header)
  ).first()

  if (!h2.length) return ''

  let html = ''
  let next = h2.next()

  while (next.length && !next.is('h2')) {
    html += $.html(next)
    next = next.next()
  }

  return MarkdownService.convertToMarkdown(html)
}

// Usage
const aims = getSectionContent($, 'Cíle předmětu')
```

### Text Cleaning

**`cleanText(text: string): string`**

Normalizes whitespace and removes `&nbsp;`.

```typescript
const clean = cleanText('  Hello\u00A0\u00A0World  ')
// Returns: 'Hello World'
```

**`serializeValue(value: string): string`**

Removes newlines/tabs and trims.

```typescript
const clean = serializeValue('Hello\n\tWorld\n')
// Returns: 'Hello World'
```

---

## Queue Management

### Queue Setup

**Location:** `src/bullmq.ts`

```typescript
const scraper = {
  queue: {
    request: new Queue<ScraperRequestJob>(
      'ScraperRequestQueue',
      { connection: redis.options }
    ),
    response: new Queue<ScraperResponseJob>(
      'ScraperResponseQueue',
      { connection: redis.options }
    )
  },

  worker: {
    request: new Worker<ScraperRequestJob>(
      'ScraperRequestQueue',
      withSentryJobHandler('ScraperRequestQueue', ScraperRequestHandler),
      {
        connection: redis.options,
        concurrency: 1  // Sequential processing
      }
    )
  }
}
```

### Concurrency

**Worker Concurrency: 1**

Processes jobs sequentially to avoid:
- Rate limiting by InSIS
- Overloading the target server
- Race conditions

**Sub-Task Concurrency: 10**

Within jobs, parallel requests are limited:

```typescript
await runWithConcurrency(urls, 10, async (url) => {
  const html = await client.getSilent<string>(url)
  return processHtml(html)
})
```

### Deduplication

Prevents re-processing the same resource.

**Job ID Format:**
- Courses: `InSIS:Course:{courseId}`
- Study Plans: `InSIS:StudyPlan:{planId}`

**Implementation:**

```typescript
await queue.add(
  'InSIS:Course',
  { type: 'InSIS:Course', url },
  {
    deduplication: {
      id: `InSIS:Course:${courseId}`
    }
  }
)
```

**Behavior:** If a job with the same deduplication ID exists in queue, the new job is rejected.

---

## Configuration

### Config Object

**Location:** `src/Config/Config.ts`

```typescript
const Config = {
  // Environment
  env: process.env.ENV || 'development',

  // Sentry
  sentry: {
    dsn: process.env.SENTRY_DSN,
    release: process.env.SENTRY_RELEASE
  },

  // Redis
  redis: {
    uri: process.env.REDIS_URI!,
    password: process.env.REDIS_PASSWORD
  },

  // InSIS Endpoints
  insis: {
    baseDomain: 'https://insis.vse.cz',
    catalogUrl: 'https://insis.vse.cz/katalog/',
    catalogExtendedSearchUrl: 'https://insis.vse.cz/katalog/index.pl?jak=rozsirene',
    studyPlansUrl: 'https://insis.vse.cz/katalog/plany.pl?lang=cz',
    defaultReferrer: 'https://insis.vse.cz'
  }
}
```

### Environment Variables

**Required:**
- `REDIS_URI` - Redis connection string

**Optional:**
- `ENV` - Runtime environment (local/development/production)
- `REDIS_PASSWORD` - Redis authentication
- `SENTRY_DSN` - Sentry error tracking
- `SENTRY_RELEASE` - Release version

### Loading Priority

1. Root `.env` (repository root)
2. Parent `.env` (`../`)
3. Current directory `.env`

---

## Error Handling

### Exception Handling

**Pattern:** Graceful degradation with null returns.

```typescript
try {
  const html = await client.get<string>(url)
  if (!html.success) return null

  const course = ExtractInSISCourseService.extract(html.data, url)
  if (!course) return null

  await InSISQueueService.addCourseResponse(course)
  return course
} catch (error) {
  LoggerJobContext.add({
    error: 'Extraction error',
    message: (error as Error).message
  })
  return null
}
```

**Benefits:**
- Jobs don't fail on single errors
- Partial success is possible
- Errors are logged but don't stop processing

### HTTP Error Handling

**In InSISHTTPClientService:**

```typescript
try {
  const response = await axios.get(url)
  return { success: true, data: response.data }
} catch (error) {
  if (axios.isAxiosError(error)) {
    LoggerJobContext.add({
      error: 'HTTP request failed',
      status: error.response?.status,
      statusText: error.response?.statusText,
      url
    })
  }
  return { success: false, error }
}
```

### Sentry Integration

**Wrapper:** `withSentryJobHandler()`

Wraps job handlers with Sentry error tracking:

```typescript
export function withSentryJobHandler<T>(
  queueName: string,
  handler: (job: Job<T>) => Promise<any>
) {
  return async (job: Job<T>) => {
    try {
      return await handler(job)
    } catch (error) {
      sentry.captureException(error, {
        tags: {
          queue: queueName,
          jobType: job.name
        },
        extra: {
          jobId: job.id,
          jobData: job.data
        }
      })
      throw error
    }
  }
}
```

---

## Logging

### Structured Logging with AsyncLocalStorage

**Location:** `src/Context/LoggerJobContext.ts`

Uses AsyncLocalStorage for context isolation between concurrent jobs.

#### Context Flow

```typescript
// 1. Handler creates context
const logContext = LoggerJobContext.create({
  job_id: job.id,
  job_name: job.name,
  job_type: job.data.type,
  attempt: job.attemptsMade
})

await logContext.run(async () => {
  // 2. Job execution
  const result = await executeJob(job.data)

  // 3. Service adds context
  LoggerJobContext.add({
    course_id: result.id,
    urls_extracted: result.urls.length
  })

  // 4. Final log
  LoggerJobContext.finalize('success')
})
```

#### Methods

**`create(context: JobContext): AsyncLocalStorage`**

Creates new context with initial values.

**`add(context: Partial<JobContext>): void`**

Adds fields to current context.

```typescript
LoggerJobContext.add({
  course_id: 12345,
  urls_extracted: 150
})
```

**`finalize(status: 'success' | 'error', error?: Error): void`**

Logs final result with accumulated context.

```typescript
try {
  // Job execution
  LoggerJobContext.finalize('success')
} catch (error) {
  LoggerJobContext.finalize('error', error as Error)
}
```

#### Log Entry Format

```json
{
  "level": "INFO",
  "timestamp": "2024-01-31T10:15:30.123Z",
  "job_id": "abc123",
  "job_name": "InSIS Course Request",
  "job_type": "InSIS:Course",
  "queue_name": "ScraperRequestQueue",
  "attempt": 1,
  "status": "success",
  "duration_ms": 2456,
  "course_id": 12345,
  "url": "https://insis.vse.cz/katalog/syllabus.pl?predmet=12345"
}
```

---

## Utilities

### HTMLUtils

**Location:** `src/Utils/HTMLUtils.ts`

DOM and text manipulation utilities.

**Methods:**

```typescript
cleanText(text: string): string
// Normalizes whitespace, removes &nbsp;

serializeValue(value: string): string
// Removes newlines/tabs, trims

normalizeUrl(href: string | undefined, base: string): string
// Converts relative URLs to absolute

getRowValueCaseInsensitive($: CheerioAPI, label: string): string
// Finds table row by label, returns next cell value

getSectionContent($: CheerioAPI, header: string): string
// Extracts content between headers, converts to Markdown

parseMultiLineCell($: CheerioAPI, element: Cheerio<any>): string[]
// Splits <br> tags, returns array of lines

sanitizeBodyHtml($: CheerioAPI): void
// Replaces &nbsp; entities before parsing
```

---

### HTTPUtils

**Location:** `src/Utils/HTTPUtils.ts`

HTTP request utilities.

**Methods:**

```typescript
withCzechLang(url: string): string
// Adds lang=cz parameter to URL

getBrowserHeaders(): Record<string, string>
// Returns browser-like headers for requests
```

---

### InSISUtils

**Location:** `src/Utils/InSISUtils.ts`

InSIS-specific parsing utilities.

**Methods:**

```typescript
extractSemesterAndYear(text: string): { semester: 'ZS' | 'LS', year: number } | null
// Parses semester/year from strings like "ZS 2023/2024"

matchesPeriod(text: string, periods: Array<{ semester, year }>): boolean
// Checks if text contains any of the specified periods
```

---

### ConcurrencyUtils

**Location:** `src/Utils/ConcurrencyUtils.ts`

Parallel task execution with concurrency limits.

**Methods:**

```typescript
async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]>
```

Executes async function for each item with max concurrency.

**Example:**

```typescript
const urls = [...100 URLs...]

const results = await runWithConcurrency(urls, 10, async (url) => {
  const html = await client.getSilent<string>(url)
  return extractData(html)
})

// Processes 100 URLs with max 10 concurrent requests
```

---

## Design Patterns

### 1. Job Routing Pattern

**Single entry point** routes jobs to specific handlers.

```typescript
export default async function ScraperRequestHandler(
  job: Job<ScraperRequestJob>
): Promise<any> {
  switch (job.data.type) {
    case 'InSIS:Catalog':
      return ScraperRequestInSISCatalogJob(job.data)

    case 'InSIS:Course':
      return ScraperRequestInSISCourseJob(job.data)

    case 'InSIS:StudyPlans':
      return ScraperRequestInSISStudyPlansJob(job.data)

    case 'InSIS:StudyPlan':
      return ScraperRequestInSISStudyPlanJob(job.data)

    default:
      throw new Error(`Unknown job type: ${(job.data as any).type}`)
  }
}
```

**Benefits:**
- Type-safe routing
- Centralized logging
- Easy to add new job types

---

### 2. Service Layer Pattern

**Separation of concerns:**
- HTTP client handles requests
- Extraction services parse HTML
- Queue service manages BullMQ operations

```typescript
// Job Handler (orchestration)
const client = createInSISClient('course')
const result = await client.get<string>(url)
const course = ExtractInSISCourseService.extract(result.data, url)
await InSISQueueService.addCourseResponse(course)

// Each service is independently testable
```

---

### 3. Context Isolation Pattern

**AsyncLocalStorage** prevents context bleeding.

```typescript
// Job A and Job B run concurrently
LoggerJobContext.create({ job_id: 'A' }).run(async () => {
  LoggerJobContext.add({ course_id: 123 })
  // Context: { job_id: 'A', course_id: 123 }
})

LoggerJobContext.create({ job_id: 'B' }).run(async () => {
  LoggerJobContext.add({ plan_id: 456 })
  // Context: { job_id: 'B', plan_id: 456 }
})

// Contexts are isolated
```

---

### 4. Deduplication Pattern

**Job IDs prevent duplicate processing.**

```typescript
const courseId = extractIdFromUrl(url)

await queue.add(
  'InSIS:Course',
  { type: 'InSIS:Course', url },
  {
    deduplication: {
      id: `InSIS:Course:${courseId}`
    }
  }
)

// If same courseId queued again, rejected
```

---

### 5. Graceful Degradation Pattern

**Null returns instead of exceptions.**

```typescript
try {
  const html = await client.get<string>(url)
  if (!html.success) return null  // Failed request

  const course = ExtractInSISCourseService.extract(html.data, url)
  if (!course) return null  // Failed extraction

  await InSISQueueService.addCourseResponse(course)
  return course
} catch (error) {
  LoggerJobContext.add({ error: error.message })
  return null  // Logged error, continue
}
```

**Benefits:**
- Partial success possible
- Jobs don't fail completely
- Errors logged for investigation

---

### 6. Hierarchical Traversal Pattern

**Breadth-first search through navigation tree.**

```typescript
let currentLevel = [rootUrl]
const finalUrls: string[] = []
const maxDepth = 8

for (let depth = 0; depth < maxDepth; depth++) {
  const results = await runWithConcurrency(currentLevel, 10, async (url) => {
    const html = await client.getSilent<string>(url)
    return {
      navigation: extractNavigationUrls(html),
      final: extractPlanUrls(html)
    }
  })

  finalUrls.push(...results.flatMap(r => r.final))
  currentLevel = results.flatMap(r => r.navigation)

  if (currentLevel.length === 0) break
}

return finalUrls
```

---

## Development Guide

### Adding a New Job Type

1. **Define job interface** in `src/Interfaces/ScraperRequestJob.ts`:

```typescript
export interface ScraperRequestInSISNewTypeJob {
  type: 'InSIS:NewType'
  url: string
  // ... other parameters
}

export type ScraperRequestJob =
  | ScraperRequestInSISCatalogJob
  | ScraperRequestInSISCourseJob
  | ScraperRequestInSISStudyPlansJob
  | ScraperRequestInSISStudyPlanJob
  | ScraperRequestInSISNewTypeJob  // Add here
```

2. **Create job handler** in `src/Jobs/ScraperRequestInSISNewTypeJob.ts`:

```typescript
import { ScraperRequestInSISNewTypeJob } from '@scraper/Interfaces/ScraperRequestJob'
import { createInSISClient } from '@scraper/Services/InSISHTTPClientService'

export default async function ScraperRequestInSISNewTypeJob(
  data: ScraperRequestInSISNewTypeJob
): Promise<any> {
  const client = createInSISClient('newtype')

  const result = await client.get<string>(data.url)
  if (!result.success) return null

  // Extract data
  const extracted = extractData(result.data)

  // Queue response
  await InSISQueueService.addNewTypeResponse(extracted)

  return extracted
}
```

3. **Add to router** in `src/Handlers/ScraperRequestHandler.ts`:

```typescript
export default async function ScraperRequestHandler(
  job: Job<ScraperRequestJob>
): Promise<any> {
  switch (job.data.type) {
    // ... existing cases
    case 'InSIS:NewType':
      return ScraperRequestInSISNewTypeJob(job.data)

    default:
      throw new Error(`Unknown job type: ${(job.data as any).type}`)
  }
}
```

4. **Create extraction service** in `src/Services/ExtractInSISNewTypeService.ts`:

```typescript
export default class ExtractInSISNewTypeService {
  static extract(html: string, url: string): ScraperInSISNewType | null {
    const $ = cheerio.load(html)

    // Parse HTML
    const data = {
      id: extractId(url),
      title: $('h1').text(),
      // ... more fields
    }

    return data
  }
}
```

5. **Add response handler** in API's `ScraperResponseHandler.ts`:

```typescript
case 'InSIS:NewType':
  await ScraperResponseInSISNewTypeJob(job.data)
  break
```

---

### Testing Extraction Logic

**Unit Testing with Cheerio:**

```typescript
import * as cheerio from 'cheerio'
import ExtractInSISCourseService from './ExtractInSISCourseService'

// Save real HTML to file for testing
const fs = require('fs')
const html = fs.readFileSync('test-data/course-12345.html', 'utf-8')

const course = ExtractInSISCourseService.extract(html, 'test-url')

console.log('Extracted course:', course)
console.log('ECTS:', course?.ects)
console.log('Lecturers:', course?.lecturers)
```

**Manual Testing:**

```bash
# Run scraper
pnpm run dev

# In another terminal, trigger job via API
curl -X POST http://localhost:40080/commands/insis/course \
  -H "Authorization: Bearer $API_COMMAND_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://insis.vse.cz/katalog/syllabus.pl?predmet=12345"}'

# Check logs
# Watch BullMQ queue in Redis
docker exec -it kreditozrouti-redis redis-cli
> KEYS bull:ScraperRequestQueue:*
```

---

### Debugging

**Enable verbose logging:**

```typescript
// src/Context/LoggerJobContext.ts
LoggerJobContext.add({
  debug_html_length: html.length,
  debug_extracted_fields: Object.keys(course)
})
```

**Inspect HTML:**

```typescript
import * as fs from 'fs'

// Save HTML for inspection
const html = await client.get<string>(url)
fs.writeFileSync(`debug-${Date.now()}.html`, html.data)
```

**Check Redis queue:**

```bash
docker exec -it kreditozrouti-redis redis-cli

# List all keys
> KEYS *

# Check queue length
> LLEN bull:ScraperRequestQueue:wait

# Inspect job
> HGETALL "bull:ScraperRequestQueue:12345"

# Check failed jobs
> LLEN bull:ScraperRequestQueue:failed
```

**Sentry Dashboard:**

Check error reports at your Sentry project URL for:
- Exception details
- Stack traces
- Job context
- Error frequency

---

### Performance Optimization

**Concurrency Tuning:**

```typescript
// Increase parallel requests (carefully)
await runWithConcurrency(urls, 20, processUrl)  // Was 10

// Adjust worker concurrency
concurrency: 2  // Was 1 (test for rate limits)
```

**Caching Responses:**

```typescript
// Cache parsed HTML in Redis
const cacheKey = `scraper:html:${courseId}`
let html = await redis.get(cacheKey)

if (!html) {
  const result = await client.get<string>(url)
  html = result.data
  await redis.setex(cacheKey, 3600, html)  // 1 hour
}
```

**Batch Processing:**

```typescript
// Process multiple URLs in single job
interface BatchJob {
  type: 'InSIS:CourseBatch'
  urls: string[]
}

// Process all URLs, collect results
const results = await runWithConcurrency(urls, 10, processCourse)
```

---

### Deployment

**Docker Build:**

```bash
cd scraper
docker build -t kreditozrouti-scraper -f Dockerfile ..
```

**Environment:**

```env
ENV=production
REDIS_URI=redis://production-redis:6379
REDIS_PASSWORD=secure-password
SENTRY_DSN=https://xxx@sentry.io/yyy
SENTRY_RELEASE=v1.0.0
```

**Cluster Mode:**

```bash
# Start with 4 workers
node dist/index.js 4
```

**Monitoring:**

- Sentry for error tracking
- Redis monitoring for queue depth
- BullMQ UI for job inspection
- Pino logs for debugging

---

## Troubleshooting

### Common Issues

**Jobs not processing:**

```bash
# Check Redis connection
docker exec -it kreditozrouti-redis redis-cli PING

# Check queue length
docker exec -it kreditozrouti-redis redis-cli LLEN bull:ScraperRequestQueue:wait

# Check worker is running
ps aux | grep node
```

**Extraction returns null:**

```typescript
// Add debug logging
LoggerJobContext.add({
  html_length: html.length,
  html_preview: html.substring(0, 200),
  selector_found: !!$('h1').length
})
```

**Rate limiting by InSIS:**

- Reduce concurrency: `runWithConcurrency(urls, 5, ...)`
- Reduce worker concurrency: `concurrency: 1`
- Add delays between requests
- Check if IP is blocked

**Memory issues:**

- Increase Node.js heap: `node --max-old-space-size=4096 dist/index.js`
- Process in smaller batches
- Clear references after processing

**Parsing errors:**

```typescript
// Save problematic HTML
if (!course) {
  fs.writeFileSync(
    `failed-${courseId}.html`,
    html,
    'utf-8'
  )
  LoggerJobContext.add({ saved_html: `failed-${courseId}.html` })
}
```

**Deduplication issues:**

```bash
# Check deduplication keys
docker exec -it kreditozrouti-redis redis-cli KEYS "bull:ScraperRequestQueue:*:deduplication"

# Clear deduplication (use with caution)
docker exec -it kreditozrouti-redis redis-cli DEL "bull:ScraperRequestQueue:InSIS:Course:12345:deduplication"
```

---

## Additional Resources

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Cheerio Documentation](https://cheerio.js.org/)
- [Axios Documentation](https://axios-http.com/)
- [Pino Documentation](https://getpino.io/)
- [Turndown Documentation](https://github.com/mixmark-io/turndown)
- [AsyncLocalStorage](https://nodejs.org/api/async_context.html#class-asynclocalstorage)

---

## Summary

The Scraper is a robust job-processing service that:

- **Discovers** courses and study plans via hierarchical traversal
- **Scrapes** detailed data from InSIS pages using Cheerio
- **Extracts** structured information with comprehensive parsing logic
- **Queues** results to API via BullMQ for persistence
- **Handles** errors gracefully with structured logging
- **Prevents** duplicate work via job deduplication
- **Scales** via cluster mode with multiple workers
- **Monitors** via Sentry error tracking

The architecture emphasizes reliability, maintainability, and performance through service-oriented design, context isolation, and graceful degradation patterns.
