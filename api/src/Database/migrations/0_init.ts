import { Kysely, sql } from 'kysely'

export async function up(mysql: Kysely<any>): Promise<void> {
    await mysql.schema
        .createTable('users')
        .addColumn('id', 'integer', col => col.primaryKey().autoIncrement())
        .addColumn('created_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .addColumn('updated_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull())
        .addColumn('email', 'varchar(255)', col => col.notNull().unique())
        .execute()

    await mysql.schema
        .createTable('events')
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
        .createTable('categories')
        .addColumn('id', 'varchar(255)', col => col.primaryKey())
        .execute()

    await mysql.schema
        .createTable('events_categories')
        .addColumn('event_id', 'varchar(255)', col => col.notNull().references('events.id').onDelete('cascade'))
        .addColumn('category_id', 'varchar(255)', col => col.notNull().references('categories.id').onDelete('cascade'))
        .execute()
}

export async function down(mysql: Kysely<any>): Promise<void> {
    await mysql.schema.dropTable('users').execute()
    await mysql.schema.dropTable('events_categories').execute()
    await mysql.schema.dropTable('categories').execute()
    await mysql.schema.dropTable('events').execute()
}
