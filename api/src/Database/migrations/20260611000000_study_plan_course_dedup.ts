import { Kysely, sql } from 'kysely'
import { StudyPlanCourseTable } from '@api/Database/types'
import { createUniqueIndexSafe, dropIndexSafe } from './utils'

export async function up(db: Kysely<any>): Promise<void> {
	// Delete all rows whose priority rank is worse than the best row for the
	// same (study_plan_id, course_ident) pair. Rows with COUNT(*) = 1 are
	// excluded by the HAVING clause — they have no competitor and are safe.
	//
	// Tie note: rows with identical (group, category) — i.e., the same rank — are
	// not touched by this DELETE. In practice they cannot exist because migration
	// 20260610000000_study_plan_course_unique_key already enforces uniqueness on
	// (study_plan_id, course_ident, group, category).
	await sql`
		DELETE spc
		FROM ${sql.table(StudyPlanCourseTable._table)} spc
		INNER JOIN (
			SELECT study_plan_id, course_ident,
				   MIN(
					   CASE \`group\`
						   WHEN 'field_specific_bachelor' THEN 0
						   WHEN 'field_specific_master'   THEN 10
						   WHEN 'faculty_specific'        THEN 20
						   WHEN 'minor_specialization'    THEN 30
						   WHEN 'university_wide'         THEN 40
					   END
					   +
					   CASE category
						   WHEN 'state_exam'         THEN 0
						   WHEN 'compulsory'         THEN 1
						   WHEN 'elective'           THEN 2
						   WHEN 'language'           THEN 3
						   WHEN 'physical_education' THEN 4
						   WHEN 'beyond_scope'       THEN 5
						   WHEN 'exchange_program'   THEN 6
						   WHEN 'prohibited'         THEN 7
					   END
				   ) AS best_rank
			FROM ${sql.table(StudyPlanCourseTable._table)}
			GROUP BY study_plan_id, course_ident
			HAVING COUNT(*) > 1
		) winners
		  ON  spc.study_plan_id = winners.study_plan_id
		  AND spc.course_ident  = winners.course_ident
		WHERE (
			CASE spc.\`group\`
				WHEN 'field_specific_bachelor' THEN 0
				WHEN 'field_specific_master'   THEN 10
				WHEN 'faculty_specific'        THEN 20
				WHEN 'minor_specialization'    THEN 30
				WHEN 'university_wide'         THEN 40
			END
			+
			CASE spc.category
				WHEN 'state_exam'         THEN 0
				WHEN 'compulsory'         THEN 1
				WHEN 'elective'           THEN 2
				WHEN 'language'           THEN 3
				WHEN 'physical_education' THEN 4
				WHEN 'beyond_scope'       THEN 5
				WHEN 'exchange_program'   THEN 6
				WHEN 'prohibited'         THEN 7
			END
		) > winners.best_rank
	`.execute(db)

	// Replace the old 4-column unique index (study_plan_id, course_ident, group, category)
	// with a tighter 2-column index now that each course_ident appears at most once per plan.
	await dropIndexSafe(db, 'idx_plan_courses_unique_lookup', StudyPlanCourseTable._table)
	await createUniqueIndexSafe(db, 'idx_plan_courses_unique_ident', StudyPlanCourseTable._table, ['study_plan_id', 'course_ident'])
}

export async function down(db: Kysely<any>): Promise<void> {
	// Restore original index (rows deleted by up() re-populate on next scrape run)
	await dropIndexSafe(db, 'idx_plan_courses_unique_ident', StudyPlanCourseTable._table)
	await createUniqueIndexSafe(db, 'idx_plan_courses_unique_lookup', StudyPlanCourseTable._table, ['study_plan_id', 'course_ident', 'group', 'category'])
}
