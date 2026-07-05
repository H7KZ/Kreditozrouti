import type { Kysely } from 'kysely'
import type { Database } from '../db/index.js'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MCPStudyPlanCourse {
	course_ident: string
	group: string | null
	category: string | null
}

export interface MCPStudyPlan {
	id: number
	faculty_id: string | null
	ident: string | null
	title: string | null
	year: number | null
	semester: string | null
	courses?: MCPStudyPlanCourse[]
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function listStudyPlans(db: Kysely<Database>, facultyId?: string): Promise<MCPStudyPlan[]> {
	let query = db
		.selectFrom('insis_study_plans as sp')
		.selectAll('sp')

	if (facultyId !== undefined) {
		query = query.where('sp.faculty_id', '=', facultyId)
	}

	const rows = await query.orderBy('sp.faculty_id', 'asc').orderBy('sp.ident', 'asc').execute()

	return rows.map(row => ({
		id: row.id,
		faculty_id: row.faculty_id ?? null,
		ident: row.ident ?? null,
		title: row.title ?? null,
		year: row.year ?? null,
		semester: row.semester ?? null,
	}))
}

export async function getStudyPlanById(db: Kysely<Database>, id: number): Promise<MCPStudyPlan | null> {
	const row = await db
		.selectFrom('insis_study_plans')
		.selectAll()
		.where('id', '=', id)
		.executeTakeFirst()

	if (!row) return null

	const courseRows = await db
		.selectFrom('insis_study_plans_courses')
		.selectAll()
		.where('study_plan_id', '=', id)
		.execute()

	const courses: MCPStudyPlanCourse[] = courseRows.map(c => ({
		course_ident: c.course_ident,
		group: c.group ?? null,
		category: c.category ?? null,
	}))

	return {
		id: row.id,
		faculty_id: row.faculty_id ?? null,
		ident: row.ident ?? null,
		title: row.title ?? null,
		year: row.year ?? null,
		semester: row.semester ?? null,
		courses,
	}
}
