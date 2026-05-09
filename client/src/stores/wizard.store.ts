import { STORAGE_KEYS } from '@client/constants/storage.ts'
import { useCompletedCoursesStore } from '@client/stores/completed-courses.store'
import { useWizardDataStore } from '@client/stores/wizard-data.store'
import type { PersistedWizardState, SelectedStudyPlan } from '@client/types'
import { loadFromStorage, removeFromStorage, saveToStorage } from '@client/utils/localstorage'
import type { InSISSemester } from '@scraper/types/insis'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/**
 * Wizard Store
 *
 * Manages wizard navigation and user study-plan selections.
 * Responsibilities: currentStep, facultyId, year, semester, selectedStudyPlans,
 * completed, step completion computeds, navigation actions, persist/hydrate.
 *
 * Remote data → useWizardDataStore
 * Completed courses → useCompletedCoursesStore
 */
export const useWizardStore = defineStore('wizard', () => {
	// ── State ──────────────────────────────────────────────────────────

	const currentStep = ref(1)
	const facultyId = ref<string | null>(null)
	const year = ref<number | null>(null)
	const semester = ref<InSISSemester>('ZS')
	const selectedStudyPlans = ref<SelectedStudyPlan[]>([])
	const completed = ref(false)

	// ── Derived IDs ────────────────────────────────────────────────────

	const studyPlanIds = computed(() => selectedStudyPlans.value.map((p) => p.id))
	const studyPlanId = computed(() => selectedStudyPlans.value[0]?.id ?? null)
	const studyPlanIdents = computed(() => (selectedStudyPlans.value.length === 0 ? null : selectedStudyPlans.value.map((p) => p.ident || String(p.id))))
	const studyPlanTitles = computed(() =>
		selectedStudyPlans.value.length === 0 ? null : selectedStudyPlans.value.map((p) => p.title || p.ident || String(p.id)),
	)

	// ── Step completion ────────────────────────────────────────────────

	const step1Complete = computed(() => facultyId.value !== null)
	const step2Complete = computed(() => year.value !== null)
	const step3Complete = computed(() => selectedStudyPlans.value.length > 0)
	const step4Complete = computed(() => step3Complete.value)
	const canProceedToStep2 = computed(() => step1Complete.value)
	const canProceedToStep3 = computed(() => step1Complete.value && step2Complete.value)
	const canProceedToStep4 = computed(() => step1Complete.value && step2Complete.value && step3Complete.value)
	const canComplete = computed(() => step1Complete.value && step2Complete.value && step3Complete.value)

	// ── Forwarded completedCourseIdents (for backward compat) ─────────

	/**
	 * @deprecated Prefer useCompletedCoursesStore().completedCourseIdents directly.
	 * Kept for callers (courses.store.ts) that read this during initializeFromWizard.
	 */
	const completedCourseIdents = computed(() => useCompletedCoursesStore().completedCourseIdents)

	// ── selectionSummary ───────────────────────────────────────────────

	const selectionSummary = computed(() => {
		const wizardDataStore = useWizardDataStore()
		const parts: string[] = []
		if (facultyId.value) {
			const faculty = wizardDataStore.facultyFacets.find((f) => f.value === facultyId.value)
			parts.push((faculty?.value || facultyId.value) as string)
		}
		if (year.value) parts.push(`${year.value}/${year.value + 1}`)
		if (selectedStudyPlans.value.length > 0) {
			parts.push(selectedStudyPlans.value.map((p) => p.title || p.ident || `ID: ${p.id}`).join(', '))
		}
		return parts.join(' → ')
	})

	// ── Actions ────────────────────────────────────────────────────────

	function selectFaculty(id: string) {
		const completedCoursesStore = useCompletedCoursesStore()
		const wizardDataStore = useWizardDataStore()
		facultyId.value = id
		year.value = null
		selectedStudyPlans.value = []
		completedCoursesStore.clearCompletedCourses()
		wizardDataStore.resetData()
		wizardDataStore.loadYearFacets()
		currentStep.value = 2
		persist()
	}

	function selectYear(selectedYear: number) {
		const completedCoursesStore = useCompletedCoursesStore()
		const wizardDataStore = useWizardDataStore()
		year.value = selectedYear
		semester.value = 'ZS'
		selectedStudyPlans.value = []
		completedCoursesStore.clearCompletedCourses()
		wizardDataStore.studyPlanCourses.splice(0)
		wizardDataStore.loadStudyPlans()
		currentStep.value = 3
		persist()
	}

	function toggleStudyPlan(id: number, ident: string | null, title: string | null) {
		const completedCoursesStore = useCompletedCoursesStore()
		const wizardDataStore = useWizardDataStore()
		const idx = selectedStudyPlans.value.findIndex((p) => p.id === id)
		if (idx !== -1) {
			selectedStudyPlans.value.splice(idx, 1)
		} else {
			selectedStudyPlans.value.push({ id, ident, title })
		}
		completedCoursesStore.clearCompletedCourses()
		wizardDataStore.studyPlanCourses.splice(0)
		persist()
	}

	function selectStudyPlan(id: number, ident: string | null, title: string | null) {
		const completedCoursesStore = useCompletedCoursesStore()
		const wizardDataStore = useWizardDataStore()
		selectedStudyPlans.value = [{ id, ident, title }]
		completedCoursesStore.clearCompletedCourses()
		wizardDataStore.studyPlanCourses.splice(0)
		persist()
	}

	function clearStudyPlanSelection() {
		const completedCoursesStore = useCompletedCoursesStore()
		const wizardDataStore = useWizardDataStore()
		selectedStudyPlans.value = []
		completedCoursesStore.clearCompletedCourses()
		wizardDataStore.studyPlanCourses.splice(0)
		persist()
	}

	function proceedToCompletedCourses() {
		if (!canProceedToStep4.value) return
		currentStep.value = 4
		const wizardDataStore = useWizardDataStore()
		if (wizardDataStore.studyPlanCourses.length === 0) wizardDataStore.loadStudyPlanCourses()
		persist()
	}

	/**
	 * @deprecated Prefer useCompletedCoursesStore().toggleCompletedCourse directly.
	 * Kept for backward compat with courses.store.ts toggleCompletedCourse.
	 */
	function toggleCompletedCourse(courseIdent: string) {
		useCompletedCoursesStore().toggleCompletedCourse(courseIdent)
	}

	function goToStep(step: number) {
		const completedCoursesStore = useCompletedCoursesStore()
		const wizardDataStore = useWizardDataStore()
		if (step < 1 || step > 4) return
		currentStep.value = step
		if (step < 2) {
			year.value = null
			selectedStudyPlans.value = []
			completedCoursesStore.clearCompletedCourses()
			wizardDataStore.resetData()
		}
		if (step < 3) {
			selectedStudyPlans.value = []
			completedCoursesStore.clearCompletedCourses()
			wizardDataStore.studyPlanCourses.splice(0)
		}
		persist()
	}

	function completeWizard(): boolean {
		if (!canComplete.value) return false
		completed.value = true
		persist()
		return true
	}

	function reset() {
		const completedCoursesStore = useCompletedCoursesStore()
		const wizardDataStore = useWizardDataStore()
		currentStep.value = 1
		facultyId.value = null
		year.value = null
		semester.value = 'ZS'
		selectedStudyPlans.value = []
		completed.value = false
		completedCoursesStore.clearCompletedCourses()
		completedCoursesStore.resetUIFilters()
		wizardDataStore.resetData()
		removeFromStorage(STORAGE_KEYS.WIZARD)
	}

	function persist() {
		const completedCoursesStore = useCompletedCoursesStore()
		saveToStorage<PersistedWizardState>(STORAGE_KEYS.WIZARD, {
			facultyId: facultyId.value,
			year: year.value,
			semester: semester.value,
			studyPlanId: selectedStudyPlans.value[0]?.id ?? null,
			studyPlanIdent: selectedStudyPlans.value[0]?.ident ?? null,
			studyPlanTitle: selectedStudyPlans.value[0]?.title ?? null,
			selectedStudyPlans: selectedStudyPlans.value,
			completedCourseIdents: completedCoursesStore.completedCourseIdents,
			completed: completed.value,
		})
	}

	function hydrate() {
		const state = loadFromStorage<PersistedWizardState>(STORAGE_KEYS.WIZARD)
		if (!state) return

		facultyId.value = state.facultyId
		year.value = state.year
		semester.value = state.semester || 'ZS'

		if (state.selectedStudyPlans?.length > 0) {
			selectedStudyPlans.value = state.selectedStudyPlans
		} else if (state.studyPlanId) {
			selectedStudyPlans.value = [{ id: state.studyPlanId, ident: state.studyPlanIdent, title: state.studyPlanTitle }]
		} else {
			selectedStudyPlans.value = []
		}

		// Hydrate completed courses into their dedicated store
		useCompletedCoursesStore().hydrate(state.completedCourseIdents || [])
		completed.value = state.completed

		const wizardDataStore = useWizardDataStore()
		if (state.completed) {
			currentStep.value = 4
		} else if (selectedStudyPlans.value.length > 0) {
			currentStep.value = 3
		} else if (state.year) {
			currentStep.value = 3
			wizardDataStore.loadStudyPlans()
		} else if (state.facultyId) {
			currentStep.value = 2
			wizardDataStore.loadYearFacets()
		}
	}

	return {
		// State
		currentStep,
		facultyId,
		year,
		semester,
		selectedStudyPlans,
		completed,
		// Computed
		studyPlanIds,
		studyPlanId,
		studyPlanIdents,
		studyPlanTitles,
		/** @deprecated Use useCompletedCoursesStore().completedCourseIdents */
		completedCourseIdents,
		step1Complete,
		step2Complete,
		step3Complete,
		step4Complete,
		canProceedToStep2,
		canProceedToStep3,
		canProceedToStep4,
		canComplete,
		selectionSummary,
		// Actions
		selectFaculty,
		selectYear,
		toggleStudyPlan,
		selectStudyPlan,
		clearStudyPlanSelection,
		proceedToCompletedCourses,
		/** @deprecated Use useCompletedCoursesStore().toggleCompletedCourse */
		toggleCompletedCourse,
		goToStep,
		completeWizard,
		reset,
		persist,
		hydrate,
	}
})
