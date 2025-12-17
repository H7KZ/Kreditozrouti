import { CourseAssessmentMethodTable } from '@api/Database/types'
import { Kysely } from 'kysely'

/**
 * Applies the migration by changing the 'method' column data type to `text`.
 * Enables storage of longer assessment method descriptions exceeding 255 characters.
 *
 * @param mysql - The Kysely database instance used to execute schema queries.
 */
export async function up(mysql: Kysely<any>): Promise<void> {
    await mysql.schema.alterTable(CourseAssessmentMethodTable._table).dropColumn('method').addColumn('method', 'text').execute()
}

/**
 * Reverts the migration by restoring the 'method' column data type to `varchar(255)`.
 *
 * @param mysql - The Kysely database instance used to execute schema queries.
 */
export async function down(mysql: Kysely<any>): Promise<void> {
    await mysql.schema.alterTable(CourseAssessmentMethodTable._table).dropColumn('method').addColumn('method', 'varchar(255)').execute()
}
