import type { Course, StudyPlanWithRelations } from '@api/Database/types'
import type FacetItem from '@api/Interfaces/FacetItem'
import { STORAGE_KEYS } from '@client/constants/storage.ts'
import { fetchStudyPlanCourses, fetchStudyPlans } from '@client/services/studyPlanService'
import type { PersistedWizardState, SelectedStudyPlan } from '@client/types'
import { loadFromStorage, removeFromStorage, saveToStorage } from '@client/utils/localstorage'
import type InSISSemester from '@scraper/Types/InSISSemester'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/**
 * Wizard Store
 *
 * Manages the study plan selection wizard.
 * Flow: Faculty → Year → Study Plans → Mark Completed Courses
 * Persists selection to localStorage.
 */
export const useWizardStore = defineStore('wizard', () => {
	// ── State ──────────────────────────────────────────────────────────

	const currentStep = ref(1)
	const facultyId = ref<string | null>(null)
	const year = ref<number | null>(null)
	const semester = ref<InSISSemester>('ZS')
	const selectedStudyPlans = ref<SelectedStudyPlan[]>([])
	const completedCourseIdents = ref<string[]>([])
	const completed = ref(false)

	const facultyFacets = ref<FacetItem[]>([])
	const yearFacets = ref<FacetItem[]>([])
	const levelFacets = ref<FacetItem[]>([])
	const studyPlans = ref<StudyPlanWithRelations[]>([])
	const studyPlanCourses = ref<Course[]>([])

	const levelFilter = ref<string[]>([])
	const titleSearch = ref('')
	const completedCoursesSearch = ref('')
	const completedCoursesCategoryFilter = ref<string[]>([])

	const loading = ref(false)
	const studyPlanCoursesLoading = ref(false)
	const error = ref<string | null>(null)

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

	// ── Filtered lists ─────────────────────────────────────────────────

	const filteredStudyPlans = computed(() => {
		let plans = studyPlans.value
		if (levelFilter.value.length > 0) {
			plans = plans.filter((p: StudyPlanWithRelations) => p.level && levelFilter.value.includes(p.level))
		}
		if (titleSearch.value.trim()) {
			const search = titleSearch.value.toLowerCase().trim()
			plans = plans.filter((p: StudyPlanWithRelations) => p.title?.toLowerCase().includes(search) || p.ident?.toLowerCase().includes(search))
		}
		return plans
	})

	const courseIdentToCategories = computed(() => {
		const map = new Map<string, Set<string>>()
		const selectedIds = new Set(studyPlanIds.value)

		for (const plan of studyPlans.value) {
			if (!selectedIds.has(plan.id)) continue
			for (const spc of plan.courses ?? []) {
				if (!map.has(spc.course_ident)) map.set(spc.course_ident, new Set())
				map.get(spc.course_ident)!.add(spc.category)
			}
		}

		return map
	})

	const filteredStudyPlanCourses = computed(() => {
		let courses = studyPlanCourses.value
		const identMap = courseIdentToCategories.value

		if (completedCoursesCategoryFilter.value.length > 0) {
			courses = courses.filter((c: Course) => {
				const cats = identMap.get(c.ident)
				return cats && completedCoursesCategoryFilter.value.some((cat) => cats.has(cat))
			})
		}

		if (completedCoursesSearch.value.trim()) {
			const search = completedCoursesSearch.value.toLowerCase().trim()
			courses = courses.filter(
				(c: Course) =>
					c.ident?.toLowerCase().includes(search) ||
					c.title?.toLowerCase().includes(search) ||
					c.title_cs?.toLowerCase().includes(search) ||
					c.title_en?.toLowerCase().includes(search),
			)
		}

		return courses
	})

	const studyPlanCoursesByCategory = computed(() => {
		const map = new Map<string, Course[]>()
		const identMap = courseIdentToCategories.value

		for (const course of filteredStudyPlanCourses.value) {
			const categories = identMap.get(course.ident)

			if (!categories || categories.size === 0) {
				if (!map.has('uncategorized')) map.set('uncategorized', [])
				map.get('uncategorized')!.push(course)
				continue
			}

			for (const category of categories) {
				if (!map.has(category)) map.set(category, [])
				map.get(category)!.push(course)
			}
		}

		return map
	})

	const availableCourseCategories = computed(() => {
		const categories = new Set<string>()
		for (const cats of courseIdentToCategories.value.values()) {
			for (const cat of cats) categories.add(cat)
		}
		const priority = ['compulsory', 'elective', 'language', 'state_exam', 'physical_education', 'beyond_scope']
		return [...categories].sort((a, b) => {
			const ai = priority.indexOf(a)
			const bi = priority.indexOf(b)
			return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
		})
	})

	const completedCourseCount = computed(() => completedCourseIdents.value.length)

	const isStudyPlanSelected = computed(() => (id: number) => selectedStudyPlans.value.some((p) => p.id === id))

	const isCourseCompleted = computed(() => (courseIdent: string) => completedCourseIdents.value.includes(courseIdent))

	const selectionSummary = computed(() => {
		const parts: string[] = []
		if (facultyId.value) {
			const faculty = facultyFacets.value.find((f) => f.value === facultyId.value)
			parts.push((faculty?.value || facultyId.value) as string)
		}
		if (year.value) parts.push(`${year.value}/${year.value + 1}`)
		if (selectedStudyPlans.value.length > 0) {
			parts.push(selectedStudyPlans.value.map((p) => p.title || p.ident || `ID: ${p.id}`).join(', '))
		}
		return parts.join(' → ')
	})

	// ── API calls ──────────────────────────────────────────────────────

	async function loadInitialFacets() {
		loading.value = true
		error.value = null
		try {
			const data = await fetchStudyPlans({ semesters: ['ZS'], limit: 0, offset: 0 })
			facultyFacets.value = data.facets.faculties
			yearFacets.value = data.facets.years
		} catch (e) {
			error.value = 'Failed to load faculties'
			console.error('Wizard: Failed to load initial facets', e)
		} finally {
			loading.value = false
		}
	}

	async function loadYearFacets() {
		if (!facultyId.value) return
		loading.value = true
		error.value = null
		try {
			const data = await fetchStudyPlans({ faculty_ids: [facultyId.value], semesters: ['ZS'], limit: 0, offset: 0 })
			yearFacets.value = data.facets.years
		} catch (e) {
			error.value = 'Failed to load years'
			console.error('Wizard: Failed to load year facets', e)
		} finally {
			loading.value = false
		}
	}

	async function loadStudyPlans() {
		if (!facultyId.value || !year.value) return
		loading.value = true
		error.value = null
		try {
			const data = await fetchStudyPlans({
				faculty_ids: [facultyId.value],
				years: [year.value],
				semesters: [semester.value],
				limit: 100,
				offset: 0,
			})
			studyPlans.value = data.data
			levelFacets.value = data.facets.levels
		} catch (e) {
			error.value = 'Failed to load study plans'
			console.error('Wizard: Failed to load study plans', e)
		} finally {
			loading.value = false
		}
	}

	async function loadStudyPlanCourses() {
		if (selectedStudyPlans.value.length === 0) return
		studyPlanCoursesLoading.value = true
		error.value = null
		try {
			const data = await fetchStudyPlanCourses({ study_plan_ids: studyPlanIds.value })
			studyPlanCourses.value = data.data
		} catch (e) {
			error.value = 'Failed to load courses for study plans'
			console.error('Wizard: Failed to load study plan courses', e)
		} finally {
			studyPlanCoursesLoading.value = false
		}
	}

	// ── Actions ────────────────────────────────────────────────────────

	function selectFaculty(id: string) {
		facultyId.value = id
		year.value = null
		selectedStudyPlans.value = []
		completedCourseIdents.value = []
		studyPlans.value = []
		studyPlanCourses.value = []
		loadYearFacets()
		currentStep.value = 2
		persist()
	}

	function selectYear(selectedYear: number) {
		year.value = selectedYear
		semester.value = 'ZS'
		selectedStudyPlans.value = []
		completedCourseIdents.value = []
		studyPlanCourses.value = []
		loadStudyPlans()
		currentStep.value = 3
		persist()
	}

	function toggleStudyPlan(id: number, ident: string | null, title: string | null) {
		const idx = selectedStudyPlans.value.findIndex((p) => p.id === id)
		if (idx !== -1) {
			selectedStudyPlans.value.splice(idx, 1)
		} else {
			selectedStudyPlans.value.push({ id, ident, title })
		}
		completedCourseIdents.value = []
		studyPlanCourses.value = []
		persist()
	}

	function selectStudyPlan(id: number, ident: string | null, title: string | null) {
		selectedStudyPlans.value = [{ id, ident, title }]
		completedCourseIdents.value = []
		studyPlanCourses.value = []
		persist()
	}

	function clearStudyPlanSelection() {
		selectedStudyPlans.value = []
		completedCourseIdents.value = []
		studyPlanCourses.value = []
		persist()
	}

	function proceedToCompletedCourses() {
		if (!canProceedToStep4.value) return
		currentStep.value = 4
		if (studyPlanCourses.value.length === 0) loadStudyPlanCourses()
		persist()
	}

	function toggleCompletedCourse(courseIdent: string) {
		const idx = completedCourseIdents.value.indexOf(courseIdent)
		if (idx !== -1) {
			completedCourseIdents.value.splice(idx, 1)
		} else {
			completedCourseIdents.value.push(courseIdent)
		}
		persist()
	}

	function markCourseCompleted(courseIdent: string) {
		if (!completedCourseIdents.value.includes(courseIdent)) {
			completedCourseIdents.value.push(courseIdent)
			persist()
		}
	}

	function unmarkCourseCompleted(courseIdent: string) {
		const idx = completedCourseIdents.value.indexOf(courseIdent)
		if (idx !== -1) {
			completedCourseIdents.value.splice(idx, 1)
			persist()
		}
	}

	function setCompletedCoursesCategoryFilter(categories: string[]) {
		completedCoursesCategoryFilter.value = categories
	}

	function setCompletedCoursesSearch(search: string) {
		completedCoursesSearch.value = search
	}

	function setLevelFilter(levels: string[]) {
		levelFilter.value = levels
	}

	function setTitleSearch(search: string) {
		titleSearch.value = search
	}

	function goToStep(step: number) {
		if (step < 1 || step > 4) return
		currentStep.value = step
		if (step < 2) {
			year.value = null
			selectedStudyPlans.value = []
			completedCourseIdents.value = []
			studyPlanCourses.value = []
		}
		if (step < 3) {
			selectedStudyPlans.value = []
			completedCourseIdents.value = []
			studyPlanCourses.value = []
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
		currentStep.value = 1
		facultyId.value = null
		year.value = null
		semester.value = 'ZS'
		selectedStudyPlans.value = []
		completedCourseIdents.value = []
		completed.value = false
		studyPlans.value = []
		studyPlanCourses.value = []
		levelFilter.value = []
		titleSearch.value = ''
		completedCoursesSearch.value = ''
		completedCoursesCategoryFilter.value = []
		removeFromStorage(STORAGE_KEYS.WIZARD)
	}

	function persist() {
		saveToStorage<PersistedWizardState>(STORAGE_KEYS.WIZARD, {
			facultyId: facultyId.value,
			year: year.value,
			semester: semester.value,
			studyPlanId: selectedStudyPlans.value[0]?.id ?? null,
			studyPlanIdent: selectedStudyPlans.value[0]?.ident ?? null,
			studyPlanTitle: selectedStudyPlans.value[0]?.title ?? null,
			selectedStudyPlans: selectedStudyPlans.value,
			completedCourseIdents: completedCourseIdents.value,
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

		completedCourseIdents.value = state.completedCourseIdents || []
		completed.value = state.completed

		if (state.completed) {
			currentStep.value = 4
		} else if (selectedStudyPlans.value.length > 0) {
			currentStep.value = 3
		} else if (state.year) {
			currentStep.value = 3
			loadStudyPlans()
		} else if (state.facultyId) {
			currentStep.value = 2
			loadYearFacets()
		}
	}

	return {
		// State
		currentStep,
		facultyId,
		year,
		semester,
		selectedStudyPlans,
		completedCourseIdents,
		completed,
		facultyFacets,
		yearFacets,
		levelFacets,
		studyPlans,
		studyPlanCourses,
		levelFilter,
		titleSearch,
		completedCoursesSearch,
		completedCoursesCategoryFilter,
		loading,
		studyPlanCoursesLoading,
		error,
		// Computed
		studyPlanIds,
		studyPlanId,
		studyPlanIdents,
		studyPlanTitles,
		step1Complete,
		step2Complete,
		step3Complete,
		step4Complete,
		canProceedToStep2,
		canProceedToStep3,
		canProceedToStep4,
		canComplete,
		filteredStudyPlans,
		courseIdentToCategories,
		filteredStudyPlanCourses,
		studyPlanCoursesByCategory,
		availableCourseCategories,
		completedCourseCount,
		isStudyPlanSelected,
		isCourseCompleted,
		selectionSummary,
		// Actions
		loadInitialFacets,
		loadYearFacets,
		loadStudyPlans,
		loadStudyPlanCourses,
		selectFaculty,
		selectYear,
		toggleStudyPlan,
		selectStudyPlan,
		clearStudyPlanSelection,
		proceedToCompletedCourses,
		toggleCompletedCourse,
		markCourseCompleted,
		unmarkCourseCompleted,
		setCompletedCoursesCategoryFilter,
		setCompletedCoursesSearch,
		setLevelFilter,
		setTitleSearch,
		goToStep,
		completeWizard,
		reset,
		persist,
		hydrate,
	}
})
