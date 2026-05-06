import type StudyPlanCoursesResponse from '@api/Controllers/Kreditozrouti/types/StudyPlanCoursesResponse'
import type StudyPlansResponse from '@api/Controllers/Kreditozrouti/types/StudyPlansResponse'
import type { StudyPlanCoursesFilter } from '@api/Validations/StudyPlanCoursesFilterValidation'
import type { StudyPlansFilter } from '@api/Validations/StudyPlansFilterValidation'
import api from '@client/api'

export async function fetchStudyPlans(filters: Partial<StudyPlansFilter>): Promise<StudyPlansResponse> {
	const response = await api.post<StudyPlansResponse>('/study_plans', filters)
	return response.data
}

export async function fetchStudyPlanCourses(filter: StudyPlanCoursesFilter): Promise<StudyPlanCoursesResponse> {
	const response = await api.post<StudyPlanCoursesResponse>('/study_plans/courses', filter)
	return response.data
}
