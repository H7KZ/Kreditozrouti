import { FacultyTable } from '@api/Database/types/insis_faculty.type'
import { StudyPlanCourseTable, StudyPlanTable } from '@api/Database/types/insis_study_plan.type'
import { CourseAssessmentMethodTable, CourseTable, CourseTimetableSlotTable, CourseTimetableUnitTable } from './insis_course.type'

export * from './insis_course.type'
export * from './insis_study_plan.type'
export * from './insis_faculty.type'

type AllTableClasses =
	| typeof CourseTable
	| typeof CourseAssessmentMethodTable
	| typeof CourseTimetableUnitTable
	| typeof CourseTimetableSlotTable
	| typeof StudyPlanTable
	| typeof StudyPlanCourseTable
	| typeof FacultyTable

/**
 * Master mapping of table names to Kysely table interfaces.
 */
export type Database = {
	[T in AllTableClasses as T['_table']]: InstanceType<T>
}
