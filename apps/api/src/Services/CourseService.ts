import { CoursesFilter } from '@api/Controllers/Courses/CoursesController'
import { Course } from '@api/Database/types'
import { CourseFacetService } from './Course/CourseFacetService'
import { CourseQueryService } from './Course/CourseQueryService'

export default class CourseService {
	static getCoursesWithRelations(filters: Partial<CoursesFilter>, limit = 20, offset = 0) {
		return CourseQueryService.getCoursesWithRelations(filters, limit, offset)
	}

	static getCoursesByStudyPlan(studyPlanIds: number[]): Promise<Course[]> {
		return CourseQueryService.getCoursesByStudyPlan(studyPlanIds)
	}

	static getCourseFacets(filters: CoursesFilter) {
		return CourseFacetService.getCourseFacets(filters)
	}
}
