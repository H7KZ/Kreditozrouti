import type { Database } from '../db/index'
import type { MCPFaculty } from '@kreditozrouti/types'
import type { Kysely } from 'kysely'

export default class FacultyService {
	static async list(db: Kysely<Database>): Promise<MCPFaculty[]> {
		const rows = await db.selectFrom('insis_faculties').select(['id', 'title']).orderBy('id', 'asc').execute()
		return rows.map(row => ({ id: row.id, title: row.title ?? null }))
	}
}
