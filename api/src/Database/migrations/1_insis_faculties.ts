import { FacultyTable } from '@api/Database/types'
import { Kysely, sql } from 'kysely'

export async function up(mysql: Kysely<any>): Promise<void> {
	await mysql.schema
		.createTable(FacultyTable._table)
		.addColumn('id', 'varchar(32)', col => col.primaryKey()) // ID is a string (e.g., 'FIS')
		.addColumn('created_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
		.addColumn('updated_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull())
		.addColumn('title', 'varchar(255)')
		.execute()
}

export async function down(mysql: Kysely<any>): Promise<void> {
	await mysql.schema.dropTable(FacultyTable._table).execute()
}
