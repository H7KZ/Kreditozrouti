import { CoursesFilter } from '@api/Validations/CoursesFilterValidation.ts'
import InSISDay from '@scraper/Types/InSISDay.ts'
import InSISSemester from '@scraper/Types/InSISSemester.ts'
import InSISStudyPlanCourseGroup from '@scraper/Types/InSISStudyPlanCourseGroup.ts'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useCourseFilters = defineStore('courseFilters', () => {
	// ============================================
	// FILTER STATE
	// ============================================

	// Text search
	const searchQuery = ref('')

	// Facet selections (multi-select)
	const selectedFaculties = ref<string[]>([])
	const selectedDays = ref<InSISDay[]>([])
	const selectedGroups = ref<InSISStudyPlanCourseGroup[]>([])
	const selectedLecturers = ref<string[]>([])
	const selectedLanguages = ref<string[]>([])
	const selectedLevels = ref<string[]>([])

	// Single select
	const selectedSemester = ref<InSISSemester | null>(null)
	const selectedYear = ref<number | null>(null)

	// Range filters
	const creditsMin = ref<number | null>(null)
	const creditsMax = ref<number | null>(null)

	// Time filter (from calendar modal)
	const timeFrom = ref<number | null>(null) // Minutes from midnight
	const timeTo = ref<number | null>(null)
	const timeDay = ref<InSISDay | null>(null)

	// Study plan context (from wizard)
	const studyPlanId = ref<number | null>(null)

	// ============================================
	// COMPUTED
	// ============================================

	const hasActiveFilters = computed(() => {
		return !!(
			searchQuery.value ||
			selectedFaculties.value.length ||
			selectedDays.value.length ||
			selectedGroups.value.length ||
			selectedLecturers.value.length ||
			selectedLanguages.value.length ||
			selectedLevels.value.length ||
			selectedSemester.value ||
			creditsMin.value ||
			creditsMax.value ||
			timeFrom.value !== null ||
			timeTo.value !== null
		)
	})

	const activeFilterCount = computed(() => {
		let count = 0
		if (searchQuery.value) count++
		count += selectedFaculties.value.length
		count += selectedDays.value.length
		count += selectedGroups.value.length
		count += selectedLecturers.value.length
		count += selectedLanguages.value.length
		count += selectedLevels.value.length
		if (selectedSemester.value) count++
		if (creditsMin.value || creditsMax.value) count++
		if (timeFrom.value !== null || timeTo.value !== null) count++
		return count
	})

	// Build filter object for API
	const apiFilter = computed<CoursesFilter>(() => {
		const filter: CoursesFilter = {} as CoursesFilter

		if (searchQuery.value) filter.title = searchQuery.value
		if (selectedFaculties.value.length) filter.faculty_id = selectedFaculties.value
		if (selectedGroups.value.length) filter.group = selectedGroups.value
		if (selectedLecturers.value.length) filter.lecturer = selectedLecturers.value
		if (selectedLanguages.value.length) filter.language = selectedLanguages.value
		if (selectedLevels.value.length) filter.level = selectedLevels.value
		if (selectedSemester.value) filter.semester = selectedSemester.value
		if (selectedYear.value) filter.year = selectedYear.value
		if (creditsMin.value && creditsMax.value) {
			filter.ects = []
			for (let i = creditsMin.value; i <= creditsMax.value; i++) {
				if (filter.ects) filter.ects.push(i)
				else filter.ects = [i]
			}
		} else if (creditsMin.value) {
			filter.ects = creditsMin.value
		} else if (creditsMax.value) {
			filter.ects = creditsMax.value
		}

		if (selectedDays.value.length) {
			filter.include_times = []

			for (const day of selectedDays.value) {
				filter.include_times.push({
					day: day,
					time_from: timeFrom.value ?? 0,
					time_to: timeTo.value ?? 1440,
				})
			}
		}

		if (studyPlanId.value) filter.study_plan_id = studyPlanId.value

		return filter
	})

	// ============================================
	// ACTIONS
	// ============================================

	function setSearchQuery(query: string) {
		searchQuery.value = query
	}

	function toggleFaculty(facultyId: string) {
		const index = selectedFaculties.value.indexOf(facultyId)
		if (index === -1) {
			selectedFaculties.value.push(facultyId)
		} else {
			selectedFaculties.value.splice(index, 1)
		}
	}

	function toggleDay(day: InSISDay) {
		const index = selectedDays.value.indexOf(day)
		if (index === -1) {
			selectedDays.value.push(day)
		} else {
			selectedDays.value.splice(index, 1)
		}
	}

	function toggleGroup(group: InSISStudyPlanCourseGroup) {
		const index = selectedGroups.value.indexOf(group)
		if (index === -1) {
			selectedGroups.value.push(group)
		} else {
			selectedGroups.value.splice(index, 1)
		}
	}

	function toggleLecturer(lecturer: string) {
		const index = selectedLecturers.value.indexOf(lecturer)
		if (index === -1) {
			selectedLecturers.value.push(lecturer)
		} else {
			selectedLecturers.value.splice(index, 1)
		}
	}

	function setTimeFilter(from: number | null, to: number | null, day?: InSISDay | null) {
		timeFrom.value = from
		timeTo.value = to
		if (day !== undefined) timeDay.value = day
	}

	function clearTimeFilter() {
		timeFrom.value = null
		timeTo.value = null
		timeDay.value = null
	}

	function clearAllFilters() {
		searchQuery.value = ''
		selectedFaculties.value = []
		selectedDays.value = []
		selectedGroups.value = []
		selectedLecturers.value = []
		selectedLanguages.value = []
		selectedLevels.value = []
		selectedSemester.value = null
		creditsMin.value = null
		creditsMax.value = null
		timeFrom.value = null
		timeTo.value = null
		timeDay.value = null
		// Don't clear studyPlanId - that's context from wizard
	}

	function setFromStudentContext(context: { studyPlanId?: number; semester?: InSISSemester; year?: number }) {
		if (context.studyPlanId) studyPlanId.value = context.studyPlanId
		if (context.semester) selectedSemester.value = context.semester
		if (context.year) selectedYear.value = context.year
	}

	return {
		// State
		searchQuery,
		selectedFaculties,
		selectedDays,
		selectedGroups,
		selectedLecturers,
		selectedLanguages,
		selectedLevels,
		selectedSemester,
		selectedYear,
		creditsMin,
		creditsMax,
		timeFrom,
		timeTo,
		timeDay,
		studyPlanId,
		// Computed
		hasActiveFilters,
		activeFilterCount,
		apiFilter,
		// Actions
		setSearchQuery,
		toggleFaculty,
		toggleDay,
		toggleGroup,
		toggleLecturer,
		setTimeFilter,
		clearTimeFilter,
		clearAllFilters,
		setFromStudentContext,
	}
})
