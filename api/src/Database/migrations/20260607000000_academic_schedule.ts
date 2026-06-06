import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.createTable('insis_academic_periods')
		.ifNotExists()
		.addColumn('id', 'integer', col => col.autoIncrement().primaryKey().unsigned())
		.addColumn('insis_period_id', 'integer', col => col.notNull().unsigned())
		.addColumn('faculty_id', 'varchar(32)', col => col.notNull())
		.addColumn('semester', sql`ENUM('ZS', 'LS')`)
		.addColumn('year', 'integer', col => col.notNull().unsigned())
		.addColumn('level', 'varchar(100)')
		.addColumn('starts_at', 'date', col => col.notNull())
		.addColumn('ends_at', 'date', col => col.notNull())
		.addColumn('last_scraped_at', 'datetime')
		.addColumn('created_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
		.addColumn('updated_at', 'datetime', col =>
			col.defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull()
		)
		.execute()

	await db.schema
		.createTable('insis_academic_schedule_events')
		.ifNotExists()
		.addColumn('id', 'integer', col => col.autoIncrement().primaryKey().unsigned())
		.addColumn('period_id', 'integer', col => col.notNull().unsigned())
		.addColumn('title', 'varchar(500)', col => col.notNull())
		.addColumn('starts_at', 'datetime')
		.addColumn('ends_at', 'datetime')
		.addColumn('created_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
		.addColumn('updated_at', 'datetime', col =>
			col.defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull()
		)
		.execute()

	await db.schema
		.alterTable('insis_academic_periods')
		.addUniqueConstraint('uq_academic_periods_insis_period_id', ['insis_period_id'])
		.execute()

	await db.schema
		.alterTable('insis_academic_schedule_events')
		.addForeignKeyConstraint('fk_academic_events_period_id', ['period_id'], 'insis_academic_periods', ['id'])
		.onDelete('cascade')
		.execute()

	await db.schema
		.alterTable('insis_academic_periods')
		.addForeignKeyConstraint('fk_academic_periods_faculty_id', ['faculty_id'], 'insis_faculties', ['id'])
		.execute()
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('insis_academic_schedule_events').ifExists().execute()
	await db.schema.dropTable('insis_academic_periods').ifExists().execute()
}
