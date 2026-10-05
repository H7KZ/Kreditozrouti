import { Kysely } from 'kysely'
import { addColumnSafe } from './utils'

export async function up(db: Kysely<any>): Promise<void> {
	await addColumnSafe(db, 'insis_courses', 'content_hash', 'varchar(64) DEFAULT NULL')
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.alterTable('insis_courses').dropColumn('content_hash').execute()
}
