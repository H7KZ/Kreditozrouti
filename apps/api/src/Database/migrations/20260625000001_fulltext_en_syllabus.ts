import { Kysely, sql } from 'kysely'
import { dropIndexSafe, executeSqlSafe } from './utils'

export async function up(db: Kysely<any>): Promise<void> {
	// Rebuild ft_syllabus without the dead literature column
	await dropIndexSafe(db, 'ft_syllabus', 'insis_courses')

	await executeSqlSafe(
		db,
		sql`
      ALTER TABLE insis_courses
      ADD FULLTEXT INDEX ft_syllabus (
        aims_of_the_course,
        learning_outcomes,
        course_contents,
        prerequisites
      )
    `,
		['ER_DUP_KEYNAME', 1061]
	)

	// EN syllabus fields fulltext index
	await executeSqlSafe(
		db,
		sql`
      ALTER TABLE insis_courses
      ADD FULLTEXT INDEX ft_syllabus_en (
        aims_of_the_course_en,
        learning_outcomes_en,
        course_contents_en,
        prerequisites_en
      )
    `,
		['ER_DUP_KEYNAME', 1061]
	)
}

export async function down(db: Kysely<any>): Promise<void> {
	await dropIndexSafe(db, 'ft_syllabus', 'insis_courses')
	await dropIndexSafe(db, 'ft_syllabus_en', 'insis_courses')

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
}
