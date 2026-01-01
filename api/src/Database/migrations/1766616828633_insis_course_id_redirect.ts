import { CourseIdRedirectTable, CourseTable } from '@api/Database/types'
import { Kysely } from 'kysely'

export async function up(mysql: Kysely<any>): Promise<void> {
    await mysql.schema
        .createTable(CourseIdRedirectTable._table)
        .addColumn('course_id', 'integer', col => col.notNull().references(`${CourseTable._table}.id`).onDelete('cascade'))
        .addColumn('old_id', 'integer', col => col.notNull())
        .execute()
}

export async function down(mysql: Kysely<any>): Promise<void> {
    await mysql.schema.dropTable(CourseIdRedirectTable._table).execute()
}
