import { Kysely, sql } from 'kysely'
import { StudyPlanCourseTable } from '@api/Database/types'
import { createUniqueIndexSafe, dropIndexSafe } from './utils'

export async function up(db: Kysely<any>): Promise<void> {
	// Delete duplicate rows, keeping the one with the lowest id per (study_plan_id, course_ident, group, category).
	await sql`
		DELETE t1 FROM ${sql.table(StudyPlanCourseTable._table)} t1
		INNER JOIN ${sql.table(StudyPlanCourseTable._table)} t2
			ON  t1.study_plan_id = t2.study_plan_id
			AND t1.course_ident  = t2.course_ident
			AND t1.\`group\`     = t2.\`group\`
			AND t1.category      = t2.category
			AND t1.id            > t2.id
	`.execute(db)

	await createUniqueIndexSafe(db, 'idx_plan_courses_unique_lookup', StudyPlanCourseTable._table, ['study_plan_id', 'course_ident', 'group', 'category'])
}

export async function down(db: Kysely<any>): Promise<void> {
	await dropIndexSafe(db, 'idx_plan_courses_unique_lookup', StudyPlanCourseTable._table)
}
