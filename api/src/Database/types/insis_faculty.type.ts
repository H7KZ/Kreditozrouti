import { mysql } from '@api/clients'
import { ExcludeMethods } from '@api/Database/types/index'
import { Course, CourseTable } from '@api/Database/types/insis_course.type'
import { StudyPlan, StudyPlanTable } from '@api/Database/types/insis_study_plan.type'
import { ColumnType, Insertable, Selectable } from 'kysely'

/**
 * Database schema for Faculties.
 */
export class FacultyTable {
	static readonly _table = 'insis_faculties' as const

	id!: string

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	title!: string | null

	async getCourses(): Promise<Course[]> {
		const query = mysql.selectFrom(CourseTable._table).selectAll().where('faculty_id', '=', this.id)
		return await query.execute()
	}

	async getStudyPlans(): Promise<StudyPlan[]> {
		const query = mysql.selectFrom(StudyPlanTable._table).selectAll().where('faculty_id', '=', this.id)
		return await query.execute()
	}
}

export type Faculty<C = void, SP = void> = Selectable<FacultyTable> &
	(C extends void ? unknown : { courses: C[] }) &
	(SP extends void ? unknown : { study_plans: SP[] })
export type NewFaculty = Insertable<Omit<ExcludeMethods<FacultyTable>, 'id' | 'created_at' | 'updated_at'>>
