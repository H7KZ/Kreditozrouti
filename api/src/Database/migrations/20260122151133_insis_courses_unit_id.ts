import { CourseUnitSlotTable } from '@api/Database/types'
import { Kysely } from 'kysely'

export async function up(mysql: Kysely<any>): Promise<void> {
	await mysql.schema.alterTable(CourseUnitSlotTable._table).renameColumn('timetable_unit_id', 'unit_id').execute()
}

export async function down(mysql: Kysely<any>): Promise<void> {
	await mysql.schema.alterTable(CourseUnitSlotTable._table).renameColumn('unit_id', 'timetable_unit_id').execute()
}
