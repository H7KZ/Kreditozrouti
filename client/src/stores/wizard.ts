import { defineStore } from 'pinia'

import StudyPlansResponse from '@api/Controllers/Kreditozrouti/types/StudyPlansResponse.ts'
import { Faculty, StudyPlan, StudyPlanCourse } from '@api/Database/types'
import FacetItem from '@api/Interfaces/FacetItem.ts'
import { StudyPlansFilter } from '@api/Validations/StudyPlansFilterValidation.ts'
import api from '@client/api'
import InSISSemester from '@scraper/Types/InSISSemester.ts'

const STORAGE_KEY = 'kreditozrouti:wizard'

type StudyPlanWithRelations = StudyPlan<Faculty, StudyPlanCourse>

interface PersistedWizardState {
	facultyId: string | null
	year: number | null
	semester: InSISSemester
	studyPlanId: number | null
	studyPlanIdent: string | null
	studyPlanTitle: string | null
	completed: boolean
}

interface WizardState {
	currentStep: number
	facultyId: string | null
	year: number | null
	semester: InSISSemester
	studyPlanId: number | null
	studyPlanIdent: string | null
	studyPlanTitle: string | null
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

/**
 * Wizard Store
 * Manages the study plan selection wizard state with localStorage persistence.
 *
 * Flow:
 * 1. Select Faculty → 2. Select Year (auto-selects Winter Semester) → 3. Select Study Plan
 */
export const useWizardStore = defineStore('wizard', {
	state: (): WizardState => ({
		currentStep: 1,
		facultyId: null,
		year: null,
		semester: 'ZS',
		studyPlanId: null,
		studyPlanIdent: null,
		studyPlanTitle: null,
		completed: false,
		facultyFacets: [],
		yearFacets: [],
		levelFacets: [],
		studyPlans: [],
		levelFilter: [],
		titleSearch: '',
		loading: false,
		error: null,
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

		/** Whether step 3 is complete */
		step3Complete(): boolean {
			return this.studyPlanId !== null
		},

		/** Whether user can proceed to step 2 */
		canProceedToStep2(): boolean {
			return this.step1Complete
		},

		/** Whether user can proceed to step 3 */
		canProceedToStep3(): boolean {
			return this.step1Complete && this.step2Complete
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
			if (this.studyPlanTitle) {
				parts.push(this.studyPlanTitle)
			}
			return parts.join(' → ')
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

		/** Select a faculty and proceed to step 2 */
		selectFaculty(id: string) {
			this.facultyId = id
			// Reset downstream selections
			this.year = null
			this.studyPlanId = null
			this.studyPlanIdent = null
			this.studyPlanTitle = null
			this.studyPlans = []

			// Load year facets for this faculty
			this.loadYearFacets()

			// Move to step 2
			this.currentStep = 2
			this.persist()
		},

		/** Select a year and proceed to step 3 */
		selectYear(selectedYear: number) {
			this.year = selectedYear
			this.semester = 'ZS' // Auto-select Winter Semester (ZS = Zimní semestr)
			// Reset study plan selection
			this.studyPlanId = null
			this.studyPlanIdent = null
			this.studyPlanTitle = null

			// Load study plans
			this.loadStudyPlans()

			// Move to step 3
			this.currentStep = 3
			this.persist()
		},

		/** Select a study plan */
		selectStudyPlan(id: number, ident: string | null, title: string | null) {
			this.studyPlanId = id
			this.studyPlanIdent = ident
			this.studyPlanTitle = title
			this.persist()
		},

		/** Go back to a specific step */
		goToStep(step: number) {
			if (step < 1 || step > 3) return

			this.currentStep = step

			// Clear downstream selections when going back
			if (step < 2) {
				this.year = null
				this.studyPlanId = null
				this.studyPlanIdent = null
				this.studyPlanTitle = null
			}
			if (step < 3) {
				this.studyPlanId = null
				this.studyPlanIdent = null
				this.studyPlanTitle = null
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
			this.studyPlanId = null
			this.studyPlanIdent = null
			this.studyPlanTitle = null
			this.completed = false
			this.studyPlans = []
			this.levelFilter = []
			this.titleSearch = ''

			// Clear localStorage
			localStorage.removeItem(STORAGE_KEY)
		},

		/** Set local level filter for step 3 */
		setLevelFilter(levels: string[]) {
			this.levelFilter = levels
		},

		/** Set local title search for step 3 */
		setTitleSearch(search: string) {
			this.titleSearch = search
		},

		persist() {
			const state: PersistedWizardState = {
				facultyId: this.facultyId,
				year: this.year,
				semester: this.semester,
				studyPlanId: this.studyPlanId,
				studyPlanIdent: this.studyPlanIdent,
				studyPlanTitle: this.studyPlanTitle,
				completed: this.completed,
			}
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
		},

		hydrate() {
			const stored = localStorage.getItem(STORAGE_KEY)
			if (!stored) return

			try {
				const state: PersistedWizardState = JSON.parse(stored)

				this.facultyId = state.facultyId
				this.year = state.year
				this.semester = state.semester || 'ZS'
				this.studyPlanId = state.studyPlanId
				this.studyPlanIdent = state.studyPlanIdent
				this.studyPlanTitle = state.studyPlanTitle
				this.completed = state.completed

				// Determine current step based on completed data
				if (state.studyPlanId) {
					this.currentStep = 3
				} else if (state.year) {
					this.currentStep = 3
					// Load study plans for this selection
					this.loadStudyPlans()
				} else if (state.facultyId) {
					this.currentStep = 2
					// Load year facets
					this.loadYearFacets()
				}
			} catch (e) {
				console.error('Wizard: Failed to hydrate from localStorage', e)
				localStorage.removeItem(STORAGE_KEY)
			}
		},
	},
})
