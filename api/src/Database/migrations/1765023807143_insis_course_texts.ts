import { CourseTable } from '@api/Database/types'
import { Kysely } from 'kysely'

export async function up(mysql: Kysely<any>): Promise<void> {
    await mysql.schema
        .alterTable(CourseTable._table)
        .dropColumn('mode_of_delivery')
        .dropColumn('mode_of_completion')
        .addColumn('mode_of_delivery', 'text')
        .addColumn('mode_of_completion', 'text')
        .execute()
}

export async function down(mysql: Kysely<any>): Promise<void> {
    await mysql.schema
        .alterTable(CourseTable._table)
        .dropColumn('mode_of_delivery')
        .dropColumn('mode_of_completion')
        .addColumn('mode_of_delivery', 'varchar(255)')
        .addColumn('mode_of_completion', 'varchar(255)')
        .execute()
}
