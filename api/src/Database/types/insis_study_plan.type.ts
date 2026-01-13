import InSISSemester from '@scraper/Types/InSISSemester'
import InSISStudyPlanCourseCategory from '@scraper/Types/InSISStudyPlanCourseCategory'
import InSISStudyPlanCourseGroup from '@scraper/Types/InSISStudyPlanCourseGroup'
import { ColumnType, Generated, Insertable, Selectable } from 'kysely'

/**
 * Database schema for Study Plans (Curriculums).
 */
export class StudyPlanTable {
	static readonly _table = 'insis_study_plans' as const

	id!: Generated<number>

	faculty_id!: string | null

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	url!: string

	/** Plan identifier (e.g., "P-AIN"). */
	ident!: string | null
	title!: string | null

	/** Associated semester for the study plan. */
	semester!: InSISSemester | null

	/** Semester validity (e.g., "2025/2026"). */
	year!: string | null

	level!: string | null
	mode_of_study!: string | null
	study_length!: string | null
}

export type StudyPlan = Selectable<StudyPlanTable>
export type NewStudyPlan = Insertable<Omit<StudyPlanTable, 'id' | 'created_at' | 'updated_at'>>
export type NewExplicitStudyPlan = Insertable<Omit<StudyPlanTable, 'created_at' | 'updated_at'>>

// -------------------------------------------------------------------------

/**
 * Association between Study Plans and Courses.
 * Defines the role of a course within a specific plan (e.g., compulsory, elective).
 */
export class StudyPlanCourseTable {
	static readonly _table = 'insis_study_plans_courses' as const

	id!: Generated<number>
	study_plan_id!: number
	course_id!: number | null

	/** Cached course identifier (e.g., "4IT101") for lookups when course_id is null. */
	course_ident!: string

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	group!: InSISStudyPlanCourseGroup
	category!: InSISStudyPlanCourseCategory
}

export type StudyPlanCourse = Selectable<StudyPlanCourseTable>
export type NewStudyPlanCourse = Insertable<Omit<StudyPlanCourseTable, 'id' | 'created_at' | 'updated_at'>>
