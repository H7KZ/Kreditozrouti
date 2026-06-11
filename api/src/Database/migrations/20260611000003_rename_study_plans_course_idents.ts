import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	await sql`RENAME TABLE study_plans_course_idents TO insis_study_plans_course_idents`.execute(db)
}

export async function down(db: Kysely<any>): Promise<void> {
	await sql`RENAME TABLE insis_study_plans_course_idents TO study_plans_course_idents`.execute(db)
}
