import api from '@client/api'
import type { StudyPlanCoursesFilter, StudyPlansFilter } from '@shared/http/study-plans'
import type { StudyPlanCoursesResponseDTO, StudyPlansResponseDTO } from '@shared/http/responses'

export async function fetchStudyPlans(filters: Partial<StudyPlansFilter>): Promise<StudyPlansResponseDTO> {
	const response = await api.post<StudyPlansResponseDTO>('/study_plans', filters)
	return response.data
}

export async function fetchStudyPlanCourses(filter: StudyPlanCoursesFilter): Promise<StudyPlanCoursesResponseDTO> {
	const response = await api.post<StudyPlanCoursesResponseDTO>('/study_plans/courses', filter)
	return response.data
}
