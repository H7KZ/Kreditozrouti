import type { StudyPlanCoursesResponse, StudyPlansResponse } from '@api/contracts'
import type { StudyPlanCoursesFilter, StudyPlansFilter } from '@shared/http/study-plans'
import api from '@client/api'

export async function fetchStudyPlans(filters: Partial<StudyPlansFilter>): Promise<StudyPlansResponse> {
	const response = await api.post<StudyPlansResponse>('/study_plans', filters)
	return response.data
}

export async function fetchStudyPlanCourses(filter: StudyPlanCoursesFilter): Promise<StudyPlanCoursesResponse> {
	const response = await api.post<StudyPlanCoursesResponse>('/study_plans/courses', filter)
	return response.data
}
