import { CourseAssessmentMethodTable, CourseTable, CourseTimetableSlotTable, CourseTimetableUnitTable } from './course.type'
import { CategoryTable, EventCategoryTable, EventTable } from './event.type'
import { UserTable } from './user.type'

export * from './user.type'
export * from './event.type'
export * from './course.type'

export interface Database {
    users: UserTable
    fis_events: EventTable
    fis_events_categories: EventCategoryTable
    fis_categories: CategoryTable
    insis_courses: CourseTable
    insis_courses_assessment_methods: CourseAssessmentMethodTable
    insis_courses_timetable_units: CourseTimetableUnitTable
    insis_courses_timetable_slots: CourseTimetableSlotTable
}
