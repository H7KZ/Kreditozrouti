import type { Kysely, Transaction } from 'kysely'
import type { Database } from '@api/Database/types'
import { FacultyTable } from '@api/Database/types'

type DbClient = Kysely<Database> | Transaction<Database>

const DEADLOCK_ERRNO = 1213

/**
 * Retries fn on MySQL deadlock (errno 1213) with exponential backoff.
 * All other errors propagate immediately. Re-throws on final attempt.
 */
export async function withDeadlockRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		try {
			return await fn()
		} catch (error) {
			const isDeadlock =
				typeof error === 'object' && error !== null && (error as { errno?: number }).errno === DEADLOCK_ERRNO
			if (!isDeadlock || attempt === maxAttempts - 1) throw error
			await new Promise<void>(resolve => setTimeout(resolve, 100 * 2 ** attempt))
		}
	}
	throw new Error('unreachable')
}

/**
 * Deduplicates, sorts, and batch-inserts faculty string IDs via a single INSERT IGNORE.
 * Sorting provides consistent lock acquisition order across concurrent jobs.
 * No-ops if the filtered list is empty.
 */
export async function insertFacultiesBatch(db: DbClient, ids: (string | null | undefined)[]): Promise<void> {
	const unique = [...new Set(ids.filter((id): id is string => !!id))].sort()
	if (unique.length === 0) return
	await db.insertInto(FacultyTable._table).ignore().values(unique.map(id => ({ id }))).execute()
}
