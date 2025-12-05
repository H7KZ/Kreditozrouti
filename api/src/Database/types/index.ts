import { CourseAssessmentMethodTable, CourseTable, CourseTimetableUnitTable } from './course.type'
import { CategoryTable, EventCategoryTable, EventTable } from './event.type'
import { UserTable } from './user.type'

export * from './user.type'
export * from './event.type'
export * from './course.type'

export interface Database {
    users: UserTable
    events: EventTable
    events_categories: EventCategoryTable
    categories: CategoryTable
    courses: CourseTable
    courses_assessment_methods: CourseAssessmentMethodTable
    courses_timetable_units: CourseTimetableUnitTable
    courses_timetable_slots: CourseTimetableUnitTable
}
