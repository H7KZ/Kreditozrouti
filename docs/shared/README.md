# Shared — Overview

The `shared/` package contains pure TypeScript modules with no runtime dependencies on any specific service. It is
imported by `api/`, `client/`, and `scraper/` for common types, domain logic, and HTTP contracts.

**Rule:** `shared/` must never import from `api/`, `client/`, or `scraper/`. Its only external dependency is itself.

---

## Directory Structure

```
shared/
├── domain/
│   ├── insis.ts       # InSIS enums, literals, getSlotType()
│   ├── timetable.ts   # Conflict detection, campus logic, completeness check
│   ├── period.ts      # Academic period helpers
│   ├── time.ts        # TimeSelection interface, timeToMinutes(), minutesToTime()
│   ├── day.ts         # getDayFromDate() (shared implementation)
│   └── index.ts       # Re-exports
│
├── http/
│   ├── courses.ts     # CoursesFilter — the full request shape for POST /courses
│   ├── responses.ts   # All DTO interfaces (CourseWithRelationsDTO, StudyPlanDTO, ...)
│   ├── facets.ts      # FacetItem interface
│   ├── pagination.ts  # PaginationMeta interface
│   ├── study-plans.ts # StudyPlansFilter
│   ├── admin.ts       # Admin endpoint types
│   └── index.ts       # Re-exports
│
└── queue/
    ├── names.ts       # Queue name constants (ScraperRequestQueue, ScraperResponseQueue, ...)
    ├── insis.ts       # Scraped data types (ScraperInSISCourse, ScraperInSISStudyPlan, ...)
    ├── jobs.ts        # Job payload types (ScraperRequestJob, ScraperResponseJob)
    └── index.ts       # Re-exports
```

---

## Import Paths

```typescript
// Domain types and logic
import type { InSISDay, InSISSemester, CourseUnitType, ScraperJob } from '@shared/domain/insis'
import { getSlotType } from '@shared/domain/insis'
import type { TimeSelection } from '@shared/domain/time'
import { timeToMinutes, minutesToTime } from '@shared/domain/time'
import { getUpcomingPeriod, getPeriodsForLastYears } from '@shared/domain/period'
import { unitsConflict, unitsCampusConflict, checkCourseCompleteness, CAMPUS_TRAVEL_MINUTES, getCampus } from '@shared/domain/timetable'

// HTTP contracts
import type { CoursesFilter } from '@shared/http/courses'
import type { CoursesResponseDTO, CourseWithRelationsDTO, CourseUnitSlotDTO } from '@shared/http/responses'
import type { FacetItem } from '@shared/http/facets'
import type { PaginationMeta } from '@shared/http/pagination'

// Queue contracts
import { ScraperRequestQueue, ScraperResponseQueue } from '@shared/queue/names'
import type { ScraperRequestJob, ScraperResponseJob } from '@shared/queue/jobs'
```

---

## Further Reading

- [Domain logic](DOMAIN.md) — InSIS enums, conflict detection, period helpers, time utils
- [HTTP contracts](HTTP.md) — DTO interfaces, CoursesFilter, facets, pagination
- [Queue contracts](QUEUE.md) — queue name constants, job payload types, scraped data types
