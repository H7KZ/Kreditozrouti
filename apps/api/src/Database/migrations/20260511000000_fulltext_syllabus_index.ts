import { Kysely, sql } from 'kysely'
import { executeSqlSafe } from './utils'

export async function up(db: Kysely<any>): Promise<void> {
	// FULLTEXT index on syllabus fields
	// MySQL requires all columns to be TEXT or VARCHAR for FULLTEXT

	await executeSqlSafe(
		db,
		sql`
      ALTER TABLE insis_courses
      ADD FULLTEXT INDEX ft_syllabus (
        aims_of_the_course,
        learning_outcomes,
        course_contents,
        literature,
        prerequisites
      )
    `,
		['ER_DUP_KEYNAME', 1061]
	)

	// Also a combined index including titles for the unified search path
	await executeSqlSafe(
		db,
		sql`
      ALTER TABLE insis_courses
      ADD FULLTEXT INDEX ft_full (
        title_cs,
        title_en,
        aims_of_the_course,
        learning_outcomes,
        course_contents
      )
    `,
		['ER_DUP_KEYNAME', 1061]
	)
}

export async function down(db: Kysely<any>): Promise<void> {
	await executeSqlSafe(db, sql`ALTER TABLE insis_courses DROP INDEX ft_syllabus`, ['ER_CANT_DROP_FIELD_OR_KEY', 1091])
	await executeSqlSafe(db, sql`ALTER TABLE insis_courses DROP INDEX ft_full`, ['ER_CANT_DROP_FIELD_OR_KEY', 1091])
}
