import { Kysely } from 'kysely'
import { ApiKeyTable } from '@api/Database/types'
import { addColumnSafe } from './utils'

export async function up(db: Kysely<any>): Promise<void> {
	// NULL (or an empty list) keeps a key server-to-server only. A browser may use a key only from the origins listed here.
	await addColumnSafe(db, ApiKeyTable._table, 'allowed_origins', 'JSON NULL')
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema
		.alterTable(ApiKeyTable._table)
		.dropColumn('allowed_origins')
		.execute()
		.catch(() => {
			/* empty */
		})
}
