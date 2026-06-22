import type { DragSelection } from '@client/types'
import type { InSISDay } from '@shared/domain/insis'
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export const useDragStore = defineStore('drag', () => {
	const dragSelection = ref<DragSelection>({
		active: false,
		startDay: null,
		startTime: null,
		endDay: null,
		endTime: null
	})
	const showDragPopover = ref(false)
	const dragPopoverPosition = ref({ x: 0, y: 0 })

	const normalizedDragSelection = computed<{ day: InSISDay; timeFrom: number; timeTo: number } | null>(() => {
		const ds = dragSelection.value
		if (!ds.startDay || !ds.startTime || !ds.endTime) return null
		return {
			day: ds.startDay,
			timeFrom: Math.min(ds.startTime, ds.endTime),
			timeTo: Math.max(ds.startTime, ds.endTime)
		}
	})

	function startDrag(day: InSISDay, time: number) {
		dragSelection.value = { active: true, startDay: day, startTime: time, endDay: day, endTime: time }
		showDragPopover.value = false
	}

	function updateDrag(_day: InSISDay, time: number) {
		if (!dragSelection.value.active) return
		dragSelection.value.endTime = time
	}

	function endDrag(mouseX: number, mouseY: number) {
		if (!dragSelection.value.active) return
		dragSelection.value.active = false
		if (normalizedDragSelection.value) {
			dragPopoverPosition.value = { x: mouseX, y: mouseY }
			showDragPopover.value = true
		}
	}

	function cancelDrag() {
		dragSelection.value = { active: false, startDay: null, startTime: null, endDay: null, endTime: null }
		showDragPopover.value = false
	}

	function isInDragSelection(day: InSISDay, time: number): boolean {
		const ds = normalizedDragSelection.value
		if (!ds || !dragSelection.value.active) return false
		return day === ds.day && time >= ds.timeFrom && time < ds.timeTo
	}

	return {
		dragSelection,
		showDragPopover,
		dragPopoverPosition,
		normalizedDragSelection,
		startDrag,
		updateDrag,
		endDrag,
		cancelDrag,
		isInDragSelection
	}
})
