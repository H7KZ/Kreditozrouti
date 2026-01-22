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

export type Faculty = Selectable<FacultyTable>
export type NewFaculty = Insertable<Omit<FacultyTable, 'id' | 'created_at' | 'updated_at'>>
