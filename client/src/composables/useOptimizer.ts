import type { OptimizeRequest, OptimizeResponseDTO, SolverConstraints } from '@kreditozrouti/types'
import { ref } from 'vue'
import analytics from '@client/analytics'
import { STORAGE_KEYS } from '@client/constants/storage'
import { postOptimize } from '@client/services'
import { loadFromStorage, saveToStorage } from '@client/utils/localstorage'

export function useOptimizer() {
	const loading = ref(false)
	const error = ref<string | null>(null)

	async function optimize(request: OptimizeRequest): Promise<OptimizeResponseDTO> {
		loading.value = true
		error.value = null
		try {
			const response = await postOptimize(request)
			analytics.track('timetable_optimized', {
				mode: request.mode,
				candidate_count: response.full_candidates?.length ?? 0
			})
			return response
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to optimize timetable'
			throw e
		} finally {
			loading.value = false
		}
	}

	function saveConstraints(constraints: SolverConstraints): void {
		saveToStorage(STORAGE_KEYS.OPTIMIZER_CONSTRAINTS, constraints)
	}

	function loadConstraints(): SolverConstraints {
		return loadFromStorage<SolverConstraints>(STORAGE_KEYS.OPTIMIZER_CONSTRAINTS) ?? {}
	}

	return { loading, error, optimize, saveConstraints, loadConstraints }
}
