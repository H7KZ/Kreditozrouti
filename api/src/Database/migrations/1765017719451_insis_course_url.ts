import { CourseTable } from '@api/Database/types'
import { Kysely } from 'kysely'

/**
 * Applies the migration by adding a 'url' column to the Course table.
 * Sets a default empty string value for existing records.
 *
 * @param mysql - The Kysely database instance used to execute schema queries.
 */
export async function up(mysql: Kysely<any>): Promise<void> {
    await mysql.schema
        .alterTable(CourseTable._table)
        .addColumn('url', 'varchar(255)', col => col.notNull().defaultTo(''))
        .execute()
}

/**
 * Reverts the migration by removing the 'url' column from the Course table.
 *
 * @param mysql - The Kysely database instance used to execute schema queries.
 */
export async function down(mysql: Kysely<any>): Promise<void> {
    await mysql.schema.alterTable(CourseTable._table).dropColumn('url').execute()
}
