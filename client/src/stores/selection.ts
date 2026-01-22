import { Faculty, StudyPlan, StudyPlanWithRelations } from '@api/Database/types'
import { ExtendedFaculty, FACULTIES } from '@client/constants/faculties.ts'
import InSISSemester from '@scraper/Types/InSISSemester.ts'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export interface SelectionState {
	faculty: Faculty | null
	year: number | null
	semester: InSISSemester | null
	studyPlan: StudyPlan | null
}

export const useSelectionStore = defineStore('selection', () => {
	// State
	const faculty = ref<ExtendedFaculty | null>(null)
	const year = ref<number | null>(null)
	const semester = ref<InSISSemester | null>(null)
	const studyPlan = ref<StudyPlanWithRelations | null>(null)

	// Available options
	const faculties = ref<ExtendedFaculty[]>(FACULTIES)
	const availableYears = ref<number[]>([2024, 2025, 2026])
	const availableSemesters = ref<InSISSemester[]>(['ZS', 'LS'])
	const studyPlans = ref<StudyPlanWithRelations[]>([])
	const studyPlansLoading = ref(false)

	// Computed
	const currentStep = computed(() => {
		if (!faculty.value) return 1
		if (!year.value || !semester.value) return 2
		if (!studyPlan.value) return 3
		return 4
	})

	const isComplete = computed(() => {
		return faculty.value && year.value && semester.value && studyPlan.value
	})

	const selectionSummary = computed(() => {
		if (!isComplete.value) return null
		return {
			faculty: faculty.value!,
			year: year.value!,
			semester: semester.value!,
			studyPlan: studyPlan.value!,
		}
	})

	// Actions
	function selectFaculty(f: ExtendedFaculty) {
		faculty.value = f
		// Reset dependent selections
		studyPlan.value = null
		studyPlans.value = []
	}

	function selectYear(y: number) {
		year.value = y
		// Reset dependent selections
		studyPlan.value = null
	}

	function selectSemester(s: InSISSemester) {
		semester.value = s
		// Reset dependent selections
		studyPlan.value = null
	}

	function selectStudyPlan(sp: StudyPlanWithRelations) {
		studyPlan.value = sp
	}

	function setStudyPlans(plans: StudyPlanWithRelations[]) {
		studyPlans.value = plans
	}

	function setStudyPlansLoading(loading: boolean) {
		studyPlansLoading.value = loading
	}

	function resetToStep(step: number) {
		if (step <= 1) {
			faculty.value = null
			year.value = null
			semester.value = null
			studyPlan.value = null
			studyPlans.value = []
		} else if (step <= 2) {
			year.value = null
			semester.value = null
			studyPlan.value = null
			studyPlans.value = []
		} else if (step <= 3) {
			studyPlan.value = null
		}
	}

	function reset() {
		faculty.value = null
		year.value = null
		semester.value = null
		studyPlan.value = null
		studyPlans.value = []
	}

	return {
		// State
		faculty,
		year,
		semester,
		studyPlan,
		faculties,
		availableYears,
		availableSemesters,
		studyPlans,
		studyPlansLoading,

		// Computed
		currentStep,
		isComplete,
		selectionSummary,

		// Actions
		selectFaculty,
		selectYear,
		selectSemester,
		selectStudyPlan,
		setStudyPlans,
		setStudyPlansLoading,
		resetToStep,
		reset,
	}
})
