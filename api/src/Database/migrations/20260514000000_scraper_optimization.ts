import { Kysely, sql } from 'kysely'
import { executeSqlSafe } from './utils'

const IGNORE_DUP_COLUMN = ['ER_DUP_FIELDNAME', 1060]

export async function up(db: Kysely<any>): Promise<void> {
	// Add new columns to insis_courses — each wrapped so existing columns are skipped
	await executeSqlSafe(db, sql`ALTER TABLE \`insis_courses\` ADD COLUMN \`guarantors\` text DEFAULT NULL`, IGNORE_DUP_COLUMN)
	await executeSqlSafe(db, sql`ALTER TABLE \`insis_courses\` ADD COLUMN \`last_modified_date\` varchar(10) DEFAULT NULL`, IGNORE_DUP_COLUMN)
	await executeSqlSafe(db, sql`ALTER TABLE \`insis_courses\` ADD COLUMN \`last_modified_by\` text DEFAULT NULL`, IGNORE_DUP_COLUMN)
	await executeSqlSafe(db, sql`ALTER TABLE \`insis_courses\` ADD COLUMN \`study_load\` json DEFAULT NULL`, IGNORE_DUP_COLUMN)
	await executeSqlSafe(db, sql`ALTER TABLE \`insis_courses\` ADD COLUMN \`literature_required\` longtext DEFAULT NULL`, IGNORE_DUP_COLUMN)
	await executeSqlSafe(db, sql`ALTER TABLE \`insis_courses\` ADD COLUMN \`literature_recommended\` longtext DEFAULT NULL`, IGNORE_DUP_COLUMN)

	// Add visibility flag to insis_faculties
	await executeSqlSafe(db, sql`ALTER TABLE \`insis_faculties\` ADD COLUMN \`is_schedule_publicly_visible\` boolean NOT NULL DEFAULT true`, IGNORE_DUP_COLUMN)
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
