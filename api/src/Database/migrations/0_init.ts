import { CategoryTableName, EventCategoryTableName, EventTableName, UserTableName } from '@api/Database/types'
import { Kysely, sql } from 'kysely'

export async function up(mysql: Kysely<any>): Promise<void> {
    await mysql.schema
        .createTable(UserTableName)
        .addColumn('id', 'integer', col => col.primaryKey().autoIncrement())
        .addColumn('created_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .addColumn('updated_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull())
        .addColumn('email', 'varchar(255)', col => col.notNull().unique())
        .execute()

    await mysql.schema
        .createTable(EventTableName)
        .addColumn('id', 'varchar(255)', col => col.primaryKey())
        .addColumn('created_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .addColumn('updated_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull())
        .addColumn('title', 'varchar(255)')
        .addColumn('subtitle', 'varchar(255)')
        .addColumn('datetime', 'datetime')
        .addColumn('image_src', 'varchar(255)')
        .addColumn('image_alt', 'varchar(255)')
        .addColumn('description', 'text')
        .addColumn('place', 'varchar(255)')
        .addColumn('author', 'varchar(255)')
        .addColumn('language', 'varchar(4)')
        .addColumn('registration_from', 'datetime')
        .addColumn('registration_url', 'varchar(1024)')
        .addColumn('substitute_url', 'varchar(1024)')
        .execute()

    await mysql.schema
        .createTable(CategoryTableName)
        .addColumn('id', 'varchar(255)', col => col.primaryKey())
        .execute()

    await mysql.schema
        .createTable(EventCategoryTableName)
        .addColumn('event_id', 'varchar(255)', col => col.notNull().references(`${EventTableName}.id`).onDelete('cascade'))
        .addColumn('category_id', 'varchar(255)', col => col.notNull().references(`${CategoryTableName}.id`).onDelete('cascade'))
        .execute()
}

export async function down(mysql: Kysely<any>): Promise<void> {
    await mysql.schema.dropTable(UserTableName).execute()
    await mysql.schema.dropTable(EventCategoryTableName).execute()
    await mysql.schema.dropTable(CategoryTableName).execute()
    await mysql.schema.dropTable(EventTableName).execute()
}
