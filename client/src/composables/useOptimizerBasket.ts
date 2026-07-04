import { ref, watch } from 'vue'

const BASKET_KEY = 'kreditozrouti:optimizer:basket'

// ponytail: module-level singleton so OptimizerTab and CourseRow share the same reactive state
function loadFromStorage(): number[] {
	try {
		const saved = JSON.parse(localStorage.getItem(BASKET_KEY) ?? 'null')
		if (Array.isArray(saved)) return saved as number[]
	} catch {
		/* ignore */
	}
	return []
}

const basketIds = ref<number[]>(loadFromStorage())

watch(
	basketIds,
	ids => {
		localStorage.setItem(BASKET_KEY, JSON.stringify(ids))
	},
	{ deep: true }
)

export function useOptimizerBasket() {
	function add(id: number) {
		if (!basketIds.value.includes(id)) basketIds.value.push(id)
	}
	function remove(id: number) {
		basketIds.value = basketIds.value.filter(x => x !== id)
	}
	function has(id: number): boolean {
		return basketIds.value.includes(id)
	}
	return { basketIds, add, remove, has }
}
