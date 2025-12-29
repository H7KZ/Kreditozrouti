import { CourseTable } from '@api/Database/types'
import { Kysely } from 'kysely'

export async function up(mysql: Kysely<any>): Promise<void> {
    await mysql.schema.alterTable(CourseTable._table).addColumn('faculty', 'varchar(255)').execute()
}

export async function down(mysql: Kysely<any>): Promise<void> {
    await mysql.schema.alterTable(CourseTable._table).dropColumn('faculty').execute()
}
