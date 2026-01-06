import { StudyPlanCourseTable, StudyPlanTable } from '@api/Database/types/insis_study_plans.type'
import { CategoryTable, EventCategoryTable, EventTable, UsersEvents } from './4fis_event.type'
import { CourseAssessmentMethodTable, CourseIdRedirectTable, CourseTable, CourseTimetableSlotTable, CourseTimetableUnitTable } from './insis_course.type'
import { UserTable } from './user.type'

export * from './user.type'
export * from './4fis_event.type'
export * from './insis_course.type'
export * from './insis_study_plans.type'

type AllTableClasses =
    | typeof UserTable
    | typeof EventTable
    | typeof EventCategoryTable
    | typeof CategoryTable
    | typeof CourseTable
    | typeof CourseIdRedirectTable
    | typeof CourseAssessmentMethodTable
    | typeof CourseTimetableUnitTable
    | typeof CourseTimetableSlotTable
    | typeof StudyPlanTable
    | typeof StudyPlanCourseTable
    | typeof UsersEvents

/**
 * Master mapping of table names to Kysely table interfaces.
 */
export type Database = {
    [T in AllTableClasses as T['_table']]: InstanceType<T>
}
