import { Kysely, sql } from 'kysely'
import { ApiConsumerTable, ApiKeyTable, ApiPlanTable, ApiUsageHourlyTable } from '@api/Database/types'
import { createIndexSafe, createUniqueIndexSafe } from './utils'

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.createTable(ApiPlanTable._table)
		.ifNotExists()
		.addColumn('id', 'integer', col => col.primaryKey().autoIncrement())
		.addColumn('name', 'varchar(64)', col => col.notNull())
		.addColumn('requests_per_minute', 'integer', col => col.notNull())
		.addColumn('requests_per_day', 'integer', col => col.notNull())
		.addColumn('created_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
		.addColumn('updated_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull())
		.execute()

	await createUniqueIndexSafe(db, 'idx_api_plans_name', ApiPlanTable._table, ['name'])

	await db.schema
		.createTable(ApiConsumerTable._table)
		.ifNotExists()
		.addColumn('id', 'integer', col => col.primaryKey().autoIncrement())
		.addColumn('plan_id', 'integer', col => col.notNull().references(`${ApiPlanTable._table}.id`))
		.addColumn('slug', 'varchar(64)', col => col.notNull())
		.addColumn('name', 'varchar(255)', col => col.notNull())
		.addColumn('contact_email', 'varchar(255)')
		.addColumn('disabled_at', 'datetime')
		.addColumn('created_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
		.addColumn('updated_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull())
		.execute()

	await createUniqueIndexSafe(db, 'idx_api_consumers_slug', ApiConsumerTable._table, ['slug'])

	await db.schema
		.createTable(ApiKeyTable._table)
		.ifNotExists()
		.addColumn('id', 'integer', col => col.primaryKey().autoIncrement())
		.addColumn('consumer_id', 'integer', col => col.notNull().references(`${ApiConsumerTable._table}.id`).onDelete('cascade'))
		.addColumn('prefix', 'varchar(16)', col => col.notNull())
		.addColumn('key_hash', 'char(64)', col => col.notNull())
		.addColumn('label', 'varchar(255)')
		.addColumn('scopes', 'json', col => col.notNull())
		.addColumn('last_used_at', 'datetime')
		.addColumn('expires_at', 'datetime')
		.addColumn('revoked_at', 'datetime')
		.addColumn('created_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
		.addColumn('updated_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull())
		.execute()

	await createUniqueIndexSafe(db, 'idx_api_keys_prefix', ApiKeyTable._table, ['prefix'])
	await createIndexSafe(db, 'idx_api_keys_consumer', ApiKeyTable._table, ['consumer_id'])

	await db.schema
		.createTable(ApiUsageHourlyTable._table)
		.ifNotExists()
		.addColumn('id', 'integer', col => col.primaryKey().autoIncrement())
		.addColumn('consumer_id', 'integer', col => col.notNull().references(`${ApiConsumerTable._table}.id`).onDelete('cascade'))
		.addColumn('key_id', 'integer', col => col.notNull())
		.addColumn('hour', 'datetime', col => col.notNull())
		.addColumn('route', 'varchar(128)', col => col.notNull())
		.addColumn('status_class', 'smallint', col => col.notNull())
		.addColumn('request_count', 'integer', col => col.notNull().defaultTo(0))
		.addColumn('total_duration_ms', 'bigint', col => col.notNull().defaultTo(0))
		.execute()

	// One row per bucket so the hourly flush can upsert and add to the counters.
	await createUniqueIndexSafe(db, 'idx_api_usage_bucket', ApiUsageHourlyTable._table, ['consumer_id', 'key_id', 'hour', 'route', 'status_class'])
	await createIndexSafe(db, 'idx_api_usage_hour', ApiUsageHourlyTable._table, ['hour'])

	// Seed the plan for the first partner. Values are a starting guess, tune from api_usage_hourly.
	await sql`
		INSERT IGNORE INTO ${sql.table(ApiPlanTable._table)} (name, requests_per_minute, requests_per_day)
		VALUES ('partner', 300, 50000)
	`.execute(db)
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable(ApiUsageHourlyTable._table).ifExists().execute()
	await db.schema.dropTable(ApiKeyTable._table).ifExists().execute()
	await db.schema.dropTable(ApiConsumerTable._table).ifExists().execute()
	await db.schema.dropTable(ApiPlanTable._table).ifExists().execute()
}
