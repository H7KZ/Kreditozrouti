import type { Course, StudyPlanWithRelations } from '@api/contracts'
import { STORAGE_KEYS } from '@client/constants/storage.ts'
import { useWizardDataStore } from '@client/stores/wizard-data.store'
import { useWizardStore } from '@client/stores/wizard.store'
import { saveToStorage } from '@client/utils/localstorage'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

interface PersistedCompletedCoursesState {
	completedCourseIdents: string[]
}

/**
 * Completed Courses Store
 *
 * Manages which courses the student has already completed, plus the UI
 * filter state for the completed-courses step of the wizard
 * (search, category filter, level filter, title search).
 *
 * completedCourseIdents is persisted to localStorage alongside the wizard state.
 */
export const useCompletedCoursesStore = defineStore('completedCourses', () => {
	// ── State ──────────────────────────────────────────────────────────

	const completedCourseIdents = ref<string[]>([])
	const completedCoursesSearch = ref('')
	const completedCoursesCategoryFilter = ref<string[]>([])
	const levelFilter = ref<string[]>([])
	const titleSearch = ref('')

	// ── Derived from data stores ───────────────────────────────────────

	/**
	 * Filtered study plans list (study plan picker UI, step 3).
	 * Depends on wizard-data store for the full plan list.
	 */
	const filteredStudyPlans = computed(() => {
		const wizardDataStore = useWizardDataStore()
		let plans = wizardDataStore.studyPlans
		if (levelFilter.value.length > 0) {
			plans = plans.filter((p: StudyPlanWithRelations) => p.level && levelFilter.value.includes(p.level))
		}
		if (titleSearch.value.trim()) {
			const search = titleSearch.value.toLowerCase().trim()
			plans = plans.filter((p: StudyPlanWithRelations) => p.title?.toLowerCase().includes(search) || p.ident?.toLowerCase().includes(search))
		}
		return plans
	})

	/**
	 * Map from course ident to all categories it belongs to,
	 * across the currently selected study plans.
	 */
	const courseIdentToCategories = computed(() => {
		const wizardStore = useWizardStore()
		const wizardDataStore = useWizardDataStore()
		const map = new Map<string, Set<string>>()
		const selectedIds = new Set(wizardStore.studyPlanIds)

		for (const plan of wizardDataStore.studyPlans) {
			if (!selectedIds.has(plan.id)) continue
			for (const spc of plan.courses ?? []) {
				if (!map.has(spc.course_ident)) map.set(spc.course_ident, new Set())
				map.get(spc.course_ident)!.add(spc.category)
			}
		}

		return map
	})

	/**
	 * Study plan courses filtered by search and category.
	 */
	const filteredStudyPlanCourses = computed(() => {
		const wizardDataStore = useWizardDataStore()
		let courses = wizardDataStore.studyPlanCourses
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

	const isStudyPlanSelected = computed(() => (id: number) => {
		const wizardStore = useWizardStore()
		return wizardStore.selectedStudyPlans.some((p) => p.id === id)
	})

	const isCourseCompleted = computed(() => (courseIdent: string) => completedCourseIdents.value.includes(courseIdent))

	// ── Actions ────────────────────────────────────────────────────────

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

	function clearCompletedCourses() {
		completedCourseIdents.value = []
	}

	function resetUIFilters() {
		levelFilter.value = []
		titleSearch.value = ''
		completedCoursesSearch.value = ''
		completedCoursesCategoryFilter.value = []
	}

	function persist() {
		saveToStorage<PersistedCompletedCoursesState>(STORAGE_KEYS.WIZARD, {
			completedCourseIdents: completedCourseIdents.value,
		})
	}

	function hydrate(completedIdents: string[]) {
		completedCourseIdents.value = completedIdents
	}

	return {
		// State
		completedCourseIdents,
		completedCoursesSearch,
		completedCoursesCategoryFilter,
		levelFilter,
		titleSearch,
		// Computed
		filteredStudyPlans,
		courseIdentToCategories,
		filteredStudyPlanCourses,
		studyPlanCoursesByCategory,
		availableCourseCategories,
		completedCourseCount,
		isStudyPlanSelected,
		isCourseCompleted,
		// Actions
		toggleCompletedCourse,
		markCourseCompleted,
		unmarkCourseCompleted,
		setCompletedCoursesCategoryFilter,
		setCompletedCoursesSearch,
		setLevelFilter,
		setTitleSearch,
		clearCompletedCourses,
		resetUIFilters,
		persist,
		hydrate,
	}
})
