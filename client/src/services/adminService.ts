import type { AdminStatsResponse } from '@api/Contracts/admin'
import api from '@client/api'

export type { AdminStatsResponse }

export async function fetchAdminStats(token: string): Promise<AdminStatsResponse> {
	const { data } = await api.get<AdminStatsResponse>('/admin/stats', {
		headers: { Authorization: `Bearer ${token}` },
	})
	return data
}

export async function triggerCatalogScrape(token: string): Promise<void> {
	await api.post('/commands/insis/catalog', null, {
		headers: { Authorization: `Bearer ${token}` },
	})
}

export async function triggerStudyPlansScrape(token: string): Promise<void> {
	await api.post('/commands/insis/studyplans', null, {
		headers: { Authorization: `Bearer ${token}` },
	})
}
