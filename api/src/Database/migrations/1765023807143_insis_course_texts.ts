import { CourseTableName } from '@api/Database/types'
import { Kysely } from 'kysely'

/**
 * Applies the migration by updating column data types to `text`.
 * Replaces `mode_of_delivery` and `mode_of_completion` to allow unrestricted string length.
 *
 * @param mysql - The Kysely database instance used to execute schema queries.
 */
export async function up(mysql: Kysely<any>): Promise<void> {
    await mysql.schema
        .alterTable(CourseTableName)
        .dropColumn('mode_of_delivery')
        .dropColumn('mode_of_completion')
        .addColumn('mode_of_delivery', 'text')
        .addColumn('mode_of_completion', 'text')
        .execute()
}

/**
 * Reverts the migration by restoring column data types to `varchar(255)`.
 * Restores `mode_of_delivery` and `mode_of_completion` to their original schema definitions.
 *
 * @param mysql - The Kysely database instance used to execute schema queries.
 */
export async function down(mysql: Kysely<any>): Promise<void> {
    await mysql.schema
        .alterTable(CourseTableName)
        .dropColumn('mode_of_delivery')
        .dropColumn('mode_of_completion')
        .addColumn('mode_of_delivery', 'varchar(255)')
        .addColumn('mode_of_completion', 'varchar(255)')
        .execute()
}
