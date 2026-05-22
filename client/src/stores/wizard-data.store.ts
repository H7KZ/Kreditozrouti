import type { FacetItem } from '@shared/http/facets'
import type { CourseDTO, StudyPlanWithRelationsDTO } from '@shared/http/responses'
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { i18n } from '@client/i18n'
import { fetchStudyPlanCourses, fetchStudyPlans } from '@client/services/studyPlanService'
import { useWizardStore } from '@client/stores/wizard.store'

/**
 * Wizard Data Store
 *
 * Manages remote data fetched for the wizard: faculty facets, year facets,
 * level facets, study plan list, and study plan courses.
 *
 * This store is stateless with respect to user selections — it only holds
 * API responses. User selections live in wizard.store.ts.
 */
export const useWizardDataStore = defineStore('wizardData', () => {
	const facultyFacets = ref<FacetItem[]>([])
	const yearFacets = ref<FacetItem[]>([])
	const levelFacets = ref<FacetItem[]>([])
	const studyPlans = ref<StudyPlanWithRelationsDTO[]>([])
	const studyPlanCourses = ref<CourseDTO[]>([])

	const loading = ref(false)
	const studyPlanCoursesLoading = ref(false)
	const error = ref<string | null>(null)
	const { t } = i18n.global

	// API calls

	async function loadInitialFacets() {
		loading.value = true
		error.value = null
		try {
			const data = await fetchStudyPlans({ semesters: ['ZS'], limit: 0, offset: 0 })
			facultyFacets.value = data.facets.faculties
			yearFacets.value = data.facets.years
		} catch (e) {
			error.value = t('stores.wizardData.errors.loadFaculties')
			console.error('Wizard: Failed to load initial facets', e)
		} finally {
			loading.value = false
		}
	}

	async function loadYearFacets() {
		const wizardStore = useWizardStore()
		if (!wizardStore.facultyId) return
		loading.value = true
		error.value = null
		try {
			const data = await fetchStudyPlans({ faculty_ids: [wizardStore.facultyId], semesters: ['ZS'], limit: 0, offset: 0 })
			yearFacets.value = data.facets.years
		} catch (e) {
			error.value = t('stores.wizardData.errors.loadYears')
			console.error('Wizard: Failed to load year facets', e)
		} finally {
			loading.value = false
		}
	}

	async function loadStudyPlans() {
		const wizardStore = useWizardStore()
		if (!wizardStore.facultyId || !wizardStore.year) return
		loading.value = true
		error.value = null
		try {
			const data = await fetchStudyPlans({
				faculty_ids: [wizardStore.facultyId],
				years: [wizardStore.year],
				semesters: [wizardStore.semester],
				limit: 100,
				offset: 0,
			})
			studyPlans.value = data.data
			levelFacets.value = data.facets.levels
		} catch (e) {
			error.value = t('stores.wizardData.errors.loadStudyPlans')
			console.error('Wizard: Failed to load study plans', e)
		} finally {
			loading.value = false
		}
	}

	async function loadStudyPlanCourses() {
		const wizardStore = useWizardStore()
		if (wizardStore.studyPlanIds.length === 0) return
		studyPlanCoursesLoading.value = true
		error.value = null
		try {
			const data = await fetchStudyPlanCourses({ study_plan_ids: wizardStore.studyPlanIds })
			studyPlanCourses.value = data.data
		} catch (e) {
			error.value = t('stores.wizardData.errors.loadStudyPlanCourses')
			console.error('Wizard: Failed to load study plan courses', e)
		} finally {
			studyPlanCoursesLoading.value = false
		}
	}

	function resetData() {
		studyPlans.value = []
		studyPlanCourses.value = []
	}

	return {
		facultyFacets,
		yearFacets,
		levelFacets,
		studyPlans,
		studyPlanCourses,
		loading,
		studyPlanCoursesLoading,
		error,
		loadInitialFacets,
		loadYearFacets,
		loadStudyPlans,
		loadStudyPlanCourses,
		resetData,
	}
})
