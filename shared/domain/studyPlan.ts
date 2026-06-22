import type { InSISStudyPlanCourseCategory, InSISStudyPlanCourseGroup } from './insis.js'

export const GROUP_RANK: Record<InSISStudyPlanCourseGroup, number> = {
	field_specific_bachelor: 0,
	field_specific_master: 1,
	faculty_specific: 2,
	minor_specialization: 3,
	university_wide: 4
}

export const CATEGORY_RANK: Record<InSISStudyPlanCourseCategory, number> = {
	state_exam: 0,
	compulsory: 1,
	elective: 2,
	language: 3,
	physical_education: 4,
	beyond_scope: 5,
	exchange_program: 6,
	prohibited: 7
}

/** Lower score = higher priority. Used to pick the canonical row when a course appears in multiple study plans. */
export function priorityOf(group: InSISStudyPlanCourseGroup, category: InSISStudyPlanCourseCategory): number {
	return GROUP_RANK[group] * 10 + CATEGORY_RANK[category]
}
