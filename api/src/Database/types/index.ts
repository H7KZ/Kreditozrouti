import { CourseAssessmentMethodTable, CourseTable, CourseTimetableSlotTable, CourseTimetableUnitTable } from './course.type'
import { CategoryTable, EventCategoryTable, EventTable } from './event.type'
import { UserTable } from './user.type'

export * from './user.type'
export * from './event.type'
export * from './course.type'

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
