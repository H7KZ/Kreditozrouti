import { Kysely } from 'kysely'
import { addColumnSafe } from './utils'

export async function up(db: Kysely<any>): Promise<void> {
	await addColumnSafe(db, 'insis_courses', 'last_scraped_at', 'datetime DEFAULT NULL')
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.alterTable('insis_courses').dropColumn('last_scraped_at').execute()
}
