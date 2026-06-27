import { Kysely } from 'kysely'
import { addColumnSafe, renameColumnSafe } from './utils'

export async function up(db: Kysely<any>): Promise<void> {
	await renameColumnSafe(db, 'insis_courses', 'content_hash', 'content_hash_cs')
	await addColumnSafe(db, 'insis_courses', 'content_hash_en', 'TEXT NULL')

	await addColumnSafe(db, 'insis_courses', 'aims_of_the_course_en', 'TEXT NULL')
	await addColumnSafe(db, 'insis_courses', 'learning_outcomes_en', 'TEXT NULL')
	await addColumnSafe(db, 'insis_courses', 'course_contents_en', 'TEXT NULL')
	await addColumnSafe(db, 'insis_courses', 'special_requirements_en', 'TEXT NULL')
	await addColumnSafe(db, 'insis_courses', 'literature_required_en', 'TEXT NULL')
	await addColumnSafe(db, 'insis_courses', 'literature_recommended_en', 'TEXT NULL')
	await addColumnSafe(db, 'insis_courses', 'prerequisites_en', 'TEXT NULL')
	await addColumnSafe(db, 'insis_courses', 'recommended_programmes_en', 'TEXT NULL')
	await addColumnSafe(db, 'insis_courses', 'required_work_experience_en', 'TEXT NULL')
}

export async function down(db: Kysely<any>): Promise<void> {
	await renameColumnSafe(db, 'insis_courses', 'content_hash_cs', 'content_hash')
	for (const col of [
		'content_hash_en',
		'aims_of_the_course_en',
		'learning_outcomes_en',
		'course_contents_en',
		'special_requirements_en',
		'literature_required_en',
		'literature_recommended_en',
		'prerequisites_en',
		'recommended_programmes_en',
		'required_work_experience_en'
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
