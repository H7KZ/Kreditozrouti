import { Expression, Kysely } from 'kysely'

export async function createIndexSafe(db: Kysely<any>, indexName: string, tableName: string, columns: string[] | Expression<any>): Promise<void> {
	try {
		let query = db.schema.createIndex(indexName).on(tableName)

		if (Array.isArray(columns) && typeof columns[0] === 'string') {
			query = query.columns(columns)
		} else {
			query = query.expression(columns as Expression<any>)
		}

		await query.execute()
	} catch (error: unknown) {
		// Error 1061: Duplicate key name (Index already exists)
		// Error 1062: Duplicate entry (Index already exists)
		if (
			error &&
			typeof error === 'object' &&
			(('code' in error && (error.code === 'ER_DUP_KEYNAME' || error.code === 'ER_DUP_ENTRY')) ||
				('errno' in error && (error.errno === 1061 || error.errno === 1062)))
		) {
			return // Safely ignore
		}
		throw error
	}
}

export async function dropIndexSafe(db: Kysely<any>, indexName: string, tableName: string): Promise<void> {
	await db.schema.dropIndex(indexName).on(tableName).ifExists().execute()
}

/**
 * Executes a raw SQL query safely by catching and ignoring specific error codes.
 */
export async function executeSqlSafe(db: Kysely<any>, query: { execute: (db: Kysely<any>) => Promise<unknown> }, ignorableErrorCodes: (string | number)[]): Promise<void> {
	try {
		await query.execute(db)
	} catch (error: unknown) {
		if (
			error &&
			typeof error === 'object' &&
			(('code' in error && typeof error.code === 'string' && ignorableErrorCodes.includes(error.code)) ||
				('errno' in error && typeof error.errno === 'number' && ignorableErrorCodes.includes(error.errno)))
		) {
			return // Safely ignore
		}
		throw error
	}
}
