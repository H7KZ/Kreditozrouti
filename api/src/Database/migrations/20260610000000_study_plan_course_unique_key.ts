import { Kysely, sql } from 'kysely'
import { StudyPlanCourseTable } from '@api/Database/types'
import { createUniqueIndexSafe, dropIndexSafe } from './utils'

export async function up(db: Kysely<any>): Promise<void> {
	// Pre-flight: ensure no duplicate (study_plan_id, course_ident, group, category) tuples exist.
	// The unique index creation would fail anyway, but this gives a clear error message first.
	const duplicates = await sql<{
		study_plan_id: number
		course_ident: string
		group: string
		category: string
		cnt: number
	}>`
		SELECT study_plan_id, course_ident, \`group\`, category, COUNT(*) as cnt
		FROM ${sql.table(StudyPlanCourseTable._table)}
		GROUP BY study_plan_id, course_ident, \`group\`, category
		HAVING COUNT(*) > 1
	`.execute(db)

	if (duplicates.rows.length > 0) {
		const summary = duplicates.rows
			.map(r => `  study_plan_id=${r.study_plan_id} course_ident=${r.course_ident} group=${r.group} category=${r.category} (${r.cnt} rows)`)
			.join('\n')
		throw new Error(
			`Cannot create unique index: duplicate rows found in ${StudyPlanCourseTable._table}:\n${summary}\nResolve duplicates before running this migration.`
		)
	}

	await createUniqueIndexSafe(db, 'idx_plan_courses_unique_lookup', StudyPlanCourseTable._table, [
		'study_plan_id',
		'course_ident',
		'group',
		'category',
	])
}

export async function down(db: Kysely<any>): Promise<void> {
	await dropIndexSafe(db, 'idx_plan_courses_unique_lookup', StudyPlanCourseTable._table)
}
