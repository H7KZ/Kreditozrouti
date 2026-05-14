import { Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	// Add new columns to insis_courses
	await db.schema
		.alterTable('insis_courses')
		.addColumn('guarantors', 'text', col => col.defaultTo(null))
		.addColumn('last_modified_date', 'varchar(10)', col => col.defaultTo(null))
		.addColumn('last_modified_by', 'text', col => col.defaultTo(null))
		.addColumn('study_load', 'json', col => col.defaultTo(null))
		.addColumn('literature_required', 'longtext', col => col.defaultTo(null))
		.addColumn('literature_recommended', 'longtext', col => col.defaultTo(null))
		.execute()

	// Add visibility flag to insis_faculties
	await db.schema
		.alterTable('insis_faculties')
		.addColumn('is_schedule_publicly_visible', 'boolean', col => col.notNull().defaultTo(true))
		.execute()
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

	await db.schema
		.alterTable('insis_faculties')
		.dropColumn('is_schedule_publicly_visible')
		.execute()
}
