import { CourseTableName } from '@api/Database/types'
import { Kysely } from 'kysely'

export async function up(mysql: Kysely<any>): Promise<void> {
    await mysql.schema.alterTable(CourseTableName).dropColumn('language').addColumn('languages', 'varchar(1024)').execute()
}

export async function down(mysql: Kysely<any>): Promise<void> {
    await mysql.schema.alterTable(CourseTableName).dropColumn('languages').addColumn('language', 'varchar(255)').execute()
}
