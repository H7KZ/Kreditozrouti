import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	await sql`ALTER TABLE insis_courses MODIFY COLUMN last_modified_date varchar(50) DEFAULT NULL`.execute(db)
}

export async function down(db: Kysely<any>): Promise<void> {
	await sql`ALTER TABLE insis_courses MODIFY COLUMN last_modified_date varchar(10) DEFAULT NULL`.execute(db)
}
