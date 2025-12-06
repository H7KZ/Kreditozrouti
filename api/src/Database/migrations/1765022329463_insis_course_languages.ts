import { CourseTableName } from '@api/Database/types'
import { Kysely } from 'kysely'

/**
 * Applies the migration by replacing the singular 'language' column with a plural 'languages' column.
 * Increases the column capacity to `varchar(1024)` to support multiple values.
 *
 * @param mysql - The Kysely database instance used to execute schema queries.
 */
export async function up(mysql: Kysely<any>): Promise<void> {
    await mysql.schema.alterTable(CourseTableName).dropColumn('language').addColumn('languages', 'varchar(1024)').execute()
}

/**
 * Reverts the migration by restoring the singular 'language' column.
 * Drops the 'languages' column and reverts the type to `varchar(255)`.
 *
 * @param mysql - The Kysely database instance used to execute schema queries.
 */
export async function down(mysql: Kysely<any>): Promise<void> {
    await mysql.schema.alterTable(CourseTableName).dropColumn('languages').addColumn('language', 'varchar(255)').execute()
}
