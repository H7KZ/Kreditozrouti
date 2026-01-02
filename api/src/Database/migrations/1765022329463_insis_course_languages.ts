import { CourseTable } from '@api/Database/types'
import { Kysely } from 'kysely'

export async function up(mysql: Kysely<any>): Promise<void> {
    await mysql.schema.alterTable(CourseTable._table).dropColumn('language').addColumn('languages', 'varchar(1024)').execute()
}

export async function down(mysql: Kysely<any>): Promise<void> {
    await mysql.schema.alterTable(CourseTable._table).dropColumn('languages').addColumn('language', 'varchar(255)').execute()
}
