import { FacultyTable } from '@api/Database/types/insis_faculty.type'
import { StudyPlanCourseTable, StudyPlanTable } from '@api/Database/types/insis_study_plan.type'
import { CourseAssessmentTable, CourseTable, CourseUnitSlotTable, CourseUnitTable } from './insis_course.type'

export * from './insis_course.type'
export * from './insis_study_plan.type'
export * from './insis_faculty.type'

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type ExcludeMethods<T> = { [K in keyof T as T[K] extends Function ? never : K]: T[K] }

type AllTableClasses =
	| typeof CourseTable
	| typeof CourseAssessmentTable
	| typeof CourseUnitTable
	| typeof CourseUnitSlotTable
	| typeof StudyPlanTable
	| typeof StudyPlanCourseTable
	| typeof FacultyTable

/**
 * Master mapping of table names to Kysely table interfaces.
 */
export type Database = {
	[T in AllTableClasses as T['_table']]: InstanceType<T>
}
