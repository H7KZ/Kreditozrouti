import { Kysely } from 'kysely'
import { addColumnSafe } from './utils'

export async function up(db: Kysely<any>): Promise<void> {
	await addColumnSafe(db, 'insis_courses', 'blocked_by_course_idents', 'JSON NULL')
	await addColumnSafe(db, 'insis_courses', 'excluded_after_course_idents', 'JSON NULL')
	await addColumnSafe(db, 'insis_courses', 'concurrent_exclusion_idents', 'JSON NULL')
	await addColumnSafe(db, 'insis_courses', 'recommended_before_course_idents', 'JSON NULL')
}

export async function down(db: Kysely<any>): Promise<void> {
	for (const col of [
		'blocked_by_course_idents',
		'excluded_after_course_idents',
		'concurrent_exclusion_idents',
		'recommended_before_course_idents'
	]) {
		await db.schema
			.alterTable('insis_courses')
			.dropColumn(col)
			.execute()
			.catch(() => {
				/* empty */
			})
	}
}
