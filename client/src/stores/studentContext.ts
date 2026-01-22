import api from '@client/api'
import type { FacetItem } from '@client/types/courses'
import type { StudyPlan, StudyPlansFacets, StudyPlansResponse } from '@client/types/studyPlans'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type WizardStep = 'faculty' | 'year' | 'studyPlan' | 'complete'

export const useStudentContext = defineStore('studentContext', () => {
	// ---- Wizard State ----
	const currentStep = ref<WizardStep>('faculty')
	const isLoading = ref(false)
	const error = ref<string | null>(null)

	// ---- Selected Values ----
	const selectedFacultyId = ref<string | null>(null)
	const selectedYear = ref<number | null>(null)
	const selectedStudyPlanId = ref<number | null>(null)
	const selectedStudyPlan = ref<StudyPlan | null>(null)

	// ---- Facets for selection ----
	const facets = ref<StudyPlansFacets | null>(null)
	const studyPlans = ref<StudyPlan[]>([])

	// ---- Computed ----
	const availableFaculties = computed<FacetItem[]>(() => {
		return facets.value?.faculties ?? []
	})

	const availableYears = computed<FacetItem[]>(() => {
		return facets.value?.years ?? []
	})

	const selectedFacultyName = computed(() => {
		const faculty = availableFaculties.value.find((f) => f.value === selectedFacultyId.value)
		return faculty?.value as string | null
	})

	const isWizardComplete = computed(() => currentStep.value === 'complete')

	const canProceedToYear = computed(() => selectedFacultyId.value !== null)
	const canProceedToStudyPlan = computed(() => selectedFacultyId.value !== null && selectedYear.value !== null)

	// ---- Actions ----

	/**
	 * Fetches initial facets for the wizard
	 */
	async function fetchFacets(): Promise<void> {
		isLoading.value = true
		error.value = null

		try {
			const response = await api.post<StudyPlansResponse>('/study_plans', {
				limit: 100, // We only need facets
			})
			facets.value = response.data.facets
		} catch (err) {
			error.value = 'Nepodařilo se načíst data. Zkuste to prosím znovu.'
			console.error('Failed to fetch facets:', err)
		} finally {
			isLoading.value = false
		}
	}

	/**
	 * Fetches study plans filtered by faculty and year
	 */
	async function fetchStudyPlans(): Promise<void> {
		if (!selectedFacultyId.value || !selectedYear.value) return

		isLoading.value = true
		error.value = null

		try {
			const response = await api.post<StudyPlansResponse>('/study_plans', {
				faculty_id: selectedFacultyId.value,
				year: selectedYear.value,
				limit: 100,
			})
			studyPlans.value = response.data.data
		} catch (err) {
			error.value = 'Nepodařilo se načíst studijní plány.'
			console.error('Failed to fetch study plans:', err)
		} finally {
			isLoading.value = false
		}
	}

	/**
	 * Select a faculty and move to next step
	 */
	function selectFaculty(facultyId: string): void {
		selectedFacultyId.value = facultyId
		// Reset dependent selections
		selectedYear.value = null
		selectedStudyPlanId.value = null
		selectedStudyPlan.value = null
		studyPlans.value = []
		currentStep.value = 'year'
	}

	/**
	 * Select a year and fetch study plans
	 */
	async function selectYear(year: number): Promise<void> {
		selectedYear.value = year
		// Reset dependent selections
		selectedStudyPlanId.value = null
		selectedStudyPlan.value = null
		currentStep.value = 'studyPlan'
		await fetchStudyPlans()
	}

	/**
	 * Select a study plan and complete the wizard
	 */
	function selectStudyPlan(studyPlan: StudyPlan): void {
		selectedStudyPlanId.value = studyPlan.id
		selectedStudyPlan.value = studyPlan
		currentStep.value = 'complete'
	}

	/**
	 * Go back to a previous step
	 */
	function goToStep(step: WizardStep): void {
		// Only allow going back, not forward
		const stepOrder: WizardStep[] = ['faculty', 'year', 'studyPlan', 'complete']
		const currentIndex = stepOrder.indexOf(currentStep.value)
		const targetIndex = stepOrder.indexOf(step)

		if (targetIndex < currentIndex) {
			currentStep.value = step

			// Reset selections for steps after the target
			if (step === 'faculty') {
				selectedFacultyId.value = null
				selectedYear.value = null
				selectedStudyPlanId.value = null
				selectedStudyPlan.value = null
				studyPlans.value = []
			} else if (step === 'year') {
				selectedYear.value = null
				selectedStudyPlanId.value = null
				selectedStudyPlan.value = null
				studyPlans.value = []
			} else if (step === 'studyPlan') {
				selectedStudyPlanId.value = null
				selectedStudyPlan.value = null
			}
		}
	}

	/**
	 * Reset the wizard to initial state
	 */
	function reset(): void {
		currentStep.value = 'faculty'
		selectedFacultyId.value = null
		selectedYear.value = null
		selectedStudyPlanId.value = null
		selectedStudyPlan.value = null
		studyPlans.value = []
		error.value = null
	}

	/**
	 * Initialize the store - call on app mount
	 */
	async function initialize(): Promise<void> {
		await fetchFacets()
	}

	return {
		// State
		currentStep,
		isLoading,
		error,
		selectedFacultyId,
		selectedYear,
		selectedStudyPlanId,
		selectedStudyPlan,
		facets,
		studyPlans,

		// Computed
		availableFaculties,
		availableYears,
		selectedFacultyName,
		isWizardComplete,
		canProceedToYear,
		canProceedToStudyPlan,

		// Actions
		fetchFacets,
		fetchStudyPlans,
		selectFaculty,
		selectYear,
		selectStudyPlan,
		goToStep,
		reset,
		initialize,
	}
})
