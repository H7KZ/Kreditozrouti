import { mysql } from '@api/clients'
import { FacultyTable } from '@api/Database/types'

const CACHE_TTL_MS = 60_000

let cached: { ids: string[]; expiresAt: number } | null = null

/**
 * Faculties the partner API may serve (ADR 0004, gate 3).
 *
 * A faculty is visible only when InSIS publishes its schedule publicly AND a scrape has confirmed that.
 * `schedule_visibility_checked_at IS NULL` means "never confirmed", so unconfirmed faculties are hidden by
 * default. The web app does not use this: it keeps showing every faculty.
 */
export const VisibilityService = {
	async visibleFacultyIds(): Promise<string[]> {
		if (cached && cached.expiresAt > Date.now()) return cached.ids

		const rows = await mysql
			.selectFrom(FacultyTable._table)
			.select('id')
			.where('is_schedule_publicly_visible', '=', true)
			.where('schedule_visibility_checked_at', 'is not', null)
			.execute()

		cached = { ids: rows.map(r => r.id), expiresAt: Date.now() + CACHE_TTL_MS }
		return cached.ids
	},

	/** Intersects a requested faculty list with the visible set. An empty request means "all visible". */
	async restrict(requested: string[] | undefined): Promise<string[]> {
		const visible = await this.visibleFacultyIds()
		return requested?.length ? requested.filter(id => visible.includes(id)) : visible
	}
}
