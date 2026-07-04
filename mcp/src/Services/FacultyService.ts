import { db } from '@mcp/DB/client.js'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MCPFaculty {
	id: string
	title: string | null
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function listFaculties(): Promise<MCPFaculty[]> {
	const rows = await db
		.selectFrom('insis_faculties')
		.selectAll()
		.orderBy('id', 'asc')
		.execute()

	return rows.map(row => ({
		id: row.id,
		title: row.title ?? null,
	}))
}
