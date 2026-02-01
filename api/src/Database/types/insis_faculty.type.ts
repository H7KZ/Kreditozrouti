import { Course, ExcludeMethods, StudyPlan } from '@api/Database/types/index'
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
}

export type Faculty<C = void, SP = void> = Selectable<FacultyTable> &
	(C extends void ? unknown : { courses: C[] }) &
	(SP extends void ? unknown : { study_plans: SP[] })
export type NewFaculty = Insertable<Omit<ExcludeMethods<FacultyTable>, 'id' | 'created_at' | 'updated_at'>>

export type FacultyWithRelations = Faculty<Course, StudyPlan>
