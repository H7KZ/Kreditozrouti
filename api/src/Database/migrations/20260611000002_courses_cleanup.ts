import { Kysely, sql } from 'kysely'
import { getUpcomingPeriod } from '@shared/domain/period'
import { CourseTable } from '@api/Database/types'

// The upcoming academic year stored in insis_courses.year is one less than the
// calendar year returned by getUpcomingPeriod() because extractYear("ZS 2025/2026") = 2025.
const KEEP_FROM_YEAR = getUpcomingPeriod().year - 1

export async function up(db: Kysely<any>): Promise<void> {
	// study_plan_courses rows cascade-delete via the FK added in the previous migration.
	// insis_courses_units, insis_courses_units_slots, and insis_courses_assessments
	// all have ON DELETE CASCADE from their course_id FK.
	await sql`
		DELETE FROM ${sql.table(CourseTable._table)}
		WHERE year IS NULL OR year < ${KEEP_FROM_YEAR}
	`.execute(db)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function down(_db: Kysely<any>): Promise<void> {
	// Historical data cannot be restored from a down migration.
	// Re-run the catalog scraper to restore course data if needed.
}
