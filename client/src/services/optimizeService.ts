import type { OptimizeRequest, OptimizeResponseDTO } from '@kreditozrouti/types'
import api from '@client/api'

export async function postOptimize(payload: OptimizeRequest): Promise<OptimizeResponseDTO> {
	const response = await api.post<OptimizeResponseDTO>('/optimize', payload)
	return response.data
}
