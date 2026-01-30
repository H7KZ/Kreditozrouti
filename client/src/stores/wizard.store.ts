import type StudyPlansResponse from '@api/Controllers/Kreditozrouti/types/StudyPlansResponse'
import type { Faculty, StudyPlan, StudyPlanCourse } from '@api/Database/types'
import type FacetItem from '@api/Interfaces/FacetItem'
import type { StudyPlansFilter } from '@api/Validations/StudyPlansFilterValidation'
import api from '@client/api'
import { STORAGE_KEYS } from '@client/constants/storage.ts'
import { loadFromStorage, removeFromStorage, saveToStorage } from '@client/utils/localstorage'
import type InSISSemester from '@scraper/Types/InSISSemester'
import { defineStore } from 'pinia'

type StudyPlanWithRelations = StudyPlan<Faculty, StudyPlanCourse>

/** Represents a selected study plan with its metadata */
interface SelectedStudyPlan {
	id: number
	ident: string | null
	title: string | null
}

interface PersistedWizardState {
	facultyId: string | null
	year: number | null
	semester: InSISSemester
	/** @deprecated Use selectedStudyPlans instead */
	studyPlanId: number | null
	/** @deprecated Use selectedStudyPlans instead */
	studyPlanIdent: string | null
	/** @deprecated Use selectedStudyPlans instead */
	studyPlanTitle: string | null
	/** Multiple selected study plans */
	selectedStudyPlans: SelectedStudyPlan[]
	completed: boolean
}

interface WizardState {
	currentStep: number
	facultyId: string | null
	year: number | null
	semester: InSISSemester
	/** Multiple selected study plans */
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

/**
 * Wizard Store
 * Manages the study plan selection wizard state with localStorage persistence.
 * Supports selecting multiple study plans (e.g., base plan + specialization).
 * Refactored to use shared localStorage utility.
 *
 * Flow:
 * 1. Select Faculty → 2. Select Year (auto-selects Winter Semester) → 3. Select Study Plans (multi-select)
 */
export const useWizardStore = defineStore('wizard', {
	state: (): WizardState => ({
		currentStep: 1,
		facultyId: null,
		year: null,
		semester: 'ZS',
		selectedStudyPlans: [],
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

		/** Whether step 3 is complete (at least one study plan selected) */
		step3Complete(): boolean {
			return this.selectedStudyPlans.length > 0
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

		/** Select a faculty and proceed to step 2 */
		selectFaculty(id: string) {
			this.facultyId = id
			// Reset downstream selections
			this.year = null
			this.selectedStudyPlans = []
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
			this.selectedStudyPlans = []

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
				// Remove if already selected
				this.selectedStudyPlans.splice(existingIndex, 1)
			} else {
				// Add to selection
				this.selectedStudyPlans.push({ id, ident, title })
			}

			this.persist()
		},

		/** Select a single study plan (replaces current selection) */
		selectStudyPlan(id: number, ident: string | null, title: string | null) {
			this.selectedStudyPlans = [{ id, ident, title }]
			this.persist()
		},

		/** Clear all selected study plans */
		clearStudyPlanSelection() {
			this.selectedStudyPlans = []
			this.persist()
		},

		/** Go back to a specific step */
		goToStep(step: number) {
			if (step < 1 || step > 3) return

			this.currentStep = step

			// Clear downstream selections when going back
			if (step < 2) {
				this.year = null
				this.selectedStudyPlans = []
			}
			if (step < 3) {
				this.selectedStudyPlans = []
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
			this.completed = false
			this.studyPlans = []
			this.levelFilter = []
			this.titleSearch = ''

			// Clear localStorage using shared utility
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
				// Keep legacy fields for backward compatibility
				studyPlanId: this.selectedStudyPlans[0]?.id ?? null,
				studyPlanIdent: this.selectedStudyPlans[0]?.ident ?? null,
				studyPlanTitle: this.selectedStudyPlans[0]?.title ?? null,
				selectedStudyPlans: this.selectedStudyPlans,
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
				// Migrate from legacy single-select
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

			this.completed = state.completed

			// Determine current step based on completed data
			if (this.selectedStudyPlans.length > 0) {
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
		},
	},
})
