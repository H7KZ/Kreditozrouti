import { Kysely } from 'kysely'
import { addColumnSafe } from './utils'

export async function up(db: Kysely<any>): Promise<void> {
	await addColumnSafe(db, 'insis_courses_assessments', 'method_en', 'TEXT NULL')
}
