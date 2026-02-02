import type StudyPlanCoursesResponse from '@api/Controllers/Kreditozrouti/types/StudyPlanCoursesResponse'
import type StudyPlansResponse from '@api/Controllers/Kreditozrouti/types/StudyPlansResponse'
import type { Course, StudyPlanWithRelations } from '@api/Database/types'
import type { StudyPlanCoursesFilter } from '@api/Validations/StudyPlanCoursesFilterValidation'
import type { StudyPlansFilter } from '@api/Validations/StudyPlansFilterValidation'
import api from '@client/api'
import { STORAGE_KEYS } from '@client/constants/storage.ts'
import { PersistedWizardState, WizardState } from '@client/types'
import { loadFromStorage, removeFromStorage, saveToStorage } from '@client/utils/localstorage'
import { defineStore } from 'pinia'

/**
 * Wizard Store
 * Manages the study plan selection wizard state with localStorage persistence.
 * Supports selecting multiple study plans (e.g., base plan + specialization).
 * Now includes Step 4: selecting already-completed courses.
 *
 * Uses the dedicated POST /study_plans/courses endpoint for step 4,
 * and cross-references with study plan data from step 3 for category grouping.
 *
 * Flow:
 * 1. Select Faculty → 2. Select Year → 3. Select Study Plans → 4. Mark Completed Courses
 */
export const useWizardStore = defineStore('wizard', {
	state: (): WizardState => ({
		currentStep: 1,
		facultyId: null,
		year: null,
		semester: 'ZS',
		selectedStudyPlans: [],
		completedCourseIdents: [],
		completed: false,
		facultyFacets: [],
		yearFacets: [],
		levelFacets: [],
		studyPlans: [],
		levelFilter: [],
		titleSearch: '',
		loading: false,
		error: null,
		studyPlanCourses: [],
		studyPlanCoursesLoading: false,
		completedCoursesSearch: '',
		completedCoursesCategoryFilter: [],
	}),

	getters: {
		/** Whether step 1 is complete */
		step1Complete(): boolean {
			return this.facultyId !== null
		},

		/** Whether step 2 is complete */
		step2Complete(): boolean {
			return this.year !== null
		},

		/** Whether step 3 is complete (at least one study plan selected) */
		step3Complete(): boolean {
			return this.selectedStudyPlans.length > 0
		},

		/** Whether step 4 is complete (always true — marking completed courses is optional) */
		step4Complete(): boolean {
			return this.step3Complete
		},

		/** Whether user can proceed to step 2 */
		canProceedToStep2(): boolean {
			return this.step1Complete
		},

		/** Whether user can proceed to step 3 */
		canProceedToStep3(): boolean {
			return this.step1Complete && this.step2Complete
		},

		/** Whether user can proceed to step 4 */
		canProceedToStep4(): boolean {
			return this.step1Complete && this.step2Complete && this.step3Complete
		},

		/** Whether wizard can be completed */
		canComplete(): boolean {
			return this.step1Complete && this.step2Complete && this.step3Complete
		},

		/** Filtered study plans based on local filters */
		filteredStudyPlans(): StudyPlanWithRelations[] {
			let plans = this.studyPlans

			// Filter by level
			if (this.levelFilter.length > 0) {
				plans = plans.filter((p) => p.level && this.levelFilter.includes(p.level))
			}

			// Filter by title search
			if (this.titleSearch.trim()) {
				const search = this.titleSearch.toLowerCase().trim()
				plans = plans.filter((p) => p.title?.toLowerCase().includes(search) || p.ident?.toLowerCase().includes(search))
			}

			return plans
		},

		/**
		 * Build a mapping of course ident → set of categories
		 * by cross-referencing with the study plan data loaded in step 3.
		 *
		 * StudyPlanWithRelations includes `.courses` (StudyPlanCourse[])
		 * which carries `course_ident` and `category`.
		 */
		courseIdentToCategories(): Map<string, Set<string>> {
			const map = new Map<string, Set<string>>()

			// Only look at the selected study plans
			const selectedIds = new Set(this.selectedStudyPlans.map((p) => p.id))

			for (const plan of this.studyPlans) {
				if (!selectedIds.has(plan.id)) continue

				for (const spc of plan.courses || []) {
					if (!map.has(spc.course_ident)) {
						map.set(spc.course_ident, new Set())
					}
					map.get(spc.course_ident)!.add(spc.category)
				}
			}

			return map
		},

		/** Study plan courses filtered by search and category for step 4 */
		filteredStudyPlanCourses(): Course[] {
			let courses = this.studyPlanCourses

			// Filter by category (using cross-reference from study plan data)
			if (this.completedCoursesCategoryFilter.length > 0) {
				const identMap = this.courseIdentToCategories
				courses = courses.filter((c) => {
					const categories = identMap.get(c.ident)
					if (!categories) return false
					return this.completedCoursesCategoryFilter.some((cat) => categories.has(cat))
				})
			}

			// Filter by search
			if (this.completedCoursesSearch.trim()) {
				const search = this.completedCoursesSearch.toLowerCase().trim()
				courses = courses.filter(
					(c) =>
						c.ident?.toLowerCase().includes(search) ||
						c.title?.toLowerCase().includes(search) ||
						c.title_cs?.toLowerCase().includes(search) ||
						c.title_en?.toLowerCase().includes(search),
				)
			}

			return courses
		},

		/** Study plan courses grouped by category for step 4 display */
		studyPlanCoursesByCategory(): Map<string, Course[]> {
			const map = new Map<string, Course[]>()
			const identMap = this.courseIdentToCategories

			for (const course of this.filteredStudyPlanCourses) {
				const categories = identMap.get(course.ident)

				if (!categories || categories.size === 0) {
					// Course not found in study plan mapping — put under uncategorized
					if (!map.has('uncategorized')) {
						map.set('uncategorized', [])
					}
					map.get('uncategorized')!.push(course)
					continue
				}

				for (const category of categories) {
					if (!map.has(category)) {
						map.set(category, [])
					}
					map.get(category)!.push(course)
				}
			}

			return map
		},

		/** Available category facets derived from the study plan → course ident cross-reference */
		availableCourseCategories(): string[] {
			const categories = new Set<string>()
			for (const cats of this.courseIdentToCategories.values()) {
				for (const cat of cats) {
					categories.add(cat)
				}
			}
			// Sort by priority: compulsory first, then elective, etc.
			const priority = ['compulsory', 'elective', 'language', 'state_exam', 'physical_education', 'beyond_scope']
			return [...categories].sort((a, b) => {
				const ai = priority.indexOf(a)
				const bi = priority.indexOf(b)
				return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
			})
		},

		/** Number of completed courses */
		completedCourseCount(): number {
			return this.completedCourseIdents.length
		},

		/** Check if a course is marked as completed */
		isCourseCompleted(): (courseIdent: string) => boolean {
			return (courseIdent: string) => this.completedCourseIdents.includes(courseIdent)
		},

		/** Human-readable summary of current selection */
		selectionSummary(): string {
			const parts: string[] = []
			if (this.facultyId) {
				const faculty = this.facultyFacets.find((f) => f.value === this.facultyId)
				parts.push((faculty?.value || this.facultyId) as string)
			}
			if (this.year) {
				parts.push(`${this.year}/${this.year + 1}`)
			}
			if (this.selectedStudyPlans.length > 0) {
				const planTitles = this.selectedStudyPlans.map((p) => p.title || p.ident || `ID: ${p.id}`).join(', ')
				parts.push(planTitles)
			}
			return parts.join(' → ')
		},

		/** All selected study plan IDs */
		studyPlanIds(): number[] {
			return this.selectedStudyPlans.map((p) => p.id)
		},

		/** First selected study plan ID (for backward compatibility) */
		studyPlanId(): number | null {
			return this.selectedStudyPlans[0]?.id ?? null
		},

		/** All selected study plan idents */
		studyPlanIdents(): string[] | null {
			if (this.selectedStudyPlans.length === 0) return null
			return this.selectedStudyPlans.map((p) => p.ident || String(p.id))
		},

		/** All selected study plan titles */
		studyPlanTitles(): string[] | null {
			if (this.selectedStudyPlans.length === 0) return null
			return this.selectedStudyPlans.map((p) => p.title || p.ident || String(p.id))
		},

		/** Check if a specific study plan is selected */
		isStudyPlanSelected(): (id: number) => boolean {
			return (id: number) => this.selectedStudyPlans.some((p) => p.id === id)
		},
	},

	actions: {
		/** Load initial facet data for step 1 */
		async loadInitialFacets() {
			this.loading = true
			this.error = null

			try {
				const response = await api.post<StudyPlansResponse>('/study_plans', {
					semesters: ['ZS'],
					limit: 0,
					offset: 0,
				} satisfies Partial<StudyPlansFilter>)

				this.facultyFacets = response.data.facets.faculties
				this.yearFacets = response.data.facets.years
			} catch (e) {
				this.error = 'Failed to load faculties'
				console.error('Wizard: Failed to load initial facets', e)
			} finally {
				this.loading = false
			}
		},

		/** Load year facets for selected faculty */
		async loadYearFacets() {
			if (!this.facultyId) return

			this.loading = true
			this.error = null

			try {
				const response = await api.post<StudyPlansResponse>('/study_plans', {
					faculty_ids: [this.facultyId],
					semesters: ['ZS'],
					limit: 0,
					offset: 0,
				} satisfies Partial<StudyPlansFilter>)

				this.yearFacets = response.data.facets.years
			} catch (e) {
				this.error = 'Failed to load years'
				console.error('Wizard: Failed to load year facets', e)
			} finally {
				this.loading = false
			}
		},

		/** Load study plans for step 3 */
		async loadStudyPlans() {
			if (!this.facultyId || !this.year) return

			this.loading = true
			this.error = null

			try {
				const response = await api.post<StudyPlansResponse>('/study_plans', {
					faculty_ids: [this.facultyId],
					years: [this.year],
					semesters: [this.semester],
					limit: 100,
					offset: 0,
				} satisfies Partial<StudyPlansFilter>)

				this.studyPlans = response.data.data
				this.levelFacets = response.data.facets.levels
			} catch (e) {
				this.error = 'Failed to load study plans'
				console.error('Wizard: Failed to load study plans', e)
			} finally {
				this.loading = false
			}
		},

		/**
		 * Load courses for selected study plans (for step 4).
		 * Uses the dedicated POST /study_plans/courses endpoint.
		 * Category grouping is derived client-side by cross-referencing
		 * with the StudyPlanCourse pivot data from step 3.
		 */
		async loadStudyPlanCourses() {
			if (this.selectedStudyPlans.length === 0) return

			this.studyPlanCoursesLoading = true
			this.error = null

			try {
				const response = await api.post<StudyPlanCoursesResponse>('/study_plans/courses', {
					study_plan_ids: this.studyPlanIds,
				} satisfies StudyPlanCoursesFilter)

				this.studyPlanCourses = response.data.data
			} catch (e) {
				this.error = 'Failed to load courses for study plans'
				console.error('Wizard: Failed to load study plan courses', e)
			} finally {
				this.studyPlanCoursesLoading = false
			}
		},

		/** Select a faculty and proceed to step 2 */
		selectFaculty(id: string) {
			this.facultyId = id
			// Reset downstream selections
			this.year = null
			this.selectedStudyPlans = []
			this.completedCourseIdents = []
			this.studyPlans = []
			this.studyPlanCourses = []

			// Load year facets for this faculty
			this.loadYearFacets()

			// Move to step 2
			this.currentStep = 2
			this.persist()
		},

		/** Select a year and proceed to step 3 */
		selectYear(selectedYear: number) {
			this.year = selectedYear
			this.semester = 'ZS'
			// Reset downstream
			this.selectedStudyPlans = []
			this.completedCourseIdents = []
			this.studyPlanCourses = []

			// Load study plans
			this.loadStudyPlans()

			// Move to step 3
			this.currentStep = 3
			this.persist()
		},

		/** Toggle selection of a study plan (for multi-select) */
		toggleStudyPlan(id: number, ident: string | null, title: string | null) {
			const existingIndex = this.selectedStudyPlans.findIndex((p) => p.id === id)

			if (existingIndex !== -1) {
				this.selectedStudyPlans.splice(existingIndex, 1)
			} else {
				this.selectedStudyPlans.push({ id, ident, title })
			}

			// Reset completed courses when study plans change
			this.completedCourseIdents = []
			this.studyPlanCourses = []

			this.persist()
		},

		/** Select a single study plan (replaces current selection) */
		selectStudyPlan(id: number, ident: string | null, title: string | null) {
			this.selectedStudyPlans = [{ id, ident, title }]
			this.completedCourseIdents = []
			this.studyPlanCourses = []
			this.persist()
		},

		/** Clear all selected study plans */
		clearStudyPlanSelection() {
			this.selectedStudyPlans = []
			this.completedCourseIdents = []
			this.studyPlanCourses = []
			this.persist()
		},

		/** Proceed from step 3 to step 4 */
		proceedToCompletedCourses() {
			if (!this.canProceedToStep4) return

			this.currentStep = 4
			// Load courses for the selected study plans if not already loaded
			if (this.studyPlanCourses.length === 0) {
				this.loadStudyPlanCourses()
			}
			this.persist()
		},

		/** Toggle a course as completed/not completed */
		toggleCompletedCourse(courseIdent: string) {
			const index = this.completedCourseIdents.indexOf(courseIdent)
			if (index !== -1) {
				this.completedCourseIdents.splice(index, 1)
			} else {
				this.completedCourseIdents.push(courseIdent)
			}
			this.persist()
		},

		/** Mark a course as completed */
		markCourseCompleted(courseIdent: string) {
			if (!this.completedCourseIdents.includes(courseIdent)) {
				this.completedCourseIdents.push(courseIdent)
				this.persist()
			}
		},

		/** Unmark a course as completed */
		unmarkCourseCompleted(courseIdent: string) {
			const index = this.completedCourseIdents.indexOf(courseIdent)
			if (index !== -1) {
				this.completedCourseIdents.splice(index, 1)
				this.persist()
			}
		},

		/** Set category filter for completed courses step */
		setCompletedCoursesCategoryFilter(categories: string[]) {
			this.completedCoursesCategoryFilter = categories
		},

		/** Set search filter for completed courses step */
		setCompletedCoursesSearch(search: string) {
			this.completedCoursesSearch = search
		},

		/** Go back to a specific step */
		goToStep(step: number) {
			if (step < 1 || step > 4) return

			this.currentStep = step

			// Clear downstream selections when going back
			if (step < 2) {
				this.year = null
				this.selectedStudyPlans = []
				this.completedCourseIdents = []
				this.studyPlanCourses = []
			}
			if (step < 3) {
				this.selectedStudyPlans = []
				this.completedCourseIdents = []
				this.studyPlanCourses = []
			}
			this.persist()
		},

		/** Complete the wizard */
		completeWizard(): boolean {
			if (!this.canComplete) return false

			this.completed = true
			this.persist()
			return true
		},

		/** Reset the wizard to initial state */
		reset() {
			this.currentStep = 1
			this.facultyId = null
			this.year = null
			this.semester = 'ZS'
			this.selectedStudyPlans = []
			this.completedCourseIdents = []
			this.completed = false
			this.studyPlans = []
			this.studyPlanCourses = []
			this.levelFilter = []
			this.titleSearch = ''
			this.completedCoursesSearch = ''
			this.completedCoursesCategoryFilter = []

			removeFromStorage(STORAGE_KEYS.WIZARD)
		},

		/** Set local level filter for step 3 */
		setLevelFilter(levels: string[]) {
			this.levelFilter = levels
		},

		/** Set local title search for step 3 */
		setTitleSearch(search: string) {
			this.titleSearch = search
		},

		/** Persist state to localStorage using shared utility */
		persist() {
			const state: PersistedWizardState = {
				facultyId: this.facultyId,
				year: this.year,
				semester: this.semester,
				studyPlanId: this.selectedStudyPlans[0]?.id ?? null,
				studyPlanIdent: this.selectedStudyPlans[0]?.ident ?? null,
				studyPlanTitle: this.selectedStudyPlans[0]?.title ?? null,
				selectedStudyPlans: this.selectedStudyPlans,
				completedCourseIdents: this.completedCourseIdents,
				completed: this.completed,
			}
			saveToStorage(STORAGE_KEYS.WIZARD, state)
		},

		/** Hydrate state from localStorage using shared utility */
		hydrate() {
			const state = loadFromStorage<PersistedWizardState>(STORAGE_KEYS.WIZARD)
			if (!state) return

			this.facultyId = state.facultyId
			this.year = state.year
			this.semester = state.semester || 'ZS'

			// Handle multi-select or migrate from legacy single-select
			if (state.selectedStudyPlans && state.selectedStudyPlans.length > 0) {
				this.selectedStudyPlans = state.selectedStudyPlans
			} else if (state.studyPlanId) {
				this.selectedStudyPlans = [
					{
						id: state.studyPlanId,
						ident: state.studyPlanIdent,
						title: state.studyPlanTitle,
					},
				]
			} else {
				this.selectedStudyPlans = []
			}

			// Hydrate completed courses
			this.completedCourseIdents = state.completedCourseIdents || []

			this.completed = state.completed

			// Determine current step based on completed data
			if (this.completed) {
				this.currentStep = 4
			} else if (this.selectedStudyPlans.length > 0) {
				this.currentStep = 3
			} else if (state.year) {
				this.currentStep = 3
				this.loadStudyPlans()
			} else if (state.facultyId) {
				this.currentStep = 2
				this.loadYearFacets()
			}
		},
	},
})
