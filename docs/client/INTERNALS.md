# Client — Internals

API client, i18n, types, utilities, and patterns.

---

## API Client (`src/api.ts`)

A single Axios instance shared by all services:

```typescript
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? '/api',
    headers: {'Content-Type': 'application/json', Accept: 'application/json'},
    timeout: 10000,
})
```

### Global Error Interceptor

All non-2xx responses automatically add an alert to `alertsStore`:

```typescript
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Formats title: "404. Not Found"
        // Formats description from error code enum
        alerts.addAlert({type: 'error', title, description, timeout: 20000})
        return Promise.reject(error.response?.data ?? error)
    }
)
```

**Bypassing the interceptor:** `courseService.triggerCourseScrape()` passes
`validateStatus: (s) => s === 202 || s === 429` so 429 is treated as a valid response and doesn't trigger the global
alert. The composable checks the status and throws `RateLimitedError` itself.

### Services

Services (`src/services/`) are the only files that call `api`. Stores call services — never `api` directly.

```typescript
// courseService.ts
fetchCourses(filters) → POST / courses → CoursesResponseDTO
triggerCourseScrape(id) → POST / courses /
:
id / scrape → {
    jobId
}

// studyPlanService.ts
fetchStudyPlans(filters) → POST / study_plans → StudyPlansResponseDTO
fetchStudyPlanCourses(filters) → POST / study_plans / courses → CoursesResponseDTO

// adminService.ts
getQueueStats() → various
admin
endpoints
triggerScraper(type, params) → POST / commands / insis/*
```

---

## i18n (`src/i18n.ts`)

Czech (`cs`) and English (`en`), with Czech as default. Locale persisted to `localStorage['locale']`.

**In components:** use `useI18n()` composable.

**In stores and composables (outside component setup):** use `i18n.global`:

```typescript
import {i18n} from '@client/i18n'

const {t} = i18n.global
```

**Czech plural rules** (`utils/pluralization.ts`):

```typescript
czechPluralRule(choice, choicesLength)
:
0 | 1 | 2
// 0 items → form 2 (many: "kurzů")
// 1 item  → form 0 (singular: "kurz")
// 2–4     → form 1 (few: "kurzy")
// 5+      → form 2 (many: "kurzů")
```

Registered in `createI18n` at bootstrap. Translation files: `src/locales/cs.json` and `src/locales/en.json`.

---

## Types (`src/types/`)

All types exported from `src/types/index.ts`.

### Core types

```typescript
// types/course.ts
type CourseUnitType = 'lecture' | 'exercise' | 'seminar'
type CourseStatusType = 'selected' | 'conflict' | 'campus-conflict' | 'incomplete'

interface SelectedCourseUnit {
    courseId,
    courseIdent,
    courseTitle,
    ...,
    snapshotAvailableTypes?
}

interface CourseStatus {
    id,
    ident,
    status,
    conflictsWith,
    campusConflictsWith,
    missingTypes
}

interface SlotConflictInfo {
    slotId,
    conflictingUnits,
    conflictType: 'hard' | 'campus'
}

// types/timetable.ts
interface DragSelection {
    active,
    startDay,
    startTime,
    endDay,
    endTime
}

interface PersistedTimetableState {
    selectedUnits: SelectedCourseUnit[]
}

// types/wizard.ts
interface SelectedStudyPlan {
    id,
    ident,
    title
}

interface PersistedWizardState {
    facultyId,
    year,
    semester,
    selectedStudyPlans,
    completedCourseIdents,
    completed
}

// types/ui.ts
interface PersistedUIState {
    viewMode,
    sidebarCollapsed,
    showLegend
}

type ViewMode = 'list' | 'timetable'

// types/alert.ts
interface Alert {
    customId?,
    type,
    title?,
    description?,
    buttons?,
    timeout?,
    _timeout?
}

// types/api.ts
interface PaginationMeta {
    limit,
    offset,
    count,
    total
}
```

### Shared types

Types imported from `@shared/*` are used directly — no re-export wrappers:

```typescript
import type {InSISDay, InSISSemester} from '@shared/domain/insis'
import type {TimeSelection} from '@shared/domain/time'
import type {CourseWithRelationsDTO, CourseUnitDTO, CourseUnitSlotDTO} from '@shared/http/responses'
import type {CoursesFilter} from '@shared/http/courses'
import type {FacetItem} from '@shared/http/facets'
```

API types consumed by the client come from `@api/Contracts`, not from `@api/Database/types` directly.

---

## Utils (`src/utils/`)

Pure functions, no Vue reactivity, safe to call from stores.

### `utils/course.ts`

```typescript
getSlotType(slot
:
CourseUnitSlot
):
CourseUnitType
// Checks slot.type for Czech/English keywords:
// přednáška / lecture → 'lecture'
// cvičení / exercise  → 'exercise'
// seminář / seminar   → 'seminar'
// default             → 'lecture'

getUnitTypeColorClass(type)
:
string
// Returns CSS var class: bg-(--insis-block-lecture|exercise|seminar)

getCategoryBadgeClass(category)
:
string
// 'compulsory' → 'insis-badge-compulsory'
// 'elective'   → 'insis-badge-elective'
// else         → 'insis-badge-other'
```

### `utils/day.ts`

```typescript
getDayFromDate(dateStr
:
string | null
):
InSISDay | null
// Parses 'DD.MM.YYYY' → JavaScript Date → day-of-week → InSISDay
// JS getDay(): 0=Sunday → index 6 in DAYS_ORDER

getDayIndex(day
:
InSISDay | null
):
number
// Position in DAYS_ORDER (Mon=0 ... Sun=6), 999 for invalid

getSlotDay(slot)
:
InSISDay | null
// slot.day ?? getDayFromDate(slot.date)

compareDateStrings(a, b
:
string
):
number
// Chronological sort comparator for 'DD.MM.YYYY' strings

parseDateString(dateStr
:
string
):
Date | null
```

### `utils/timetable.ts`

Re-exports from `@shared/domain/timetable`:

```typescript
export {
    CAMPUS_TRAVEL_MINUTES, checkCourseCompleteness, getCampus,
    unitsCampusConflict, unitsConflict
} from '@shared/domain/timetable'
```

The actual conflict detection logic lives in the shared package so it can be used by both client and API.

### `utils/localstorage.ts`

```typescript
saveToStorage<T>(key, state
:
T
):
void
    loadFromStorage<T>(key)
:
T | null    // null on parse error; removes corrupt key automatically
removeFromStorage(key)
:
void
    hasInStorage(key)
:
boolean
```

### `utils/tailwind.ts`

```typescript
cn(...inputs
:
ClassValue[]
):
string  // clsx + tailwind-merge
```

Used throughout components for conditional class merging.

---

## Constants (`src/constants/`)

### `constants/timetable.ts`

```typescript
WEEKDAYS: InSISDay[]         // Mon–Fri
ALL_DAYS: InSISDay[]         // Mon–Sun
DAYS_ORDER: readonly
InSISDay[]  // canonical sort order from InSISDayValues

TIME_CONFIG = {
    START: 450,          // 07:30
    END: 1200,           // 20:00
    SLOT_DURATION: 45,   // minutes
    BREAK_DURATION: 15,  // minutes
}

GRID_ROW_HEIGHT = 60         // px
GRID_BLOCK_PADDING = 2       // px
DRAG_THRESHOLD = 20          // px
TIME_SNAP_INTERVAL = 15      // minutes
```

### `constants/debounce.ts`

```typescript
DEBOUNCE_TIMING = {
    SEARCH: 750,  // ms — for user-visible search inputs
    API: 300,     // ms — for rapid filter changes
}
```

### `constants/pagination.ts`

```typescript
PAGINATION_DEFAULTS = {PAGE_SIZE: 50}
```

### `constants/storage.ts`

```typescript
STORAGE_KEYS = {
    TIMETABLE: 'kreditozrouti:timetable',
    WIZARD: 'kreditozrouti:wizard',
    UI: 'kreditozrouti:ui',
}
```

---

## Component Conventions

### File-Based Routing

Routes are auto-generated from `src/pages/` by `unplugin-vue-router`. File name = route path. No `router/index.ts` to
maintain.

```
pages/index.vue   →  /
pages/courses.vue →  /courses
pages/admin.vue   →  /admin
```

### Composition API

All components use `<script setup lang="ts">`. No Options API.

### Props Typing

```vue

<script setup lang="ts">
  interface Props {
    courseId: number
    title?: string
  }

  const props = withDefaults(defineProps<Props>(), {title: ''})
</script>
```

### Emit Typing

```vue

<script setup lang="ts">
  const emit = defineEmits<{
    change: [value: string]
    close: []
  }>()
</script>
```

### Store Access in Components

```vue

<script setup lang="ts">
  import {useCoursesStore} from '@client/stores'

  const coursesStore = useCoursesStore()
</script>

<template>
  <p>{{ coursesStore.pagination.total }} courses</p>
</template>
```

---

## Accessibility

- `ScreenReaderAnnouncer.vue` renders an ARIA live region driven by `announcer.store`
- `timetableStore` and `coursesStore` call `announcer.announce()` after add/remove and after fetch
- Result counts announced: "Nalezeno 47 kurzů" / "Žádné kurzy nenalezeny"
- ARIA labels on icon-only buttons throughout

---

## SEO

`@unhead/vue` (`useSeoMeta`) sets `<title>` and `<og:title>` dynamically on `courses.vue` based on the active wizard
context:

```typescript
useSeoMeta({
    title: () => `${t('pages.courses.myTimetable')} | ${year} ${semester} – Kreditožrouti`
})
```

---

## Environment Variables

All Vite env vars must be prefixed with `VITE_`:

| Variable                  | Default | Purpose                             |
|---------------------------|---------|-------------------------------------|
| `VITE_API_URL`            | `/api`  | Axios baseURL                       |
| `VITE_FARO_COLLECTOR_URL` | —       | Grafana Faro collector URL (opt-in) |

---

## Error Tracking & Observability (`src/faro.ts`)

Browser telemetry is handled by `@grafana/faro-web-sdk`. `@sentry/vue` has been removed.

### Activation

Faro is **opt-in**: it only initialises when `VITE_FARO_COLLECTOR_URL` is set. If the env var is absent,
`faroModule.init()` is a no-op. This mirrors the previous Sentry behaviour with `VITE_SENTRY_DSN`.

### Initialisation

`faroModule.init(app, router)` is called from `client/src/index.ts` after the Vue app is created:

```typescript
// index.ts
faroModule.init(app, router)
app.mount('#app')
```

### What is captured

| Signal                       | Mechanism                                        |
|------------------------------|--------------------------------------------------|
| JS errors                    | `app.config.errorHandler`                        |
| Unhandled promise rejections | `window.unhandledrejection` listener             |
| Vue component errors         | forwarded through `app.config.errorHandler`      |
| Web Vitals (CLS, LCP, …)     | `@grafana/faro-web-sdk` built-in instrumentation |
| Route navigations            | `router.afterEach` pushes a view event to Faro   |

### Filters

Safari injects `<script type="application/ld+json">` tags that trigger spurious script errors. These are filtered out
before being sent to the collector.

### Intentional exclusion

`TracingInstrumentation` (distributed tracing) is **not** enabled — it requires a Tempo backend. If Tempo is added in
future, re-enable it in `faro.ts`.

### Local dev

Set `VITE_FARO_COLLECTOR_URL=http://localhost:41247/collect` in your local `.env` to send browser telemetry to the local
Alloy instance.
