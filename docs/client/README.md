# Client — Overview

The client is a Vue 3 SPA for browsing, filtering, and scheduling VŠE courses. Users configure a study plan through a
4-step wizard, then search and build a timetable from the available courses.

---

## Layers

```
Pages (src/pages/ — file-based routing)
  └── Components (src/components/)
        └── Stores (src/stores/)           ← state source of truth
              └── Composables (src/composables/)   ← shared logic
                    └── Utils (src/utils/)          ← pure functions
                          └── Services (src/services/) ← API calls via api.ts
```

**Pages** are auto-generated from `src/pages/` by `unplugin-vue-router`. No manual route config needed.

**Components** are thin: they read from stores and call store actions. No API calls directly.

**Stores** (Pinia) hold all state. They call services for API data and utils for pure computation.

**Composables** encapsulate reusable logic — either pure transforms (no Vue lifecycle) or DOM-interactive (with
`onMounted`/`onUnmounted`).

**Utils** are pure functions safe to call from anywhere, including stores.

**Services** (`src/services/`) are the only files that call `api.ts` (Axios).

---

## Pages

### `/` — `src/pages/index.vue`

Landing page. Shows the `StudyPlanWizard` component. Redirects to `/courses` when wizard is completed.

### `/courses` — `src/pages/courses.vue`

Main application page. Redirects back to `/` if wizard is not completed.

**Layout:**

- Left sidebar: `FilterPanel` (collapsible)
- Main content: `CoursesHeader` + `CourseTable` (list view) or `TimetableGrid` (timetable view)
- Right panel: `ScheduleSlotsPanel` (selected course units summary)
- Top bar: `CourseStatusSummary`

**Bootstrap logic on mount:**

1. `coursesStore.initializeFromWizard()` — pre-sets filters from wizard selections
2. `coursesStore.fetchCourses()` — initial data load

`courses.vue` deep-watches `filtersStore.filters` and re-calls `fetchCourses()` on every change.

### `/admin` — `src/pages/admin.vue`

Admin panel (behind `API_COMMAND_TOKEN`). Shows queue stats, scheduler status, error metrics, and manual scraper
triggers.

---

## Bootstrap Sequence (`src/index.ts`)

```
1. createApp(App)
2. createRouter           — auto-routes from src/pages/
3. createI18n             — locale from localStorage 'locale', default 'cs'
4. createPinia
5. faroModule.init(app, router) — if VITE_FARO_COLLECTOR_URL is set
6. app.use(router, i18n, pinia)
7. useAlertsStore()       — initializes store
8. useCoursesStore()      — initializes store
9. useTimetableStore().hydrate()   — loads from localStorage 'kreditozrouti:timetable'
10. useUIStore().hydrate()          — loads from localStorage 'kreditozrouti:ui'
11. useWizardStore().hydrate()      — loads from localStorage 'kreditozrouti:wizard'
                                      also calls completedCoursesStore.hydrate()
                                      and conditionally triggers wizard-data API calls
12. app.mount('#app')
```

Only `timetableStore`, `uiStore`, and `wizardStore` are hydrated at startup. `wizardDataStore` is not — it holds API
responses only and refetches on demand.

---

## Filter Flow

```
User changes a filter
  → FilterPanel calls filtersStore.setFilter(key, value)
  → courses.vue watches filtersStore.filters (deep)
  → calls coursesStore.fetchCourses()
  → fetchCourses reads filtersStore.filters + filtersStore.mergedExcludeTimes
  → POST /courses
  → courses.value, facets.value, pagination.value updated
  → CourseTable re-renders
```

`mergedExcludeTimes` = manual `exclude_times` + timetable times (when `hideConflictingCourses` is on).

Do NOT call `fetchCourses()` from filter setters in `filters.store` — the watch in `courses.vue` handles it
automatically. Exception: `toggleHideConflictingCourses()` calls `fetchCourses()` explicitly because it must pass
timetable times first.

---

## Directory Structure

```
client/src/
├── pages/
│   ├── index.vue           # Landing page + wizard
│   ├── courses.vue         # Main app (filter + table + timetable)
│   └── admin.vue           # Admin panel
│
├── components/
│   ├── common/             # LanguageSwitcher, ThemeToggle, CollapsibleSection, etc.
│   ├── alert/              # Alert, Alerts
│   ├── courses/            # CourseTable, CourseInfo, CourseRowExpanded, UnitSelector,
│   │                       #   CoursesHeader, CourseStatusSummary, CourseRefreshButton
│   ├── filters/            # FilterPanel, FilterCheckboxGroup, FilterTimeRange,
│   │                       #   FilterToggle, CourseStatusFilter
│   ├── timetable/          # TimetableGrid, TimetableCourseBlock, TimetableDragPopover,
│   │                       #   ScheduleSlotsPanel
│   ├── wizard/             # StudyPlanWizard, WizardSteps, WizardStep{Faculty,Year,
│   │                       #   StudyPlan,CompletedCourses}
│   ├── admin/              # AdminDatabaseStats, AdminQueueStats, AdminSchedulers,
│   │                       #   AdminScraperTriggers, AdminErrorMetrics, Admin*Jobs
│   └── ui/                 # Shadcn-style primitives: Button, Alert, etc.
│
├── stores/
│   ├── wizard.store.ts         # 4-step wizard selections + lifecycle
│   ├── wizard-data.store.ts    # Remote data for wizard (study plans, facets)
│   ├── completed-courses.store.ts  # Completed course idents + step 4 UI
│   ├── courses.store.ts        # Course results, pagination, row expansion
│   ├── filters.store.ts        # ALL filter state
│   ├── timetable.store.ts      # Selected units, conflict detection, persistence
│   ├── ui.store.ts             # viewMode, sidebarCollapsed, showLegend
│   ├── drag.store.ts           # Timetable drag selection state
│   ├── alerts.store.ts         # Global notification queue
│   ├── announcer.store.ts      # Screen reader announcements
│   └── schedule-slots.store.ts # Active slot management for ScheduleSlotsPanel
│
├── composables/            # See COMPOSABLES.md
├── services/               # Thin API call wrappers (only files that touch api.ts)
├── utils/                  # Pure functions, no Vue reactivity
├── types/                  # TypeScript interfaces
├── constants/              # Timetable config, debounce timings, storage keys
├── locales/cs.json         # Czech translations
├── locales/en.json         # English translations
│
├── api.ts                  # Axios instance + global error interceptor → alertsStore
├── i18n.ts                 # createI18n setup
└── index.ts                # App bootstrap
```

---

## Path Aliases

| Alias       | Resolves to    | Notes                        |
|-------------|----------------|------------------------------|
| `@client/*` | `./src/*`      | Client source root           |
| `@api/*`    | `../api/src/*` | Type-only imports from API   |
| `@shared/*` | `../shared/*`  | Cross-package pure utilities |

**Rule:** Client may import types from `@api` (use `@api/Contracts`, not `@api/Database/types`) but must not import
runtime API code.

---

## Tech Stack

| Library                              | Purpose                       |
|--------------------------------------|-------------------------------|
| Vue 3 + Composition API              | UI framework                  |
| Pinia                                | State management              |
| Vue Router 4 + `unplugin-vue-router` | File-based routing            |
| Tailwind CSS 4                       | Utility-first styling         |
| Vue I18n 11                          | Czech/English i18n            |
| Axios                                | HTTP client                   |
| Vite 7                               | Build tool + dev server       |
| `@unhead/vue`                        | SEO meta tags                 |
| Lucide icons                         | Icon set via `unplugin-icons` |
