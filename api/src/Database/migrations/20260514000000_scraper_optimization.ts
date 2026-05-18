import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	// Add new columns to insis_courses (IF NOT EXISTS — safe to re-run)
	await sql`
		ALTER TABLE \`insis_courses\`
		ADD COLUMN IF NOT EXISTS \`guarantors\` text DEFAULT NULL,
		ADD COLUMN IF NOT EXISTS \`last_modified_date\` varchar(10) DEFAULT NULL,
		ADD COLUMN IF NOT EXISTS \`last_modified_by\` text DEFAULT NULL,
		ADD COLUMN IF NOT EXISTS \`study_load\` json DEFAULT NULL,
		ADD COLUMN IF NOT EXISTS \`literature_required\` longtext DEFAULT NULL,
		ADD COLUMN IF NOT EXISTS \`literature_recommended\` longtext DEFAULT NULL
	`.execute(db)

	// Add visibility flag to insis_faculties (IF NOT EXISTS — safe to re-run)
	await sql`
		ALTER TABLE \`insis_faculties\`
		ADD COLUMN IF NOT EXISTS \`is_schedule_publicly_visible\` boolean NOT NULL DEFAULT true
	`.execute(db)
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
