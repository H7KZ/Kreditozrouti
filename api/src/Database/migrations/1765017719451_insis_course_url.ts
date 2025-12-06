import { CourseTableName } from '@api/Database/types'
import { Kysely } from 'kysely'

export async function up(mysql: Kysely<any>): Promise<void> {
    await mysql.schema
        .alterTable(CourseTableName)
        .addColumn('url', 'varchar(255)', col => col.notNull().defaultTo(''))
        .execute()
}

export async function down(mysql: Kysely<any>): Promise<void> {
    await mysql.schema.alterTable(CourseTableName).dropColumn('url').execute()
}
