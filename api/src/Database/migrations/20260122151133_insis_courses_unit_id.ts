import { CourseUnitSlotTable } from '@api/Database/types'
import { Kysely } from 'kysely'
import { renameColumnSafe } from './utils'

export async function up(mysql: Kysely<any>): Promise<void> {
	await renameColumnSafe(mysql, CourseUnitSlotTable._table, 'timetable_unit_id', 'unit_id')
}

export async function down(mysql: Kysely<any>): Promise<void> {
	await renameColumnSafe(mysql, CourseUnitSlotTable._table, 'unit_id', 'timetable_unit_id')
}
