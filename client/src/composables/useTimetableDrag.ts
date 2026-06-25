import type { Day } from '@shared/domain/constants'
import type { Ref } from 'vue'
import { onMounted, onUnmounted, ref } from 'vue'
import { useCoursesStore, useDragStore, useFiltersStore, useUIStore } from '@client/stores'

/**
 * Composable encapsulating drag-to-filter interaction on the timetable grid.
 *
 * Registers/cleans up global mousemove and mouseup listeners internally.
 * Returns event handlers to attach in the template.
 *
 * @param gridRef - Ref to the grid root element
 * @param getTimeFromX - Function that converts a clientX + row element to a time in minutes
 *
 * @example
 * ```ts
 * const { handleMouseDown, handleDragFilter, handleDragCancel } = useTimetableDrag(gridRef, getTimeFromX)
 * ```
 */
export function useTimetableDrag(gridRef: Ref<HTMLElement | null>, getTimeFromX: (x: number, element: HTMLElement) => number) {
	const dragStore = useDragStore()
	const coursesStore = useCoursesStore()
	const filtersStore = useFiltersStore()
	const uiStore = useUIStore()

	const isDragging = ref(false)
	const dragStartX = ref(0)

	function handleMouseDown(event: MouseEvent, day: Day) {
		if (!gridRef.value) return

		// Don't start drag if clicking on a course block
		const target = event.target as HTMLElement
		if (target.closest('.timetable-block')) return

		const dayRow = (event.target as HTMLElement).closest('.day-row') as HTMLElement
		if (!dayRow) return

		const time = getTimeFromX(event.clientX, dayRow)
		dragStore.startDrag(day, time)
		isDragging.value = true
		dragStartX.value = event.clientX

		event.preventDefault()
	}

	function handleMouseMove(event: MouseEvent) {
		if (!isDragging.value || !gridRef.value) return

		const dayRow = document.elementFromPoint(event.clientX, event.clientY)?.closest('.day-row') as HTMLElement
		if (!dayRow) return

		const day = dayRow.dataset.day as Day
		const time = getTimeFromX(event.clientX, dayRow)
		dragStore.updateDrag(day, time)
	}

	function handleMouseUp(event: MouseEvent) {
		if (!isDragging.value) return

		isDragging.value = false

		// Check if it was a click (minimal movement) - require at least 20px drag
		const dragDistance = Math.abs(event.clientX - dragStartX.value)
		if (dragDistance < 20) {
			dragStore.cancelDrag()
			return
		}

		dragStore.endDrag(event.clientX, event.clientY)
	}

	async function handleDragFilter() {
		const selection = dragStore.normalizedDragSelection
		if (!selection) return

		filtersStore.filters.include_times = [{ day: selection.day, time_from: selection.timeFrom, time_to: selection.timeTo }]
		filtersStore.filters.offset = 0
		uiStore.switchToListView()
		await coursesStore.fetchCourses()
		dragStore.cancelDrag()
	}

	function handleDragCancel() {
		dragStore.cancelDrag()
	}

	onMounted(() => {
		document.addEventListener('mousemove', handleMouseMove)
		document.addEventListener('mouseup', handleMouseUp)
	})

	onUnmounted(() => {
		document.removeEventListener('mousemove', handleMouseMove)
		document.removeEventListener('mouseup', handleMouseUp)
	})

	return {
		handleMouseDown,
		handleDragFilter,
		handleDragCancel
	}
}
