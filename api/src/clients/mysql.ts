import { Kysely, MysqlDialect, ParseJSONResultsPlugin } from 'kysely'
import { createPool } from 'mysql2'
import Config from '@api/Config/Config'
import { Database } from '@api/Database/types'
import sentry from '@api/sentry'

/**
 * Kysely instance for type-safe MySQL interactions.
 */
const dialect = new MysqlDialect({
	pool: createPool({
		uri: Config.mysql.uri,
		timezone: 'Z',
		connectionLimit: 100, // Max 100 connections in pool
		connectTimeout: 10_000, // 10 seconds to establish connection
		waitForConnections: true, // Wait instead of immediate error
		queueLimit: 0, // Unlimited queue (or set to ~100)
		enableKeepAlive: true,
		keepAliveInitialDelay: 30_000, // 30 seconds
		idleTimeout: 60_000, // Close idle connections after 60s
		maxIdle: 10 // Keep max 10 idle connections
	})
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
				console.warn(`[SLOW QUERY] ${event.queryDurationMillis}ms:`, event.query.sql.slice(0, 200))
			}

			// Report startup errors to Sentry
			if (sentry.isEnabled()) {
				sentry.captureEvent({
					message: 'Database Query Executed',
					level: 'info',
					extra: {
						sql: event.query.sql,
						query: event.query,
						parameters: event.query.parameters,
						duration: event.queryDurationMillis
					}
				})
			}
		} else if (event.level === 'error') {
			if ((event.error as { sql: string }).sql.includes('idx_')) return

			console.error('[DB ERROR]', event.error)

			if (sentry.isEnabled()) {
				sentry.captureException(event.error, {
					extra: {
						sql: event.query.sql,
						query: event.query,
						parameters: event.query.parameters
					}
				})
			}
		}
	}
})
