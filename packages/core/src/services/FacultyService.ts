import type { Kysely } from 'kysely'
import type { Database } from '../db/index.js'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MCPFaculty {
	id: string
	title: string | null
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function listFaculties(db: Kysely<Database>): Promise<MCPFaculty[]> {
	const rows = await db
		.selectFrom('insis_faculties')
		.select(['id', 'title'])
		.orderBy('id', 'asc')
		.execute()

	return rows.map(row => ({
		id: row.id,
		title: row.title ?? null,
	}))
}
