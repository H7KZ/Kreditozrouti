# Shared — HTTP Contracts

Wire-format interfaces shared between the API (serialises) and the client (deserialises). Stored in `shared/http/`.

**Rule:** All `Date` fields from Kysely become `string` in DTOs (ISO-8601 after `JSON.stringify`).

---

## `shared/http/responses.ts`

All DTO interfaces the API sends as JSON and the client receives.

```typescript
FacultyDTO
// id, title, is_schedule_publicly_visible

CourseDTO
// all course scalar fields (ident, title_cs, title_en, ects, semester, year, ...)
// + blocked_by_course_idents: string[] | null
// + excluded_after_course_idents: string[] | null
// + concurrent_exclusion_idents: string[] | null
// + recommended_before_course_idents: string[] | null

CourseUnitSlotDTO
// id, day, date, time_from (minutes), time_to, location, type

CourseUnitDTO
// id, lecturer, capacity, note, slots: CourseUnitSlotDTO[]

CourseAssessmentDTO
// id, method, weight

StudyPlanCourseDTO
// id, course_ident, group, category

CourseWithRelationsDTO
// CourseDTO + faculty: FacultyDTO + units: CourseUnitDTO[] + assessments: CourseAssessmentDTO[]
//            + study_plans: StudyPlanCourseDTO[]

StudyPlanDTO
// all study plan scalar fields

StudyPlanWithRelationsDTO
// StudyPlanDTO + faculty: FacultyDTO + courses: StudyPlanCourseDTO[]
```

### Response Envelopes

```typescript
CoursesResponseDTO
// { data: CourseWithRelationsDTO[], facets: CourseFacets, meta: PaginationMeta }

StudyPlansResponseDTO
// { data: StudyPlanWithRelationsDTO[], facets: StudyPlanFacets, meta: PaginationMeta }

StudyPlanCoursesResponseDTO
// { data: CourseDTO[], meta: { count: number; total: number } }
```

**Sync requirement:** The `facets` shapes in `CoursesResponseDTO` and `StudyPlansResponseDTO` must stay in sync with the
API's `CoursesResponse.ts` and `StudyPlansResponse.ts`. When the API adds or renames a facet key, update the DTO here
too.

---

## `shared/http/courses.ts`

The full request body sent to `POST /courses`.

```typescript
interface CoursesFilter {
	ids?: number[]
	idents?: string[]
	title?: string
	search?: string
	semesters?: InSISSemester[]
	years?: number[]
	faculty_ids?: number[]
	levels?: string[]
	languages?: string[]
	include_times?: TimeSelection[]
	exclude_times?: TimeSelection[]
	lecturers?: string[]
	study_plan_ids?: number[]
	groups?: InSISStudyPlanCourseGroup[]
	categories?: InSISStudyPlanCourseCategory[]
	ects?: number[]
	mode_of_completions?: string[]
	mode_of_deliveries?: string[]
	completed_course_idents?: string[]
	sort_by: 'ident' | 'title' | 'ects' | 'faculty' | 'year' | 'semester'
	sort_dir: 'asc' | 'desc'
	limit: number
	offset: number
}
```

The `filters.store` in the client owns an instance of this. `coursesStore.fetchCourses()` sends it as the POST body.

---

## `shared/http/study-plans.ts`

The full request body sent to `POST /study_plans`.

```typescript
interface StudyPlansFilter {
	ids?: number[]
	title?: string
	faculty_ids?: number[]
	years?: number[]
	semesters?: InSISSemester[]
	sort_by: 'title' | 'faculty' | 'year' | 'semester'
	sort_dir: 'asc' | 'desc'
	limit: number
	offset: number
}
```

---

## `shared/http/facets.ts`

```typescript
interface FacetItem {
	value: string
	count: number
}
```

Used in `CoursesResponseDTO.facets` and `StudyPlansResponseDTO.facets` to power the filter panel's checkbox groups.

---

## `shared/http/pagination.ts`

```typescript
interface PaginationMeta {
	limit: number
	offset: number
	count: number // items in this page
	total: number // total matching items across all pages
}
```

---

## `shared/http/admin.ts`

Types for admin-only endpoints (`/admin/*`, `/commands/*`). Covers queue stats, scheduler status, and error metric
shapes consumed by the admin panel.

---

## `shared/http/optimize.ts`

Wire-format contract for `POST /optimize` (timetable optimizer). Shared by the client's constraint-config/results
drawers and the API's `OptimizeService`/`OptimizeController`.

```typescript
interface SolverConstraints {
	required_course_ids?: number[]
	excluded_course_ids?: number[]
	credit_min?: number
	credit_max?: number
	blackout_windows?: TimeSelection[] // reuses shared/domain/time.ts TimeSelection
	preferred_days?: Day[]
	max_consecutive_minutes?: number
}

interface OptimizeRequest {
	course_ids: number[]
	constraints: SolverConstraints
	mode: 'build' | 'add'
	locked_unit_ids?: number[] // required when mode === 'add'
}

interface SelectedCourseUnitDTO {
	// mirrors client/src/types/course.ts SelectedCourseUnit field-for-field so
	// OptimizerCandidateDTO.units is directly loadable via timetable.store.loadUnits()
	courseId: number
	courseIdent: string
	courseTitle: string
	courseTitleCs: string
	courseTitleEn: string
	unitId: number
	unitType: CourseUnitType
	slotId: number
	day?: Day
	date?: string
	timeFrom: number
	timeTo: number
	location?: string
	lecturer?: string
	ects?: number
	snapshotAvailableTypes?: CourseUnitType[]
}

interface ScoreBreakdownDTO {
	campus_conflicts: number
	gap_minutes: number
	off_preferred_days: number
	long_study_blocks: number
	total: number
}

interface OptimizerCandidateDTO {
	units: SelectedCourseUnitDTO[]
	score: ScoreBreakdownDTO
	changed_unit_ids: number[] // for diff highlighting against the student's current selection
}

interface OptimizeResponseDTO {
	candidates: OptimizerCandidateDTO[]
	partial: boolean // true if the solver's timeout guard fired before exhausting the search
	unlocked_course_id?: number // only in 'add' mode, when one existing course had to be unlocked
	pool_truncated: boolean // true when course_ids exceeded MAX_POOL_SIZE and was truncated
}

const MAX_POOL_SIZE = 30 // server-side course-pool cap; shared so API enforcement and client
// truncation-notice copy read the same number instead of duplicating it
```
