import {
	CourseAssessmentTable,
	CourseTable,
	CourseUnitSlotTable,
	CourseUnitTable,
	FacultyTable,
	StudyPlanCourseTable,
	StudyPlanTable
} from '@api/Database/types'
import { Kysely, sql } from 'kysely'
import { createIndexSafe, dropIndexSafe as dropIndex } from './utils'

export async function up(db: Kysely<any>): Promise<void> {
	// Courses
	await createIndexSafe(db, 'idx_courses_ident', CourseTable._table, ['ident'])
	await createIndexSafe(db, 'idx_courses_faculty_semester_year', CourseTable._table, ['faculty_id', 'semester', 'year'])
	await createIndexSafe(db, 'idx_courses_faculty', CourseTable._table, ['faculty_id'])
	await createIndexSafe(db, 'idx_courses_semester_year', CourseTable._table, ['semester', 'year'])
	await createIndexSafe(db, 'idx_courses_semester', CourseTable._table, ['semester'])
	await createIndexSafe(db, 'idx_courses_year', CourseTable._table, ['year'])
	await createIndexSafe(db, 'idx_courses_level', CourseTable._table, ['level'])
	await createIndexSafe(db, 'idx_courses_ects', CourseTable._table, ['ects'])
	await createIndexSafe(db, 'idx_courses_mode_completion', CourseTable._table, sql`mode_of_completion(50)`)
	await createIndexSafe(db, 'idx_courses_title_cs', CourseTable._table, sql`title_cs(100)`)
	await createIndexSafe(db, 'idx_courses_title_en', CourseTable._table, sql`title_en(100)`)

	// Course Units
	await createIndexSafe(db, 'idx_units_course_lecturer', CourseUnitTable._table, sql`course_id, lecturer(100)`)

	// Course Unit Slots
	await createIndexSafe(db, 'idx_slots_unit', CourseUnitSlotTable._table, ['unit_id'])
	await createIndexSafe(db, 'idx_slots_unit_day_times', CourseUnitSlotTable._table, ['unit_id', 'day', 'time_from', 'time_to'])
	await createIndexSafe(db, 'idx_slots_day', CourseUnitSlotTable._table, ['day'])
	await createIndexSafe(db, 'idx_slots_time_from', CourseUnitSlotTable._table, ['time_from'])
	await createIndexSafe(db, 'idx_slots_time_to', CourseUnitSlotTable._table, ['time_to'])

	// Course Assessments
	await createIndexSafe(db, 'idx_assessments_course', CourseAssessmentTable._table, ['course_id'])

	// Study Plans
	await createIndexSafe(db, 'idx_plans_faculty_semester_year', StudyPlanTable._table, ['faculty_id', 'semester', 'year'])
	await createIndexSafe(db, 'idx_plans_faculty', StudyPlanTable._table, ['faculty_id'])
	await createIndexSafe(db, 'idx_plans_semester_year', StudyPlanTable._table, ['semester', 'year'])
	await createIndexSafe(db, 'idx_plans_semester', StudyPlanTable._table, ['semester'])
	await createIndexSafe(db, 'idx_plans_year', StudyPlanTable._table, ['year'])
	await createIndexSafe(db, 'idx_plans_level', StudyPlanTable._table, ['level'])
	await createIndexSafe(db, 'idx_plans_mode_study', StudyPlanTable._table, ['mode_of_study'])
	await createIndexSafe(db, 'idx_plans_ident', StudyPlanTable._table, ['ident'])

	// Study Plan Courses
	await createIndexSafe(db, 'idx_plan_courses_plan_course', StudyPlanCourseTable._table, ['study_plan_id', 'course_id'])
	await createIndexSafe(db, 'idx_plan_courses_course_plan', StudyPlanCourseTable._table, ['course_id', 'study_plan_id'])
	await createIndexSafe(db, 'idx_plan_courses_ident', StudyPlanCourseTable._table, ['course_ident'])
	await createIndexSafe(db, 'idx_plan_courses_group_category', StudyPlanCourseTable._table, ['study_plan_id', 'group', 'category'])

	// Faculties
	await createIndexSafe(db, 'idx_faculties_title', FacultyTable._table, sql`title(100)`)
}

export async function down(db: Kysely<any>): Promise<void> {
	// Courses
	await dropIndex(db, 'idx_courses_ident', CourseTable._table)
	await dropIndex(db, 'idx_courses_faculty_semester_year', CourseTable._table)
	await dropIndex(db, 'idx_courses_faculty', CourseTable._table)
	await dropIndex(db, 'idx_courses_semester_year', CourseTable._table)
	await dropIndex(db, 'idx_courses_semester', CourseTable._table)
	await dropIndex(db, 'idx_courses_year', CourseTable._table)
	await dropIndex(db, 'idx_courses_level', CourseTable._table)
	await dropIndex(db, 'idx_courses_ects', CourseTable._table)
	await dropIndex(db, 'idx_courses_mode_completion', CourseTable._table)
	await dropIndex(db, 'idx_courses_title_cs', CourseTable._table)
	await dropIndex(db, 'idx_courses_title_en', CourseTable._table)

	// Units
	await dropIndex(db, 'idx_units_course_lecturer', CourseUnitTable._table)

	// Slots
	await dropIndex(db, 'idx_slots_unit', CourseUnitSlotTable._table)
	await dropIndex(db, 'idx_slots_unit_day_times', CourseUnitSlotTable._table)
	await dropIndex(db, 'idx_slots_day', CourseUnitSlotTable._table)
	await dropIndex(db, 'idx_slots_time_from', CourseUnitSlotTable._table)
	await dropIndex(db, 'idx_slots_time_to', CourseUnitSlotTable._table)

	// Assessments
	await dropIndex(db, 'idx_assessments_course', CourseAssessmentTable._table)

	// Study Plans
	await dropIndex(db, 'idx_plans_faculty_semester_year', StudyPlanTable._table)
	await dropIndex(db, 'idx_plans_faculty', StudyPlanTable._table)
	await dropIndex(db, 'idx_plans_semester_year', StudyPlanTable._table)
	await dropIndex(db, 'idx_plans_semester', StudyPlanTable._table)
	await dropIndex(db, 'idx_plans_year', StudyPlanTable._table)
	await dropIndex(db, 'idx_plans_level', StudyPlanTable._table)
	await dropIndex(db, 'idx_plans_mode_study', StudyPlanTable._table)
	await dropIndex(db, 'idx_plans_ident', StudyPlanTable._table)

	// Study Plan Courses
	await dropIndex(db, 'idx_plan_courses_plan_course', StudyPlanCourseTable._table)
	await dropIndex(db, 'idx_plan_courses_course_plan', StudyPlanCourseTable._table)
	await dropIndex(db, 'idx_plan_courses_ident', StudyPlanCourseTable._table)
	await dropIndex(db, 'idx_plan_courses_group_category', StudyPlanCourseTable._table)

	// Faculties
	await dropIndex(db, 'idx_faculties_title', FacultyTable._table)
}
