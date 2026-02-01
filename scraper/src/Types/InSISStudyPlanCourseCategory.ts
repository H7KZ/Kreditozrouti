export const InSISStudyPlanCourseCategoryValues = [
    'compulsory',
    'elective',
    'language',
    'state_exam',
    'prohibited',
    'beyond_scope',
    'exchange_program',
    'physical_education'
] as const

/**
 * Represents the possible categories for courses within a study plan.
 */
type InSISStudyPlanCourseCategory = (typeof InSISStudyPlanCourseCategoryValues)[number]
export default InSISStudyPlanCourseCategory
