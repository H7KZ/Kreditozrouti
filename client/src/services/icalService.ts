import type { ICalCreateRequest, ICalCreateResponse } from '@kreditozrouti/types'
import api from '@client/api'

export async function createICalLink(payload: ICalCreateRequest): Promise<ICalCreateResponse> {
	const response = await api.post<ICalCreateResponse>('/ical', payload)
	return response.data
}
