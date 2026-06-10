import { Kysely, sql } from 'kysely'
import { StudyPlanTable } from '@api/Database/types'
import { createUniqueIndexSafe, dropIndexSafe } from './utils'

export async function up(db: Kysely<any>): Promise<void> {
	// Pre-flight: ensure no duplicate (ident, faculty_id, semester, year) tuples exist.
	const duplicates = await sql<{
		ident: string | null
		faculty_id: string | null
		semester: string | null
		year: number | null
		cnt: number
	}>`
		SELECT ident, faculty_id, semester, year, COUNT(*) as cnt
		FROM ${sql.table(StudyPlanTable._table)}
		WHERE ident IS NOT NULL AND faculty_id IS NOT NULL AND semester IS NOT NULL AND year IS NOT NULL
		GROUP BY ident, faculty_id, semester, year
		HAVING COUNT(*) > 1
	`.execute(db)

	if (duplicates.rows.length > 0) {
		const summary = duplicates.rows
			.map(r => `  ident=${r.ident} faculty_id=${r.faculty_id} semester=${r.semester} year=${r.year} (${r.cnt} rows)`)
			.join('\n')
		throw new Error(
			`Cannot create unique index: duplicate rows found in ${StudyPlanTable._table}:\n${summary}\nResolve duplicates before running this migration.`
		)
	}

	await createUniqueIndexSafe(db, 'idx_plans_unique_ident_faculty_semester_year', StudyPlanTable._table, [
		'ident',
		'faculty_id',
		'semester',
		'year',
	])
}

export async function down(db: Kysely<any>): Promise<void> {
	await dropIndexSafe(db, 'idx_plans_unique_ident_faculty_semester_year', StudyPlanTable._table)
}
