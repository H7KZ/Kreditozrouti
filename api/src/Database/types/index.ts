import { CategoryTable, EventCategoryTable, EventTable } from './4fis_event.type'
import { CourseAssessmentMethodTable, CourseTable, CourseTimetableSlotTable, CourseTimetableUnitTable } from './insis_course.type'
import { UserTable } from './user.type'

export * from './user.type'
export * from './4fis_event.type'
export * from './insis_course.type'

type AllTableClasses =
    | typeof UserTable
    | typeof EventTable
    | typeof EventCategoryTable
    | typeof CategoryTable
    | typeof CourseTable
    | typeof CourseAssessmentMethodTable
    | typeof CourseTimetableUnitTable
    | typeof CourseTimetableSlotTable

export type Database = {
    [T in AllTableClasses as T['_table']]: InstanceType<T>
}
