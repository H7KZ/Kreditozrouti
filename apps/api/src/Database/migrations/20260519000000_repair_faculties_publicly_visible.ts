import { Kysely } from 'kysely'
import { addColumnSafe } from './utils'

export async function up(db: Kysely<any>): Promise<void> {
	// Repair: column may be absent on DBs where migration tracking desynchronised
	// from actual schema state (e.g. partial resets while kysely_migration records remained).
	await addColumnSafe(db, 'insis_faculties', 'is_schedule_publicly_visible', 'boolean NOT NULL DEFAULT true')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function down(_db: Kysely<any>): Promise<void> {
	// No-op: column ownership belongs to 20260514000000_scraper_optimization
}
