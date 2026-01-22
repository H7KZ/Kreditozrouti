import { mysql } from '@api/clients'
import { CourseTable } from '@api/Database/types/insis_course.type'
import { Faculty, FacultyTable } from '@api/Database/types/insis_faculty.type'
import InSISSemester from '@scraper/Types/InSISSemester'
import InSISStudyPlanCourseCategory from '@scraper/Types/InSISStudyPlanCourseCategory'
import InSISStudyPlanCourseGroup from '@scraper/Types/InSISStudyPlanCourseGroup'
import { ColumnType, Insertable, Selectable } from 'kysely'
import { ExcludeMethods } from '@api/Database/types/index'

/**
 * Database schema for Study Plans (Curriculums).
 */
export class StudyPlanTable {
	static readonly _table = 'insis_study_plans' as const

	id!: number // Generated<number>

	faculty_id!: string | null

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	url!: string

	/** Plan identifier (e.g., "P-AIN"). */
	ident!: string | null
	title!: string | null

	/** Associated semester for the study plan. */
	semester!: InSISSemester | null

	/** Semester validity (e.g., "2025"). */
	year!: number | null

	level!: string | null
	mode_of_study!: string | null
	study_length!: string | null

	async getFaculty(): Promise<Faculty | undefined> {
		if (!this.faculty_id) return undefined
		const query = mysql.selectFrom(FacultyTable._table).selectAll().where('id', '=', this.faculty_id)
		return await query.executeTakeFirst()
	}

	async getCourses(): Promise<StudyPlanCourse[]> {
		const query = mysql.selectFrom(StudyPlanCourseTable._table).selectAll().where('study_plan_id', '=', this.id)
		return await query.execute()
	}
}

export type StudyPlan<F = void, C = void> = Selectable<StudyPlanTable> &
	(F extends void ? unknown : { faculty: Partial<F> | null }) &
	(C extends void ? unknown : { courses: Partial<C>[] })
export type NewStudyPlan = Insertable<Omit<ExcludeMethods<StudyPlanTable>, 'id' | 'created_at' | 'updated_at'>>

// -------------------------------------------------------------------------

/**
 * Association between Study Plans and Courses.
 * Defines the role of a course within a specific plan (e.g., compulsory, elective).
 */
export class StudyPlanCourseTable {
	static readonly _table = 'insis_study_plans_courses' as const

	id!: number // Generated<number>

	study_plan_id!: number
	course_id!: number | null

	/** Cached course identifier (e.g., "4IT101") for lookups when course_id is null. */
	course_ident!: string

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	group!: InSISStudyPlanCourseGroup
	category!: InSISStudyPlanCourseCategory

	async getStudyPlan(): Promise<StudyPlan | null> {
		const query = mysql.selectFrom(StudyPlanTable._table).selectAll().where('id', '=', this.study_plan_id).limit(1)
		const studyPlan = await query.executeTakeFirst()
		return studyPlan ?? null
	}

	async getCourse(): Promise<Selectable<CourseTable> | null> {
		if (!this.course_id) return null

		const query = mysql.selectFrom(CourseTable._table).selectAll().where('id', '=', this.course_id).limit(1)
		const course = await query.executeTakeFirst()
		return course ?? null
	}
}

export type StudyPlanCourse<SP = void, C = void> = Selectable<StudyPlanCourseTable> &
	(SP extends void ? unknown : { study_plan: Partial<SP> | null }) &
	(C extends void ? unknown : { course: Partial<C> | null })
export type NewStudyPlanCourse = Insertable<Omit<ExcludeMethods<StudyPlanCourseTable>, 'id' | 'created_at' | 'updated_at'>>
