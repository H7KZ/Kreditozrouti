import type { PersistedScheduleSlotsState, SavedScheduleSlot, SelectedCourseUnit } from '@client/types'
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import analytics from '@client/analytics'
import { STORAGE_KEYS } from '@client/constants/storage.ts'
import { useTimetableStore } from '@client/stores/timetable.store'
import { loadFromStorage, saveToStorage } from '@client/utils/localstorage.ts'

export const useScheduleSlotsStore = defineStore('schedule-slots', () => {
	const slots = ref<SavedScheduleSlot[]>([])
	const activeSlotId = ref<string | null>(null)

	const activeSlot = computed(() => slots.value.find((s) => s.id === activeSlotId.value) ?? null)
	const canSaveMoreSlots = computed(() => slots.value.length < 5)

	function saveCurrentAsSlot(name: string, units: SelectedCourseUnit[]) {
		if (!canSaveMoreSlots.value) return null

		const newSlot: SavedScheduleSlot = {
			id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
			name,
			units: JSON.parse(JSON.stringify(units)),
			createdAt: Date.now(),
			updatedAt: Date.now(),
		}

		slots.value.push(newSlot)
		activeSlotId.value = newSlot.id
		persist()
		analytics.track('schedule_saved', { slot_count: units.length })
		return newSlot
	}

	function loadSlot(slotId: string) {
		const slot = slots.value.find((s) => s.id === slotId)
		if (!slot) return

		const timetableStore = useTimetableStore()
		activeSlotId.value = slot.id
		timetableStore.loadUnits(slot.units)
		persist()
		analytics.track('schedule_loaded')
	}

	function renameSlot(slotId: string, name: string) {
		const slot = slots.value.find((s) => s.id === slotId)
		if (slot) {
			slot.name = name
			slot.updatedAt = Date.now()
			persist()
		}
	}

	function deleteSlot(slotId: string) {
		const index = slots.value.findIndex((s) => s.id === slotId)
		if (index === -1) return

		const wasActive = activeSlotId.value === slotId
		slots.value.splice(index, 1)

		if (wasActive) {
			if (slots.value.length > 0) {
				const nextSlot = slots.value[index] ?? slots.value[index - 1]
				if (nextSlot) {
					loadSlot(nextSlot.id)
					return
				}
			} else {
				const timetableStore = useTimetableStore()
				activeSlotId.value = null
				timetableStore.clearAll()
			}
		}

		persist()
	}

	function syncActiveSlot(units: SelectedCourseUnit[]) {
		if (!activeSlotId.value) return

		const slot = slots.value.find((s) => s.id === activeSlotId.value)
		if (slot) {
			slot.units = JSON.parse(JSON.stringify(units))
			slot.updatedAt = Date.now()
			persist()
		}
	}

	function duplicateSlot(slotId: string, name: string) {
		const sourceSlot = slots.value.find((s) => s.id === slotId)
		if (!sourceSlot || !canSaveMoreSlots.value) return null

		const newSlot: SavedScheduleSlot = {
			id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
			name,
			units: JSON.parse(JSON.stringify(sourceSlot.units)),
			createdAt: Date.now(),
			updatedAt: Date.now(),
		}

		slots.value.push(newSlot)
		activeSlotId.value = newSlot.id
		const timetableStore = useTimetableStore()
		timetableStore.loadUnits(newSlot.units)
		persist()
		return newSlot
	}

	function clearActiveSlot() {
		activeSlotId.value = null
		persist()
	}

	function persist() {
		saveToStorage<PersistedScheduleSlotsState>(STORAGE_KEYS.SCHEDULE_SLOTS, {
			slots: slots.value,
			activeSlotId: activeSlotId.value,
		})
	}

	function hydrate() {
		const state = loadFromStorage<PersistedScheduleSlotsState>(STORAGE_KEYS.SCHEDULE_SLOTS)
		if (state) {
			slots.value = state.slots
			activeSlotId.value = state.activeSlotId
		}
	}

	return {
		slots,
		activeSlotId,
		activeSlot,
		canSaveMoreSlots,
		saveCurrentAsSlot,
		loadSlot,
		renameSlot,
		deleteSlot,
		syncActiveSlot,
		duplicateSlot,
		clearActiveSlot,
		persist,
		hydrate,
	}
})
