import { EventTable, UsersEvents, UserTable } from '@api/Database/types'
import { Kysely, sql } from 'kysely'

export async function up(mysql: Kysely<any>): Promise<void> {
    await mysql.schema
        .createTable(UsersEvents._table)
        .addColumn('user_id', 'integer', col => col.notNull().references(`${UserTable._table}.id`).onDelete('cascade'))
        .addColumn('event_id', 'varchar(255)', col => col.notNull().references(`${EventTable._table}.id`).onDelete('cascade'))
        .addColumn('created_at', 'datetime', col => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
        .execute()
}

export async function down(mysql: Kysely<any>): Promise<void> {
    await mysql.schema.dropTable(UsersEvents._table).execute()
}
