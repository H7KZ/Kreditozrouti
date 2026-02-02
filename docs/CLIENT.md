# Client Documentation

Comprehensive documentation for the Kreditozrouti Vue 3 Client application.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Directory Structure](#directory-structure)
- [Routing](#routing)
- [State Management](#state-management)
- [Composables](#composables)
- [Components](#components)
- [Type System](#type-system)
- [Styling](#styling)
- [Internationalization](#internationalization)
- [API Integration](#api-integration)
- [Build Configuration](#build-configuration)
- [Features](#features)
- [Development Guide](#development-guide)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Client is a modern Vue 3 single-page application (SPA) that provides an interface for browsing university courses and building course schedules. It features a study plan wizard, advanced filtering, timetable visualization, and conflict detection.

**Key Features:**
- Study plan selection wizard (3-step flow)
- Advanced course filtering with facets
- Dual-view mode (list and timetable)
- Drag-to-filter on timetable
- Real-time conflict detection
- Course completeness checking
- Multi-language support (Czech, English)
- Responsive design
- LocalStorage persistence

**Tech Stack:**
- Vue 3 (Composition API with `<script setup>`)
- Pinia (state management)
- Vue Router 4 (file-based routing)
- TypeScript
- Tailwind CSS 4
- Vite
- Axios
- Vue I18n

---

## Architecture

### Application Flow

```
┌──────────────────────────────────────┐
│  Landing Page (/)                    │
│  - Study Plan Selection Wizard      │
│  - 3 Steps: Faculty → Year → Plans  │
└──────────────┬───────────────────────┘
               │ Wizard Complete
               ▼
┌──────────────────────────────────────┐
│  Courses Page (/courses)             │
│  ┌────────────┬─────────────────────┐│
│  │ Filters    │ Course List View    ││
│  │ (Sidebar)  │ or                  ││
│  │            │ Timetable Grid View ││
│  └────────────┴─────────────────────┘│
└──────────────────────────────────────┘
```

### Data Flow

```
User Action
    ↓
Component Event Handler
    ↓
Pinia Store Action
    ↓
API Request (via Axios)
    ↓
Store State Update
    ↓
Component Reactive Re-render
    ↓
LocalStorage Persistence
```

### State Management Architecture

```
┌─────────────────────────────────────────────┐
│              Pinia Stores                   │
├─────────────┬──────────────┬────────────────┤
│ Wizard      │ Courses      │ Timetable      │
│ (Persisted) │ (Transient)  │ (Persisted)    │
│             │              │                │
│ - Faculty   │ - Filters    │ - Selected     │
│ - Year      │ - Results    │   Units        │
│ - Plans     │ - Facets     │ - Conflicts    │
│ - Complete  │ - Pagination │ - Drag State   │
└─────────────┴──────────────┴────────────────┘
       │              │              │
       └──────────────┼──────────────┘
                      ▼
           ┌────────────────────┐
           │   Components       │
           │   (via computed)   │
           └────────────────────┘
```

---

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10.20.0+
- API service running

### Installation

```bash
cd client
pnpm install
```

### Environment Variables

Create `.env.local` with:

```env
VITE_API_URL=http://localhost:40080
VITE_CLIENT_PORT=45173
```

### Running

```bash
# Development mode
pnpm run dev

# Build for production
pnpm run build

# Preview production build
pnpm run preview

# Type checking
pnpm run type-check

# Linting
pnpm run lint

# Formatting
pnpm run format
```

---

## Directory Structure

```
client/
├── src/
│   ├── api.ts                          # Axios instance
│   ├── App.vue                         # Root component
│   ├── index.ts                        # App initialization
│   ├── index.css                       # Tailwind imports
│   ├── components/                     # Vue components
│   │   ├── alert/                      # Global alert system
│   │   │   ├── Alerts.vue
│   │   │   └── Alert.vue
│   │   ├── common/                     # Shared components
│   │   │   └── LanguageSwitcher.vue
│   │   ├── courses/                    # Course listing
│   │   │   ├── CourseTable.vue
│   │   │   ├── CourseRowExpanded.vue
│   │   │   └── CourseStatusSummary.vue
│   │   ├── filters/                    # Filter panel
│   │   │   ├── FilterPanel.vue
│   │   │   ├── FilterCheckboxGroup.vue
│   │   │   ├── FilterTimeRange.vue
│   │   │   ├── FilterToggle.vue
│   │   │   └── CourseStatusFilter.vue
│   │   ├── timetable/                  # Timetable grid
│   │   │   ├── TimetableGrid.vue
│   │   │   ├── TimetableCourseBlock.vue
│   │   │   ├── TimetableCourseModal.vue
│   │   │   └── TimetableDragPopover.vue
│   │   ├── wizard/                     # Study plan wizard
│   │   │   ├── StudyPlanWizard.vue
│   │   │   ├── WizardSteps.vue
│   │   │   ├── WizardStepFaculty.vue
│   │   │   ├── WizardStepYear.vue
│   │   │   └── WizardStepStudyPlan.vue
│   │   └── ui/                         # UI primitives
│   │       ├── alert/
│   │       └── button/
│   ├── pages/                          # File-based routes
│   │   ├── index.vue                   # Landing page (/)
│   │   └── courses.vue                 # Courses page (/courses)
│   ├── stores/                         # Pinia stores
│   │   ├── alerts.store.ts
│   │   ├── courses.store.ts
│   │   ├── timetable.store.ts
│   │   ├── ui.store.ts
│   │   ├── wizard.store.ts
│   │   └── index.ts
│   ├── composables/                    # Composition utilities
│   │   ├── useCourseLabels.ts
│   │   ├── useCourseStatusFilter.ts
│   │   ├── useCourseUnitSelection.ts
│   │   ├── useDebounce.ts
│   │   ├── useFacetFiltering.ts
│   │   ├── usePopover.ts
│   │   ├── useScheduleSummary.ts
│   │   ├── useSlotFormatting.ts
│   │   ├── useSlotSorting.ts
│   │   ├── useTimeFilterMatching.ts
│   │   ├── useTimetableGrid.ts
│   │   ├── useTimeUtils.ts
│   │   └── index.ts
│   ├── types/                          # TypeScript types
│   │   ├── alert.ts
│   │   ├── api.ts
│   │   ├── course.ts
│   │   ├── timetable.ts
│   │   ├── ui.ts
│   │   ├── view.ts
│   │   ├── wizard.ts
│   │   └── index.ts
│   ├── utils/                          # Utility functions
│   │   ├── day.ts
│   │   ├── localstorage.ts
│   │   ├── pluralization.ts
│   │   └── tailwind.ts
│   ├── constants/                      # Application constants
│   │   ├── debounce.ts
│   │   ├── pagination.ts
│   │   ├── storage.ts
│   │   └── timetable.ts
│   ├── locales/                        # i18n translations
│   │   ├── en.json
│   │   └── cs.json
│   └── styles/                         # CSS files
│       └── insis.css
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
└── index.html
```

---

## Routing

### File-Based Routing

The client uses `unplugin-vue-router` for automatic route generation from the `/src/pages` directory.

**Routes:**

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `index.vue` | Landing page with study plan wizard |
| `/courses` | `courses.vue` | Main course browser (requires wizard completion) |

### Route Guards

**Wizard Completion Check** (in `courses.vue`):

```typescript
watch(() => wizardStore.completed, (completed) => {
  if (!completed) {
    router.push('/')
  }
}, { immediate: true })
```

If the wizard is not completed, users are redirected to the landing page.

**Auto-Navigation** (in `index.vue`):

```typescript
watch(() => wizardStore.completed, (completed) => {
  if (completed) {
    router.push('/courses')
  }
}, { immediate: true })
```

If the wizard is completed, users are auto-redirected to the courses page.

### Router Configuration

**Location:** `src/index.ts`

```typescript
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0, left: 0 }
  },
})
```

---

## State Management

### Store Overview

The application uses 5 Pinia stores for different concerns:

| Store | Purpose | Persistence | Key Actions |
|-------|---------|-------------|-------------|
| `wizard` | Study plan selection | ✅ LocalStorage | `selectFaculty`, `selectYear`, `toggleStudyPlan`, `completeWizard` |
| `courses` | Course filtering & search | ❌ No | `fetchCourses`, filter setters, pagination |
| `timetable` | Selected units & scheduling | ✅ LocalStorage | `addUnit`, `removeUnit`, `changeUnit`, drag selection |
| `ui` | View mode & UI state | ✅ LocalStorage | `setViewMode`, sidebar toggles |
| `alerts` | Global notifications | ❌ No | `addAlert`, `removeAlert` |

---

### Wizard Store

**Location:** `src/stores/wizard.store.ts`

Manages the 3-step study plan selection wizard.

#### State

```typescript
interface WizardState {
  currentStep: number                      // 1, 2, or 3
  facultyId: string | null                 // Selected faculty
  year: number | null                      // Selected year
  semester: InSISSemester                  // 'ZS' or 'LS' (always ZS)
  selectedStudyPlans: SelectedStudyPlan[]  // Array for multi-select
  completed: boolean                       // Wizard done flag

  // Loaded options
  facultyFacets: FacetItem[]
  yearFacets: FacetItem[]
  levelFacets: FacetItem[]
  studyPlans: StudyPlanWithRelations[]

  // Local filters for step 3
  levelFilter: string[]
  titleSearch: string

  loading: boolean
  error: string | null
}
```

#### Key Actions

**`selectFaculty(id: string)`**

Selects faculty and loads years for step 2.

```typescript
const wizardStore = useWizardStore()
await wizardStore.selectFaculty('FIS')
```

**`selectYear(year: number)`**

Selects year and loads study plans for step 3.

```typescript
await wizardStore.selectYear(2024)
```

**`toggleStudyPlan(plan: StudyPlan)`**

Toggles study plan selection (multi-select support).

```typescript
wizardStore.toggleStudyPlan(plan)
```

**`selectStudyPlan(plan: StudyPlan)`**

Single-select mode (replaces all selections).

```typescript
wizardStore.selectStudyPlan(plan)
```

**`completeWizard()`**

Marks wizard as completed and persists to localStorage.

```typescript
wizardStore.completeWizard()
router.push('/courses')
```

**`goToStep(step: number)`**

Navigates to specific step with cascade clearing.

```typescript
wizardStore.goToStep(2) // Clears year and plans
```

**`reset()`**

Clears all wizard state and persistence.

```typescript
wizardStore.reset()
```

#### Getters

**Step Completion:**
- `step1Complete` - Faculty selected
- `step2Complete` - Year selected
- `step3Complete` - At least one plan selected

**Proceed Checks:**
- `canProceedToStep2` - Can advance to year selection
- `canProceedToStep3` - Can advance to plan selection
- `canComplete` - Can finish wizard

**Selection Info:**
- `studyPlanIds` - Array of selected plan IDs
- `studyPlanIdents` - Array of plan idents
- `studyPlanTitles` - Array of plan titles
- `selectionSummary` - Human-readable summary string
- `filteredStudyPlans` - Applies level filter and title search

#### Persistence

**LocalStorage Key:** `kreditozrouti:wizard`

**Persisted Fields:**
- `facultyId`, `year`, `semester`
- `selectedStudyPlans` (array)
- `completed` flag

**Hydration:** On app load, restores state and determines current step.

---

### Courses Store

**Location:** `src/stores/courses.store.ts`

Manages course filtering, search results, and facets.

#### State

```typescript
interface CoursesState {
  filters: CoursesFilter
  courses: Course[]
  facets: CoursesResponse['facets']
  pagination: PaginationMeta
  loading: boolean
  error: string | null
  expandedCourseIds: Set<number>
}
```

#### Filters

```typescript
interface CoursesFilter {
  // Identity
  ids?: number[]
  idents?: string[]
  title?: string

  // Academic period
  semesters?: InSISSemester[]
  years?: number[]

  // Organizational
  faculty_ids?: string[]
  levels?: string[]
  languages?: string[]

  // Time
  include_times?: TimeSelection[]
  exclude_times?: TimeSelection[]

  // Personnel
  lecturers?: string[]

  // Study plan
  study_plan_ids?: number[]
  groups?: string[]
  categories?: string[]

  // Properties
  ects?: number[]
  mode_of_completions?: string[]
  mode_of_deliveries?: string[]

  // Pagination & sorting
  limit?: number
  offset?: number
  sort_by?: string
  sort_dir?: 'asc' | 'desc'
}
```

#### Key Actions

**`fetchCourses()`**

Fetches courses from API with current filters.

```typescript
const coursesStore = useCoursesStore()
await coursesStore.fetchCourses()
```

**Filter Setters:**

```typescript
coursesStore.setFacultyIds(['FIS'])
coursesStore.setLevels(['Bachelor'])
coursesStore.setLanguages(['Čeština'])
coursesStore.setEcts([3, 4, 5, 6])
coursesStore.setTitle('Java')
// ... more setters
```

**Time Filters:**

```typescript
coursesStore.addIncludeTime({
  day: 'Monday',
  time_from: '09:00',
  time_to: '12:00'
})

coursesStore.removeIncludeTime(0) // Remove by index
coursesStore.clearIncludeTimes()
```

**Pagination:**

```typescript
coursesStore.goToPage(2)
coursesStore.nextPage()
coursesStore.prevPage()
```

**Sorting:**

```typescript
coursesStore.setSort('ident', 'asc')
```

**Expansion:**

```typescript
coursesStore.toggleCourseExpansion(courseId)
```

**Advanced:**

```typescript
// Set time filter from timetable drag
coursesStore.setTimeFilterFromDrag(dragSelection)

// Exclude specific slots (for timetable conflict-free browsing)
coursesStore.setExcludeSlotIds([1, 2, 3])
```

#### Getters

**Pagination:**
- `hasNextPage` - Can paginate forward
- `hasPrevPage` - Can paginate backward
- `currentPage` - Current page number (1-indexed)
- `totalPages` - Total page count

**Filter Counts:**
- `activeFilterCount` - Number of active filters
- `hasActiveFilters` - Any filters applied

**Course Data:**
- `courseCount` - Number of courses on current page
- `totalCourses` - Total matching courses

#### Initialization

**`initializeFromWizard()`**

Called on courses page mount. Copies wizard selections to filters:

```typescript
onMounted(() => {
  coursesStore.initializeFromWizard()
  coursesStore.fetchCourses()
})
```

Copies:
- `study_plan_ids` from wizard
- `faculty_ids` (if single plan)
- `semesters` and `years`

---

### Timetable Store

**Location:** `src/stores/timetable.store.ts`

Manages selected course units, scheduling, and conflict detection.

#### State

```typescript
interface TimetableState {
  selectedUnits: SelectedCourseUnit[]
  dragSelection: DragSelection
  showDragPopover: boolean
  dragPopoverPosition: { x: number; y: number }
}

interface SelectedCourseUnit {
  courseId: number
  courseIdent: string
  courseTitle: string
  unitId: number
  unitType: CourseUnitType  // 'lecture' | 'exercise' | 'seminar'
  slotId: number
  day?: InSISDay
  date?: string
  timeFrom: number          // Minutes from midnight
  timeTo: number
  location?: string
  lecturer?: string
  ects?: number
}

interface DragSelection {
  active: boolean
  startDay: InSISDay | null
  startTime: number | null
  endDay: InSISDay | null
  endTime: number | null
}
```

#### Key Actions

**`addUnit(unit: SelectedCourseUnit)`**

Adds a course unit to the schedule.

**Validations:**
- Cannot add duplicate slot IDs
- Warns but allows overlapping units

```typescript
const timetableStore = useTimetableStore()
timetableStore.addUnit({
  courseId: 12345,
  courseIdent: '4IT101',
  courseTitle: 'Programming in Java',
  unitId: 1,
  unitType: 'lecture',
  slotId: 10,
  day: 'Monday',
  timeFrom: 540,  // 9:00 AM
  timeTo: 630,    // 10:30 AM
  location: 'NB350',
  lecturer: 'John Smith',
  ects: 6
})
```

**`removeUnit(unitId: number)`**

Removes a unit by ID.

```typescript
timetableStore.removeUnit(1)
```

**`removeCourse(courseId: number)`**

Removes all units for a course.

```typescript
timetableStore.removeCourse(12345)
```

**`changeUnit(oldUnitId: number, newUnit: SelectedCourseUnit)`**

Atomically replaces one unit with another (for changing time slot).

```typescript
timetableStore.changeUnit(oldUnitId, newUnit)
```

**Drag Selection:**

```typescript
timetableStore.startDrag('Monday', 540)
timetableStore.updateDrag('Monday', 720)
timetableStore.endDrag() // Shows popover
timetableStore.applyDragFilter() // Copies to courses store
timetableStore.cancelDrag()
```

#### Getters

**Selection Info:**
- `selectedCourseIds` - Array of unique course IDs
- `selectedSlotIds` - Array of all slot IDs
- `totalEcts` - Sum of ECTS for unique courses
- `hasSelections` - Any units selected

**Grouping:**
- `unitsByCourse(courseId)` - Get units for specific course
- `unitsByDay(day)` - Get units for specific day

**Conflict Detection:**

**`conflicts: Array<{ unit1, unit2 }>`**

Detects overlapping time slots.

**Logic:**
1. Group units by day
2. For each day, compare all pairs
3. If time ranges overlap, mark as conflict

**`unitsConflict(unit1, unit2): boolean`**

Helper to check if two units have overlapping times.

**Course Status:**

**`courseStatuses(): Map<number, CourseStatus>`**

Returns detailed status for each course.

```typescript
interface CourseStatus {
  id: number
  ident: string
  title: string
  status: 'selected' | 'conflict' | 'incomplete'
  conflictsWith: string[]       // Course idents
  missingTypes: CourseUnitType[] // Required types not selected
}
```

**Status Priority:**
1. `conflict` - Has time conflicts
2. `incomplete` - Missing required unit types
3. `selected` - Fully selected

**Completeness Check:**

**`checkCourseCompleteness(course: Course): { complete, missingTypes }`**

Validates all required unit types are selected.

**Rules:**
- If course has lectures, exercises, and seminars → need all 3
- If course has only lectures and exercises → need both
- If course has only one type → need that one

#### Persistence

**LocalStorage Key:** `kreditozrouti:timetable`

**Persisted:** `selectedUnits` array

**Hydration:** Called on app load via `wizardStore.hydrate()`.

---

### UI Store

**Location:** `src/stores/ui.store.ts`

Manages UI state like view mode and sidebar visibility.

#### State

```typescript
interface UIState {
  viewMode: ViewMode              // 'list' | 'timetable'
  sidebarCollapsed: boolean       // Desktop sidebar
  showLegend: boolean             // Timetable legend
  globalLoading: boolean          // Full-page loader
  mobileMenuOpen: boolean         // Mobile menu (not persisted)
  mobileFilterOpen: boolean       // Mobile filters (not persisted)
}
```

#### Actions

```typescript
const uiStore = useUIStore()

// View mode
uiStore.setViewMode('list')
uiStore.setViewMode('timetable')

// Sidebar
uiStore.toggleSidebar()
uiStore.setSidebarCollapsed(true)

// Legend
uiStore.toggleLegend()

// Mobile
uiStore.toggleMobileMenu()
uiStore.toggleMobileFilter()
```

#### Getters

```typescript
uiStore.isListView      // viewMode === 'list'
uiStore.isTimetableView // viewMode === 'timetable'
```

#### Persistence

**LocalStorage Key:** `kreditozrouti:ui`

**Persisted:**
- `viewMode`
- `sidebarCollapsed`
- `showLegend`

**Not Persisted:**
- `mobileMenuOpen`
- `mobileFilterOpen`

---

### Alerts Store

**Location:** `src/stores/alerts.store.ts`

Manages global toast notifications.

#### State

```typescript
interface Alert {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title?: string
  description?: string
  timeout?: number
}

interface AlertsState {
  alerts: Alert[]
}
```

#### Actions

**`addAlert(alert: Omit<Alert, 'id'>)`**

Adds a new alert.

```typescript
const alertsStore = useAlertsStore()

alertsStore.addAlert({
  type: 'success',
  title: 'Course Added',
  description: 'Programming in Java has been added to your schedule.',
  timeout: 5000
})
```

**Auto-dismiss:** If `timeout` is provided, alert auto-removes after delay.

**`removeAlert(id: string)`**

Manually removes an alert.

```typescript
alertsStore.removeAlert(alertId)
```

#### Usage

Alerts are automatically triggered by:
- API error interceptor (for HTTP errors)
- Store actions (for validation errors)
- Component logic (for success messages)

---

## Composables

### useCourseLabels

**Location:** `src/composables/useCourseLabels.ts`

Comprehensive translation utilities for course attributes.

#### Methods

**Generic:**

```typescript
const { getLabel } = useCourseLabels()

const label = getLabel('faculties', 'FIS')
// Returns: "Fakulta informatiky a statistiky"
```

**Course Attributes:**

```typescript
const {
  getFacultyLabel,
  getLevelLabel,
  getLanguageLabel,
  getCompletionLabel,
  getDeliveryLabel,
  getCategoryLabel,
  getGroupLabel,
  getDayLabel,
  getDayLabelShort,
} = useCourseLabels()

getFacultyLabel('FIS')           // "Fakulta informatiky a statistiky"
getLevelLabel('Bachelor')        // "Bakalářské"
getLanguageLabel('Čeština')      // "Čeština"
getCompletionLabel('Zkouška')    // "Zkouška"
getCategoryLabel('P')            // "Povinný"
getGroupLabel('f')               // "Fakultně specifické"
getDayLabel('Monday')            // "Pondělí"
getDayLabelShort('Monday')       // "Po"
```

**Unit Types:**

```typescript
const {
  getUnitTypeLabel,
  getUnitTypeLabelShort,
  getUnitTypeLabelAccusative,
  getUnitTypeLabelGrouped,
} = useCourseLabels()

getUnitTypeLabel('lecture')             // "Přednáška"
getUnitTypeLabelShort('lecture')        // "P"
getUnitTypeLabelAccusative('lecture')   // "Přednášku"
getUnitTypeLabelGrouped(['lecture', 'exercise']) // "Přednášky a cvičení"
```

**Slot Type Detection:**

```typescript
const { getSlotType } = useCourseLabels()

getSlotType('Přednáška')  // 'lecture'
getSlotType('Cvičení')    // 'exercise'
getSlotType('Seminář')    // 'seminar'
getSlotType('Zkouška')    // 'exam'
getSlotType('Unknown')    // null
```

**Colors:**

```typescript
const {
  getUnitTypeColorClass,
  getCategoryBadgeClass,
} = useCourseLabels()

getUnitTypeColorClass('lecture')      // 'bg-timetable-lecture'
getCategoryBadgeClass('compulsory')   // 'bg-green-100 text-green-800'
```

**Course Title:**

```typescript
const { getCourseTitle } = useCourseLabels()

getCourseTitle(course) // Returns title_cs for Czech locale, title_en for English
```

---

### useCourseStatusFilter

**Location:** `src/composables/useCourseStatusFilter.ts`

Shared state for filtering courses by status and ident.

#### State

```typescript
const statusFilter = ref<Set<CourseStatusType>>(new Set(['selected']))
const identFilter = ref<Set<string>>(new Set())
```

#### Methods

```typescript
const {
  statusFilter,
  identFilter,
  resetCourseStatusFilter,
} = useCourseStatusFilter()

// Toggle status filter
if (statusFilter.value.has('conflict')) {
  statusFilter.value.delete('conflict')
} else {
  statusFilter.value.add('conflict')
}

// Add course ident filter
identFilter.value.add('4IT101')

// Reset all
resetCourseStatusFilter()
```

---

### useTimetableGrid

**Location:** `src/composables/useTimetableGrid.ts`

Timetable rendering and interaction helpers.

#### Methods

**`timeSlots: Ref<string[]>`**

Generated time slots for grid header.

```typescript
const { timeSlots } = useTimetableGrid()
// ['08:00', '09:00', '10:00', ..., '21:00']
```

**`getUnitsForDay(day: InSISDay): SelectedCourseUnit[]`**

Get all units for a specific day.

```typescript
const { getUnitsForDay } = useTimetableGrid()
const mondayUnits = getUnitsForDay('Monday')
```

**`getBlockStyle(unit: SelectedCourseUnit, overlapIndex?, overlapCount?)`**

Calculate CSS position and size for timetable block.

```typescript
const { getBlockStyle } = useTimetableGrid()

const style = getBlockStyle(unit, 0, 2)
// Returns: { top: '25%', height: '12.5%', width: '50%', left: '0%', zIndex: 1 }
```

**Handles:**
- Time-based positioning (top, height)
- Overlap detection (divides width)
- Z-index for stacking

**`getOverlapInfo(day: InSISDay, unit: SelectedCourseUnit)`**

Detect overlapping blocks within a day.

```typescript
const { getOverlapInfo } = useTimetableGrid()

const { overlapIndex, overlapCount } = getOverlapInfo('Monday', unit)
```

**`getDragSelectionStyle()`**

Calculate style for drag selection highlight.

```typescript
const { getDragSelectionStyle } = useTimetableGrid()

const style = getDragSelectionStyle()
// Returns: { top: '..%', height: '..%' }
```

**`getTimeFromX(x: number, element: HTMLElement): number`**

Convert mouse X coordinate to time (minutes from midnight).

```typescript
const { getTimeFromX } = useTimetableGrid()

const time = getTimeFromX(event.clientX, gridElement)
// Snaps to 15-minute intervals
```

---

### useTimeUtils

**Location:** `src/composables/useTimeUtils.ts`

Time formatting and calculation utilities.

#### Methods

```typescript
const {
  minutesToTime,
  calculateTimePosition,
  calculateTimeDuration,
} = useTimeUtils()

// Format minutes to HH:MM
minutesToTime(540)  // '09:00'
minutesToTime(630)  // '10:30'

// Calculate percentage position in day (8:00 - 21:00)
calculateTimePosition(540)  // For 9:00 AM → returns position %

// Calculate percentage duration
calculateTimeDuration(540, 630)  // 90 minutes → returns width %
```

---

### useDebounce

**Location:** `src/composables/useDebounce.ts`

Debounce function execution.

#### Usage

```typescript
import { useDebounce } from '@client/composables'

const debouncedSearch = useDebounce((value: string) => {
  coursesStore.setTitle(value)
  coursesStore.fetchCourses()
}, 750)

// In component
<input @input="debouncedSearch($event.target.value)" />
```

---

### useScheduleSummary

**Location:** `src/composables/useScheduleSummary.ts`

Format course schedule into human-readable text.

#### Methods

```typescript
const { getScheduleSummary } = useScheduleSummary()

const summary = getScheduleSummary(course)
// Returns: "Po 9:00-10:30, St 14:00-15:30"
```

---

## Components

### Component Hierarchy

```
App.vue
├── RouterView
│   ├── index.vue (Landing)
│   │   └── StudyPlanWizard
│   │       ├── WizardSteps
│   │       ├── WizardStepFaculty
│   │       ├── WizardStepYear
│   │       └── WizardStepStudyPlan
│   └── courses.vue (Main App)
│       ├── Header
│       │   ├── Logo
│       │   ├── Study Plan Info
│       │   ├── Action Buttons
│       │   └── LanguageSwitcher
│       ├── FilterPanel (Sidebar)
│       │   ├── Search Input
│       │   ├── FilterCheckboxGroup (×N)
│       │   ├── FilterTimeRange
│       │   └── CourseStatusFilter
│       ├── Main Content
│       │   ├── CourseStatusSummary
│       │   ├── View Tabs
│       │   ├── CourseTable (List View)
│       │   │   └── CourseRowExpanded
│       │   └── TimetableGrid (Timetable View)
│       │       ├── TimetableCourseBlock (×N)
│       │       ├── TimetableCourseModal
│       │       └── TimetableDragPopover
│       └── Alerts
└── Alerts (Global)
    └── Alert (×N)
```

---

### Pages

#### index.vue

**Location:** `src/pages/index.vue`

Landing page with study plan wizard.

**Features:**
- 3-step wizard flow
- Auto-redirects to `/courses` when completed
- Persists selections to localStorage

**Components:**
- `StudyPlanWizard`

---

#### courses.vue

**Location:** `src/pages/courses.vue`

Main application page with course browser and timetable.

**Features:**
- Dual-view mode (list and timetable)
- Filter sidebar with advanced options
- Course selection and scheduling
- Conflict detection
- Responsive layout

**Key Sections:**
1. **Header** - Logo, study plan info, actions, language switcher
2. **Sidebar** - FilterPanel with all filters
3. **Main Content** - CourseTable or TimetableGrid
4. **Alerts** - Global notifications

**Route Guard:** Redirects to `/` if wizard not completed.

---

### Wizard Components

#### StudyPlanWizard.vue

**Location:** `src/components/wizard/StudyPlanWizard.vue`

Main wizard orchestrator.

**Features:**
- Step navigation with progress indicator
- Step validation
- Completion handling

**Props:** None (uses wizard store)

**Events:** None (navigates via router)

---

#### WizardSteps.vue

**Location:** `src/components/wizard/WizardSteps.vue`

Progress indicator showing current step.

**Visual:** 1 → 2 → 3 with active/complete states

---

#### WizardStepFaculty.vue

**Location:** `src/components/wizard/WizardStepFaculty.vue`

Step 1: Faculty selection.

**Features:**
- Radio button list
- Loads faculties on mount
- Auto-advances to step 2 on selection

---

#### WizardStepYear.vue

**Location:** `src/components/wizard/WizardStepYear.vue`

Step 2: Academic year selection.

**Features:**
- Radio button list
- Shows only years with data
- Auto-advances to step 3 on selection

---

#### WizardStepStudyPlan.vue

**Location:** `src/components/wizard/WizardStepStudyPlan.vue`

Step 3: Study plan selection.

**Features:**
- Multi-select checkboxes
- Single-select shortcuts (click card)
- Level filter
- Title search
- Complete button

---

### Course Components

#### CourseTable.vue

**Location:** `src/components/courses/CourseTable.vue`

Main course list table with sorting and expansion.

**Features:**
- Sortable columns
- Expandable rows for details
- Course status badges
- Empty state
- Loading state

**Props:**
- `courses: Course[]`
- `loading: boolean`

**Events:**
- `@sort` - Emits sort column and direction

---

#### CourseRowExpanded.vue

**Location:** `src/components/courses/CourseRowExpanded.vue`

Expandable course details view.

**Features:**
- Syllabus content (aims, outcomes, requirements)
- Assessment methods
- Timetable with unit selection
- Study plan references

**Props:**
- `course: Course`

**Interactions:**
- Add/remove units to timetable
- View unit details

---

#### CourseStatusSummary.vue

**Location:** `src/components/courses/CourseStatusSummary.vue`

Status badge summary showing selected/conflict/incomplete counts.

**Features:**
- Badge for each status type
- Click to filter courses
- Shows counts

**Visual:**
```
✓ 5 Selected  ⚠ 2 Conflicts  ⋯ 3 Incomplete
```

---

### Filter Components

#### FilterPanel.vue

**Location:** `src/components/filters/FilterPanel.vue`

Main filter sidebar.

**Features:**
- Search input (debounced)
- Dynamic filter groups
- Time range selector
- Course status filter
- Clear all button
- Active filter count badge

**Filters:**
- Title search
- Faculties
- Languages
- Levels
- ECTS
- Modes of completion
- Include times
- Course status

---

#### FilterCheckboxGroup.vue

**Location:** `src/components/filters/FilterCheckboxGroup.vue`

Reusable checkbox group filter.

**Props:**
- `label: string`
- `options: FacetItem[]`
- `modelValue: string[]`
- `showCounts?: boolean`

**Events:**
- `@update:modelValue` - Emits selected values

**Features:**
- Checkbox list with labels
- Item counts (facet counts)
- Select all / clear

---

#### FilterTimeRange.vue

**Location:** `src/components/filters/FilterTimeRange.vue`

Time range selector for include/exclude filters.

**Features:**
- Add time ranges by day
- Visual time range display
- Remove individual ranges

**UI:**
```
Day: [Monday ▼]
Time: [09:00] to [12:00]
[Add]

Included Times:
- Monday 09:00-12:00 [×]
- Wednesday 14:00-16:00 [×]
```

---

#### CourseStatusFilter.vue

**Location:** `src/components/filters/CourseStatusFilter.vue`

Filter courses by status (selected/conflict/incomplete).

**Features:**
- Checkbox for each status type
- Shared state with CourseStatusSummary

---

### Timetable Components

#### TimetableGrid.vue

**Location:** `src/components/timetable/TimetableGrid.vue`

Main timetable grid with drag support.

**Features:**
- 7-day week view (Monday-Sunday)
- Time slots 8:00-21:00
- Course blocks with colors
- Drag-to-select time ranges
- Conflict detection (red borders)
- Overlap handling (side-by-side)

**Interactions:**
- Click block to view/change unit
- Drag to select time range
- Release to show filter popover

---

#### TimetableCourseBlock.vue

**Location:** `src/components/timetable/TimetableCourseBlock.vue`

Individual course block in timetable.

**Props:**
- `unit: SelectedCourseUnit`
- `overlapIndex?: number`
- `overlapCount?: number`

**Features:**
- Color-coded by unit type
- Shows course code, title, time, location
- Click to open modal
- Conflict indicator (red border)

**Colors:**
- Lecture: Light green
- Exercise: Light blue
- Seminar: Light yellow
- Exam: Purple
- Conflict: Red border

---

#### TimetableCourseModal.vue

**Location:** `src/components/timetable/TimetableCourseModal.vue`

Modal for selecting/changing course units.

**Props:**
- `course: Course`
- `currentUnitId?: number`

**Features:**
- List all available units
- Show unit details (lecturer, capacity, slots)
- Select new unit
- Remove unit
- Change unit (replace)

**Actions:**
- Add to schedule
- Remove from schedule
- Change unit variant

---

#### TimetableDragPopover.vue

**Location:** `src/components/timetable/TimetableDragPopover.vue`

Popover shown after drag selection on timetable.

**Features:**
- Shows selected time range
- Apply as include filter
- Apply as exclude filter
- Cancel

**UI:**
```
Selected: Monday 09:00 - 12:00

[Include This Time]  [Exclude This Time]  [Cancel]
```

---

### Alert Components

#### Alerts.vue

**Location:** `src/components/alert/Alerts.vue`

Container for all active alerts.

**Features:**
- Renders alerts from store
- Fixed position (top-right)
- Z-index above all content

---

#### Alert.vue

**Location:** `src/components/alert/Alert.vue`

Individual alert/toast notification.

**Props:**
- `alert: Alert`

**Features:**
- Color-coded by type
- Title and description
- Close button
- Auto-dismiss timer
- Slide-in animation

**Types:**
- Success: Green
- Error: Red
- Warning: Yellow
- Info: Blue

---

### Common Components

#### LanguageSwitcher.vue

**Location:** `src/components/common/LanguageSwitcher.vue`

Language toggle button.

**Features:**
- Switches between Czech and English
- Persists to localStorage
- Reloads i18n messages

**UI:** `CS | EN` toggle

---

## Type System

### Core Types

**Location:** `src/types/`

#### course.ts

```typescript
type CourseUnitType = 'lecture' | 'exercise' | 'seminar'

interface SelectedCourseUnit {
  courseId: number
  courseIdent: string
  courseTitle: string
  unitId: number
  unitType: CourseUnitType
  slotId: number
  day?: InSISDay
  date?: string
  timeFrom: number
  timeTo: number
  location?: string
  lecturer?: string
  ects?: number
}

interface CourseStatus {
  id: number
  ident: string
  title: string
  status: 'selected' | 'conflict' | 'incomplete'
  conflictsWith: string[]
  missingTypes: CourseUnitType[]
}

interface CoursesState {
  filters: CoursesFilter
  courses: Course[]
  facets: CoursesResponse['facets']
  pagination: PaginationMeta
  loading: boolean
  error: string | null
  expandedCourseIds: Set<number>
}
```

---

#### timetable.ts

```typescript
interface TimetableState {
  selectedUnits: SelectedCourseUnit[]
  dragSelection: DragSelection
  showDragPopover: boolean
  dragPopoverPosition: { x: number; y: number }
}

interface DragSelection {
  active: boolean
  startDay: InSISDay | null
  startTime: number | null
  endDay: InSISDay | null
  endTime: number | null
}
```

---

#### wizard.ts

```typescript
interface SelectedStudyPlan {
  id: number
  ident: string | null
  title: string | null
}

interface WizardState {
  currentStep: number
  facultyId: string | null
  year: number | null
  semester: InSISSemester
  selectedStudyPlans: SelectedStudyPlan[]
  completed: boolean
  facultyFacets: FacetItem[]
  yearFacets: FacetItem[]
  levelFacets: FacetItem[]
  studyPlans: StudyPlanWithRelations[]
  levelFilter: string[]
  titleSearch: string
  loading: boolean
  error: string | null
}
```

---

#### ui.ts

```typescript
type ViewMode = 'list' | 'timetable'

interface UIState {
  viewMode: ViewMode
  sidebarCollapsed: boolean
  showLegend: boolean
  globalLoading: boolean
  mobileMenuOpen: boolean
  mobileFilterOpen: boolean
}
```

---

#### alert.ts

```typescript
interface Alert {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title?: string
  description?: string
  timeout?: number
}
```

---

## Styling

### Tailwind CSS 4

**Configuration:** `tailwind.config.ts`

Uses `@tailwindcss/vite` plugin for zero-config Tailwind CSS 4.

#### Custom Theme

**Colors:**

```typescript
colors: {
  'insis-blue': {
    DEFAULT: '#0066b3',
    dark: '#004d8a',
    light: '#3399cc',
    lighter: '#e6f2f9',
    hover: '#005599',
  },
  'insis-gray': {
    50: '#f9fafb',
    100: '#f3f4f6',
    // ... up to 900
  },
  status: {
    success: '#008000',
    warning: '#ffd700',
    danger: '#c40f16',
    info: '#006cd6',
  },
  timetable: {
    lecture: '#a1eda1',
    exercise: '#a1dbf5',
    seminar: '#ecf191',
    'date-only': '#e6daca',
    exam: '#e89aed',
    conflict: '#df9292',
  },
}
```

---

### Custom CSS Classes

**Location:** `src/styles/insis.css`

#### Buttons

```css
.insis-btn {
  /* Base button styles */
}

.insis-btn-primary {
  background-color: var(--insis-blue);
  color: white;
}

.insis-btn-secondary {
  background-color: var(--insis-gray-200);
  color: var(--insis-gray-800);
}

.insis-btn-text {
  background: transparent;
  text-decoration: underline;
}
```

---

#### Tables

```css
.insis-table {
  width: 100%;
  border-collapse: collapse;
}

.insis-table-row-clickable {
  cursor: pointer;
  transition: background-color 0.15s;
}

.insis-table-row-clickable:hover {
  background-color: var(--insis-blue-lighter);
}
```

---

#### Tabs

```css
.insis-tabs {
  display: flex;
  border-bottom: 2px solid var(--insis-gray-200);
}

.insis-tab {
  padding: 0.5rem 1rem;
  cursor: pointer;
}

.insis-tab-active {
  border-bottom: 3px solid var(--insis-blue);
  color: var(--insis-blue);
}
```

---

#### Badges

```css
.insis-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
}

.insis-badge-success {
  background-color: #d1fae5;
  color: #065f46;
}

.insis-badge-compulsory {
  background-color: #fee2e2;
  color: #991b1b;
}
```

---

### Responsive Design

**Breakpoints:**
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

**Mobile-First Approach:**

```vue
<div class="flex flex-col md:flex-row">
  <!-- Stacks on mobile, side-by-side on desktop -->
</div>
```

---

## Internationalization

### Vue I18n Setup

**Location:** `src/index.ts`

```typescript
import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import cs from './locales/cs.json'

const i18n = createI18n({
  locale: 'cs',
  fallbackLocale: 'en',
  messages: { en, cs },
  legacy: false,
  globalInjection: true,
})
```

---

### Translation Files

#### English (en.json)

**Structure:**

```json
{
  "errors": {
    "types": {
      "UNKNOWN": "Unknown error",
      "ZOD_VALIDATION": "Validation error"
    },
    "codes": {
      "0": "An unexpected error occurred",
      "401_000": "Unauthorized",
      "403_000": "Validation failed"
    }
  },
  "faculties": {
    "FIS": "Faculty of Informatics and Statistics",
    "ESF": "Faculty of Economics"
  },
  "days": {
    "Monday": "Monday",
    "Tuesday": "Tuesday"
  },
  "daysShort": {
    "Monday": "Mon",
    "Tuesday": "Tue"
  },
  "courseModesOfCompletion": {
    "Zkouška": "Exam",
    "Zápočet": "Credit"
  },
  "unitTypes": {
    "lecture": "Lecture",
    "exercise": "Exercise",
    "seminar": "Seminar"
  },
  "pages": {
    "landing": {
      "title": "Course Browser",
      "subtitle": "Select your study plan"
    }
  }
}
```

---

#### Czech (cs.json)

**Structure:** Same structure with Czech translations.

---

### Usage in Components

**Template:**

```vue
<template>
  <h1>{{ t('pages.landing.title') }}</h1>
  <p>{{ t('pages.landing.subtitle') }}</p>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>
```

**Composables:**

```typescript
import { useI18n } from 'vue-i18n'

export function useCourseLabels() {
  const { t } = useI18n()

  function getFacultyLabel(facultyId: string): string {
    return t(`faculties.${facultyId}`)
  }

  return { getFacultyLabel }
}
```

---

### Pluralization

**Czech Plural Rules:**

```typescript
function czechPluralRule(choice: number): number {
  if (choice === 1) return 0       // Singular
  if (choice >= 2 && choice <= 4) return 1  // Few
  return 2                         // Many
}
```

**Usage:**

```json
{
  "course": "course | courses | courses",
  "selected": "{count} selected"
}
```

```vue
{{ t('course', 1) }}  // "course"
{{ t('course', 3) }}  // "courses"
{{ t('selected', { count: 5 }) }}  // "5 selected"
```

---

## API Integration

### Axios Setup

**Location:** `src/api.ts`

```typescript
import axios, { type AxiosInstance } from 'axios'

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 10000,
})

export default api
```

---

### Error Interceptor

**Global error handling:**

```typescript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const alerts = useAlertsStore()

    // Extract error details
    const status = error.response?.status ?? 500
    const errorType = error.response?.data?.type ?? 'UNKNOWN'
    const errorCode = error.response?.data?.code ?? '0'

    // Show global alert
    alerts.addAlert({
      type: 'error',
      title: `${status}. ${t(`errors.types.${errorType}`)}`,
      description: t(`errors.codes.${errorCode}`),
      timeout: 20000,
    })

    return Promise.reject(error)
  }
)
```

---

### API Endpoints

**Courses:**

```typescript
const coursesStore = useCoursesStore()

// Fetch courses
const response = await api.post<CoursesResponse>('/courses', {
  faculty_ids: coursesStore.filters.faculty_ids,
  levels: coursesStore.filters.levels,
  title: coursesStore.filters.title,
  limit: 50,
  offset: 0,
})

coursesStore.courses = response.data.data
coursesStore.facets = response.data.facets
coursesStore.pagination = response.data.meta
```

**Study Plans:**

```typescript
const wizardStore = useWizardStore()

// Fetch study plans
const response = await api.post<StudyPlansResponse>('/study_plans', {
  faculty_ids: [wizardStore.facultyId],
  years: [wizardStore.year],
  semesters: [wizardStore.semester],
})

wizardStore.studyPlans = response.data.data
```

---

### Type Safety

**Response Types:**

```typescript
interface CoursesResponse {
  data: Course[]
  facets: {
    faculties: FacetItem[]
    days: FacetItem[]
    lecturers: FacetItem[]
    languages: FacetItem[]
    levels: FacetItem[]
    semesters: FacetItem[]
    years: FacetItem[]
    groups: FacetItem[]
    categories: FacetItem[]
    ects: FacetItem[]
    modes_of_completion: FacetItem[]
    time_range: { min: number; max: number }
  }
  meta: PaginationMeta
}

interface PaginationMeta {
  limit: number
  offset: number
  count: number
  total: number
}
```

---

## Build Configuration

### Vite Configuration

**Location:** `vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueRouter from 'unplugin-vue-router/vite'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import vueI18n from '@intlify/unplugin-vue-i18n/vite'
import icons from 'unplugin-icons/vite'

export default defineConfig({
  plugins: [
    vueRouter(), // Must be first
    vue(),
    vueDevTools(),
    tailwindcss(),
    vueI18n({
      include: [resolve(__dirname, './src/locales/**')],
    }),
    icons({
      compiler: 'vue3',
      autoInstall: true,
    }),
  ],
  resolve: {
    alias: {
      '@client': resolve(__dirname, './src'),
      '@api': resolve(__dirname, '../api/src'),
    },
  },
  server: {
    port: Number(process.env.VITE_CLIENT_PORT) || 45173,
  },
})
```

---

### TypeScript Configuration

**tsconfig.json:**

```json
{
  "extends": "@vue/tsconfig/tsconfig.dom.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@client/*": ["./src/*"],
      "@api/*": ["../api/src/*"]
    },
    "types": ["vite/client", "unplugin-vue-router/client"]
  },
  "include": ["src/**/*.ts", "src/**/*.vue"],
  "references": [
    {
      "path": "./tsconfig.node.json"
    }
  ]
}
```

---

### Environment Variables

**`.env` files:**

```env
VITE_API_URL=http://localhost:40080
VITE_CLIENT_PORT=45173
```

**Access in code:**

```typescript
const apiUrl = import.meta.env.VITE_API_URL
const port = import.meta.env.VITE_CLIENT_PORT
```

---

## Features

### Study Plan Wizard

**3-Step Flow:**

1. **Faculty Selection**
   - Loads available faculties from API
   - Radio button selection
   - Auto-advances to step 2

2. **Year Selection**
   - Loads years with data for selected faculty
   - Always defaults to Winter semester (ZS)
   - Auto-advances to step 3

3. **Study Plan Selection**
   - Multi-select support (checkbox mode)
   - Single-select shortcuts (click card)
   - Level filter (Bachelor, Master, etc.)
   - Title search
   - Complete button

**Persistence:** Saved to localStorage

**Use Case:** Select base program + specialization

---

### Course Filtering

**Filter Types:**

| Filter | Type | Description |
|--------|------|-------------|
| Title | Text input | Debounced search (750ms) |
| Faculties | Checkbox | Multi-select faculties |
| Languages | Checkbox | Course languages |
| Levels | Checkbox | Study levels |
| ECTS | Checkbox | Credit values |
| Modes of Completion | Checkbox | Exam, credit, etc. |
| Include Times | Time range | Show courses with these times |
| Exclude Times | Time range | Hide courses with these times |
| Course Status | Checkbox | Selected, conflict, incomplete |

**Facets:** Dynamic options based on available courses

**Active Filter Count:** Badge shows number of active filters

---

### Timetable View

**Grid:**
- 7 days (Monday-Sunday)
- Time range: 8:00 AM - 9:00 PM
- 15-minute snap intervals

**Features:**
- Color-coded blocks by unit type
- Overlap detection (side-by-side layout)
- Conflict detection (red border)
- Click block to change unit
- Drag-to-select time ranges

**Drag-to-Filter:**
1. Click and drag on grid
2. Visual highlight appears
3. Release to show popover
4. Apply as include/exclude filter

---

### Conflict Detection

**Algorithm:**

```typescript
function detectConflicts(units: SelectedCourseUnit[]) {
  const conflicts = []

  // Group by day
  const unitsByDay = groupBy(units, 'day')

  // Check each day
  for (const [day, dayUnits] of unitsByDay) {
    // Compare all pairs
    for (let i = 0; i < dayUnits.length; i++) {
      for (let j = i + 1; j < dayUnits.length; j++) {
        if (unitsConflict(dayUnits[i], dayUnits[j])) {
          conflicts.push({ unit1: dayUnits[i], unit2: dayUnits[j] })
        }
      }
    }
  }

  return conflicts
}

function unitsConflict(unit1, unit2) {
  // Same day
  if (unit1.day !== unit2.day) return false

  // Time overlap
  return !(unit1.timeTo <= unit2.timeFrom || unit2.timeTo <= unit1.timeFrom)
}
```

**Visual Indicators:**
- Red border on conflicting blocks
- Conflict badge in summary
- Course status: "conflict"

---

### Completeness Checking

**Rules:**

1. If course has lectures, exercises, and seminars → need all 3
2. If course has lectures and exercises → need both
3. If course has only one type → need that one

**Implementation:**

```typescript
function checkCompleteness(course: Course) {
  const availableTypes = getAvailableUnitTypes(course)
  const selectedTypes = getSelectedUnitTypes(course.id)

  const missing = availableTypes.filter(type => !selectedTypes.includes(type))

  return {
    complete: missing.length === 0,
    missingTypes: missing,
  }
}
```

**Visual Indicators:**
- Yellow badge for incomplete
- Shows missing types (e.g., "Missing: Exercise")

---

### Multi-Language Support

**Supported Locales:**
- Czech (cs) - Default
- English (en)

**Features:**
- UI text translated
- Course titles localized
- Facet labels translated
- Error messages localized
- Date/time formatting
- Number formatting

**Switching:**
- LanguageSwitcher component
- Persisted to localStorage
- Reloads page to apply

---

### LocalStorage Persistence

**Keys:**

```typescript
const STORAGE_KEYS = {
  TIMETABLE: 'kreditozrouti:timetable',
  WIZARD: 'kreditozrouti:wizard',
  UI: 'kreditozrouti:ui',
}
```

**Persisted Data:**

| Key | Data | Purpose |
|-----|------|---------|
| `timetable` | Selected units | Preserve schedule across sessions |
| `wizard` | Wizard selections | Skip wizard on return visits |
| `ui` | View mode, sidebar | Preserve UI preferences |

**Utilities:**

```typescript
import { saveToStorage, loadFromStorage, removeFromStorage } from '@client/utils/localstorage'

saveToStorage('key', data)
const data = loadFromStorage('key')
removeFromStorage('key')
```

---

## Development Guide

### Adding a New Page

1. **Create page file** in `src/pages/`:

```vue
<!-- src/pages/about.vue -->
<template>
  <div>
    <h1>About Kreditozrouti</h1>
    <p>Course scheduling made easy.</p>
  </div>
</template>

<script setup lang="ts">
// Page logic
</script>
```

2. **Access route:**

Route is auto-generated: `/about`

3. **Add navigation:**

```vue
<router-link to="/about">About</router-link>
```

---

### Adding a New Filter

1. **Add filter to CoursesFilter type:**

```typescript
// src/types/course.ts
interface CoursesFilter {
  // ... existing filters
  new_filter?: string[]
}
```

2. **Add to courses store:**

```typescript
// src/stores/courses.store.ts
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
```

3. **Add to FilterPanel:**

```vue
<FilterCheckboxGroup
  label="New Filter"
  :options="coursesStore.facets.new_filter"
  :model-value="coursesStore.filters.new_filter"
  @update:model-value="coursesStore.setNewFilter"
/>
```

4. **Add API support** (if needed in backend).

---

### Adding a New Composable

1. **Create composable file:**

```typescript
// src/composables/useMyFeature.ts
import { ref, computed } from 'vue'

export function useMyFeature() {
  const state = ref(0)

  const doubled = computed(() => state.value * 2)

  function increment() {
    state.value++
  }

  return {
    state,
    doubled,
    increment,
  }
}
```

2. **Export from index:**

```typescript
// src/composables/index.ts
export * from './useMyFeature'
```

3. **Use in component:**

```vue
<script setup lang="ts">
import { useMyFeature } from '@client/composables'

const { state, doubled, increment } = useMyFeature()
</script>
```

---

### Adding Translations

1. **Add to en.json:**

```json
{
  "myFeature": {
    "title": "My Feature",
    "description": "This is my feature"
  }
}
```

2. **Add to cs.json:**

```json
{
  "myFeature": {
    "title": "Má Funkce",
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

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>
```

---

### Debugging

**Vue DevTools:**

```bash
# Open in browser
# Vue DevTools extension auto-detects app
```

**Store Inspection:**

```typescript
// In browser console
import { useCoursesStore } from '@client/stores'

const coursesStore = useCoursesStore()
console.log(coursesStore.$state)
```

**LocalStorage:**

```javascript
// In browser console
localStorage.getItem('kreditozrouti:timetable')
localStorage.getItem('kreditozrouti:wizard')
```

**Network Requests:**

Check browser Network tab for API calls:
- POST /courses
- POST /study_plans

**Hot Module Replacement (HMR):**

Vite automatically reloads on file changes.

---

### Testing

**Unit Testing:**

Not yet implemented. Consider adding:
- Vitest for unit tests
- Vue Test Utils for component tests

**E2E Testing:**

Not yet implemented. Consider adding:
- Playwright or Cypress

---

### Building for Production

```bash
# Build
pnpm run build

# Output: dist/
# - index.html
# - assets/
#   - *.js
#   - *.css

# Preview
pnpm run preview
```

**Environment Variables:**

Set in `.env.production`:

```env
VITE_API_URL=https://api.example.com
```

**Deployment:**

Deploy `dist/` folder to static hosting:
- Netlify
- Vercel
- Cloudflare Pages
- GitHub Pages

**SPA Routing:**

Configure server for SPA routing:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

---

## Troubleshooting

### Common Issues

**Routes not working:**

Check that pages are in `/src/pages` with `.vue` extension.

**Store state not persisting:**

Check localStorage in browser DevTools:
- Application > Local Storage

**API errors not showing:**

Check error interceptor in `src/api.ts`.

**Translations missing:**

Ensure key exists in both `en.json` and `cs.json`.

**Styles not applying:**

- Check Tailwind classes are valid
- Ensure `@import 'tailwindcss'` in index.css
- Check custom CSS in `insis.css`

**Build errors:**

```bash
# Clear cache
rm -rf node_modules .vite
pnpm install
pnpm run build
```

**Type errors:**

```bash
# Run type check
pnpm run type-check
```

**HMR not working:**

Restart dev server:

```bash
pnpm run dev
```

---

## Additional Resources

- [Vue 3 Documentation](https://vuejs.org/)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [Vue Router Documentation](https://router.vuejs.org/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [Vue I18n Documentation](https://vue-i18n.intlify.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)

---

## Summary

The Client is a modern, feature-rich Vue 3 application that provides:

- **Intuitive UX** with 3-step wizard and dual-view mode
- **Advanced Filtering** with faceted search and time-based filters
- **Smart Scheduling** with conflict detection and completeness checking
- **Responsive Design** for desktop and mobile
- **Multi-Language** support for Czech and English users
- **Type Safety** throughout with TypeScript
- **State Persistence** for seamless user experience
- **Modern Architecture** with Composition API, Pinia, and file-based routing

The architecture emphasizes maintainability, reusability, and developer experience through composables, clear separation of concerns, and comprehensive type safety.
