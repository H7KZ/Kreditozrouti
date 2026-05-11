import api from '@client/api'
import type { StudyPlanCoursesFilter, StudyPlansFilter } from '@shared/http/study-plans'
import type { StudyPlanCoursesResponse, StudyPlansResponse } from '../../../api/src/Contracts'

export async function fetchStudyPlans(filters: Partial<StudyPlansFilter>): Promise<StudyPlansResponse> {
	const response = await api.post<StudyPlansResponse>('/study_plans', filters)
	return response.data
}

export async function fetchStudyPlanCourses(filter: StudyPlanCoursesFilter): Promise<StudyPlanCoursesResponse> {
	const response = await api.post<StudyPlanCoursesResponse>('/study_plans/courses', filter)
	return response.data
}
