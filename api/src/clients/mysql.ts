import { Kysely, MysqlDialect, ParseJSONResultsPlugin } from 'kysely'
import { createPool } from 'mysql2'
import Config from '@api/Config/Config'
import { Database } from '@api/Database/types'
import { logger } from '@api/logger'

/**
 * Kysely instance for type-safe MySQL interactions.
 */
const dialect = new MysqlDialect({
	pool: createPool({
		uri: Config.mysql.uri,
		// mysql2 supports sessionVariables at runtime but the TS types omit it — cast is intentional
		sessionVariables: { 'transaction_isolation': 'READ-COMMITTED' },
		timezone: 'Z',
		connectionLimit: 100, // Max 100 connections in pool
		connectTimeout: 10_000, // 10 seconds to establish connection
		waitForConnections: true, // Wait instead of immediate error
		queueLimit: 0, // Unlimited queue (or set to ~100)
		enableKeepAlive: true,
		keepAliveInitialDelay: 30_000, // 30 seconds
		idleTimeout: 60_000, // Close idle connections after 60s
		maxIdle: 10 // Keep max 10 idle connections
	} as any)
})

/**
 * Kysely database client instance.
 * Configured with MySQL dialect and JSON parsing plugin.
 */
export const mysql = new Kysely<Database>({
	dialect,
	plugins: [new ParseJSONResultsPlugin()],

	// Optional: Add query logging for debugging slow queries
	log(event) {
		if (event.level === 'query') {
			if (event.queryDurationMillis > 500) {
				logger.warn({ duration_ms: event.queryDurationMillis, sql: event.query.sql.slice(0, 200) }, 'db.slow_query')
			}
		} else if (event.level === 'error') {
			if ((event.error as { sql: string }).sql.includes('idx_')) return

			logger.error({ err: event.error, sql: event.query.sql }, 'db.query_error')
		}
	}
})
