import { Kysely } from 'kysely'
import { addColumnSafe } from './utils'

export async function up(db: Kysely<any>): Promise<void> {
	await addColumnSafe(db, 'insis_courses', 'guarantors', 'text DEFAULT NULL')
	await addColumnSafe(db, 'insis_courses', 'last_modified_date', 'varchar(10) DEFAULT NULL')
	await addColumnSafe(db, 'insis_courses', 'last_modified_by', 'text DEFAULT NULL')
	await addColumnSafe(db, 'insis_courses', 'study_load', 'json DEFAULT NULL')
	await addColumnSafe(db, 'insis_courses', 'literature_required', 'longtext DEFAULT NULL')
	await addColumnSafe(db, 'insis_courses', 'literature_recommended', 'longtext DEFAULT NULL')
	await addColumnSafe(db, 'insis_faculties', 'is_schedule_publicly_visible', 'boolean NOT NULL DEFAULT true')
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema
		.alterTable('insis_courses')
		.dropColumn('guarantors')
		.dropColumn('last_modified_date')
		.dropColumn('last_modified_by')
		.dropColumn('study_load')
		.dropColumn('literature_required')
		.dropColumn('literature_recommended')
		.execute()

	await db.schema.alterTable('insis_faculties').dropColumn('is_schedule_publicly_visible').execute()
}
