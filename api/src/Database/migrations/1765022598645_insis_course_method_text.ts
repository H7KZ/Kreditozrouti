import { CourseAssessmentMethodTable } from '@api/Database/types'
import { Kysely } from 'kysely'

export async function up(mysql: Kysely<any>): Promise<void> {
    await mysql.schema.alterTable(CourseAssessmentMethodTable._table).dropColumn('method').addColumn('method', 'text').execute()
}

export async function down(mysql: Kysely<any>): Promise<void> {
    await mysql.schema.alterTable(CourseAssessmentMethodTable._table).dropColumn('method').addColumn('method', 'varchar(255)').execute()
}
