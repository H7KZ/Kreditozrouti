import type { StudyPlanCoursesFilter, StudyPlanCoursesResponseDTO, StudyPlansFilter, StudyPlansResponseDTO } from '@kreditozrouti/types'
import api from '@client/api'

export async function fetchStudyPlans(filters: Partial<StudyPlansFilter>): Promise<StudyPlansResponseDTO> {
	const response = await api.post<StudyPlansResponseDTO>('/study_plans', filters)
	return response.data
}

export async function fetchStudyPlanCourses(filter: StudyPlanCoursesFilter): Promise<StudyPlanCoursesResponseDTO> {
	const response = await api.post<StudyPlanCoursesResponseDTO>('/study_plans/courses', filter)
	return response.data
}
