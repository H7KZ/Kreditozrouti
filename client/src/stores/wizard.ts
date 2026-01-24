import StudyPlansResponse from '@api/Controllers/Kreditozrouti/types/StudyPlansResponse.ts'
import FacetItem from '@api/Interfaces/FacetItem.ts'
import { StudyPlansFilter } from '@api/Validations/StudyPlansFilterValidation.ts'
import api from '@client/api'
import InSISSemester from '@scraper/Types/InSISSemester.ts'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

const STORAGE_KEY = 'kreditozrouti:wizard'

interface PersistedWizardState {
	facultyId: string | null
	year: number | null
	semester: InSISSemester
	studyPlanId: number | null
	studyPlanIdent: string | null
	studyPlanTitle: string | null
	completed: boolean
}

/**
 * Wizard Store
 * Manages the study plan selection wizard state with localStorage persistence.
 *
 * Flow:
 * 1. Select Faculty → 2. Select Year (auto-selects Winter Semester) → 3. Select Study Plan
 */
export const useWizardStore = defineStore('wizard', () => {
	// =========================================================================
	// STATE
	// =========================================================================

	/** Current wizard step (1-3) */
	const currentStep = ref(1)

	/** Selected faculty ID */
	const facultyId = ref<string | null>(null)

	/** Selected academic year */
	const year = ref<number | null>(null)

	/** Selected semester (defaults to Winter = ZS = Zimní semestr) */
	const semester = ref<InSISSemester>('ZS')

	/** Selected study plan ID */
	const studyPlanId = ref<number | null>(null)

	/** Selected study plan ident code */
	const studyPlanIdent = ref<string | null>(null)

	/** Selected study plan title */
	const studyPlanTitle = ref<string | null>(null)

	/** Whether the wizard has been completed */
	const completed = ref(false)

	// Facet data from API
	const facultyFacets = ref<FacetItem[]>([])
	const yearFacets = ref<FacetItem[]>([])
	const levelFacets = ref<FacetItem[]>([])
	const studyPlans = ref<StudyPlansResponse['data']>([])

	// Local filters for step 3
	const levelFilter = ref<string[]>([])
	const titleSearch = ref('')

	// Loading states
	const loading = ref(false)
	const error = ref<string | null>(null)

	// =========================================================================
	// COMPUTED
	// =========================================================================

	/** Whether step 1 is complete */
	const step1Complete = computed(() => facultyId.value !== null)

	/** Whether step 2 is complete */
	const step2Complete = computed(() => year.value !== null)

	/** Whether step 3 is complete */
	const step3Complete = computed(() => studyPlanId.value !== null)

	/** Whether user can proceed to step 2 */
	const canProceedToStep2 = computed(() => step1Complete.value)

	/** Whether user can proceed to step 3 */
	const canProceedToStep3 = computed(() => step1Complete.value && step2Complete.value)

	/** Whether wizard can be completed */
	const canComplete = computed(() => step1Complete.value && step2Complete.value && step3Complete.value)

	/** Filtered study plans based on local filters */
	const filteredStudyPlans = computed(() => {
		let plans = studyPlans.value

		// Filter by level
		if (levelFilter.value.length > 0) {
			plans = plans.filter((p) => p.level && levelFilter.value.includes(p.level))
		}

		// Filter by title search
		if (titleSearch.value.trim()) {
			const search = titleSearch.value.toLowerCase().trim()
			plans = plans.filter((p) => p.title?.toLowerCase().includes(search) || p.ident?.toLowerCase().includes(search))
		}

		return plans
	})

	/** Human-readable summary of current selection */
	const selectionSummary = computed(() => {
		const parts: string[] = []
		if (facultyId.value) {
			const faculty = facultyFacets.value.find((f) => f.value === facultyId.value)
			parts.push((faculty?.value || facultyId.value) as string)
		}
		if (year.value) {
			parts.push(`${year.value}/${year.value + 1}`)
		}
		if (studyPlanTitle.value) {
			parts.push(studyPlanTitle.value)
		}
		return parts.join(' → ')
	})

	// =========================================================================
	// ACTIONS
	// =========================================================================

	/** Load initial facet data for step 1 */
	async function loadInitialFacets() {
		loading.value = true
		error.value = null

		try {
			const response = await api.post<StudyPlansResponse>('/study_plans', {
				semesters: ['ZS'],
				limit: 1,
				offset: 0,
			} satisfies Partial<StudyPlansFilter>)

			facultyFacets.value = response.data.facets.faculties
			yearFacets.value = response.data.facets.years
		} catch (e) {
			error.value = 'Failed to load faculties'
			console.error('Wizard: Failed to load initial facets', e)
		} finally {
			loading.value = false
		}
	}

	/** Load year facets for selected faculty */
	async function loadYearFacets() {
		if (!facultyId.value) return

		loading.value = true
		error.value = null

		try {
			const response = await api.post<StudyPlansResponse>('/study_plans', {
				faculty_ids: [facultyId.value],
				semesters: ['ZS'],
				limit: 1,
				offset: 0,
			} satisfies Partial<StudyPlansFilter>)

			yearFacets.value = response.data.facets.years
		} catch (e) {
			error.value = 'Failed to load years'
			console.error('Wizard: Failed to load year facets', e)
		} finally {
			loading.value = false
		}
	}

	/** Load study plans for step 3 */
	async function loadStudyPlans() {
		if (!facultyId.value || !year.value) return

		loading.value = true
		error.value = null

		try {
			const response = await api.post<StudyPlansResponse>('/study_plans', {
				faculty_ids: [facultyId.value],
				years: [year.value],
				semesters: [semester.value],
				limit: 100,
				offset: 0,
			} satisfies Partial<StudyPlansFilter>)

			studyPlans.value = response.data.data
			levelFacets.value = response.data.facets.levels
		} catch (e) {
			error.value = 'Failed to load study plans'
			console.error('Wizard: Failed to load study plans', e)
		} finally {
			loading.value = false
		}
	}

	/** Select a faculty and proceed to step 2 */
	function selectFaculty(id: string) {
		facultyId.value = id
		// Reset downstream selections
		year.value = null
		studyPlanId.value = null
		studyPlanIdent.value = null
		studyPlanTitle.value = null
		studyPlans.value = []

		// Load year facets for this faculty
		loadYearFacets()

		// Move to step 2
		currentStep.value = 2
		persist()
	}

	/** Select a year and proceed to step 3 */
	function selectYear(selectedYear: number) {
		year.value = selectedYear
		semester.value = 'ZS' // Auto-select Winter Semester (ZS = Zimní semestr)
		// Reset study plan selection
		studyPlanId.value = null
		studyPlanIdent.value = null
		studyPlanTitle.value = null

		// Load study plans
		loadStudyPlans()

		// Move to step 3
		currentStep.value = 3
		persist()
	}

	/** Select a study plan */
	function selectStudyPlan(id: number, ident: string | null, title: string | null) {
		studyPlanId.value = id
		studyPlanIdent.value = ident
		studyPlanTitle.value = title
		persist()
	}

	/** Go back to a specific step */
	function goToStep(step: number) {
		if (step < 1 || step > 3) return

		currentStep.value = step

		// Clear downstream selections when going back
		if (step < 2) {
			year.value = null
			studyPlanId.value = null
			studyPlanIdent.value = null
			studyPlanTitle.value = null
		}
		if (step < 3) {
			studyPlanId.value = null
			studyPlanIdent.value = null
			studyPlanTitle.value = null
		}
		persist()
	}

	/** Complete the wizard */
	function completeWizard() {
		if (!canComplete.value) return false

		completed.value = true
		persist()
		return true
	}

	/** Reset the wizard to initial state */
	function reset() {
		currentStep.value = 1
		facultyId.value = null
		year.value = null
		semester.value = 'ZS'
		studyPlanId.value = null
		studyPlanIdent.value = null
		studyPlanTitle.value = null
		completed.value = false
		studyPlans.value = []
		levelFilter.value = []
		titleSearch.value = ''

		// Clear localStorage
		localStorage.removeItem(STORAGE_KEY)
	}

	/** Set local level filter for step 3 */
	function setLevelFilter(levels: string[]) {
		levelFilter.value = levels
	}

	/** Set local title search for step 3 */
	function setTitleSearch(search: string) {
		titleSearch.value = search
	}

	// =========================================================================
	// PERSISTENCE
	// =========================================================================

	function persist() {
		const state: PersistedWizardState = {
			facultyId: facultyId.value,
			year: year.value,
			semester: semester.value,
			studyPlanId: studyPlanId.value,
			studyPlanIdent: studyPlanIdent.value,
			studyPlanTitle: studyPlanTitle.value,
			completed: completed.value,
		}
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
	}

	function hydrate() {
		const stored = localStorage.getItem(STORAGE_KEY)
		if (!stored) return

		try {
			const state: PersistedWizardState = JSON.parse(stored)

			facultyId.value = state.facultyId
			year.value = state.year
			semester.value = state.semester || 'ZS'
			studyPlanId.value = state.studyPlanId
			studyPlanIdent.value = state.studyPlanIdent
			studyPlanTitle.value = state.studyPlanTitle
			completed.value = state.completed

			// Determine current step based on completed data
			if (state.studyPlanId) {
				currentStep.value = 3
			} else if (state.year) {
				currentStep.value = 3
				// Load study plans for this selection
				loadStudyPlans()
			} else if (state.facultyId) {
				currentStep.value = 2
				// Load year facets
				loadYearFacets()
			}
		} catch (e) {
			console.error('Wizard: Failed to hydrate from localStorage', e)
			localStorage.removeItem(STORAGE_KEY)
		}
	}

	// Hydrate on store creation
	hydrate()

	// =========================================================================
	// RETURN
	// =========================================================================

	return {
		// State
		currentStep,
		facultyId,
		year,
		semester,
		studyPlanId,
		studyPlanIdent,
		studyPlanTitle,
		completed,
		facultyFacets,
		yearFacets,
		levelFacets,
		studyPlans,
		levelFilter,
		titleSearch,
		loading,
		error,

		// Computed
		step1Complete,
		step2Complete,
		step3Complete,
		canProceedToStep2,
		canProceedToStep3,
		canComplete,
		filteredStudyPlans,
		selectionSummary,

		// Actions
		loadInitialFacets,
		loadYearFacets,
		loadStudyPlans,
		selectFaculty,
		selectYear,
		selectStudyPlan,
		goToStep,
		completeWizard,
		reset,
		setLevelFilter,
		setTitleSearch,
	}
})
