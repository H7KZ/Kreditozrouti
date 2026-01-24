<script setup lang="ts">
import { minutesToTime } from '@client/lib/utils.ts'
import { useCourseSearch } from '@client/stores/courseSearch'
import InSISDay from '@scraper/Types/InSISDay.ts'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'

const courseSearch = useCourseSearch()
const { timetableSelection, filter } = storeToRefs(courseSearch)

// Time configuration - InSIS timetable hours
const START_HOUR = 7 // 7:30
const END_HOUR = 20 // 20:00
const START_MINUTES = 30 // Start at 7:30
const SLOT_DURATION = 15 // 15-minute slots for finer granularity

// Generate time slots (every 15 minutes from 7:30 to 20:00)
const timeSlots = computed(() => {
	const slots: number[] = []
	for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
		const startMin = hour === START_HOUR ? START_MINUTES : 0
		const endMin = hour === END_HOUR ? 0 : 45
		for (let min = startMin; min <= endMin; min += SLOT_DURATION) {
			slots.push(hour * 60 + min)
		}
	}
	return slots
})

// Generate header hours (every 45/90 minutes like InSIS)
const headerTimes = computed(() => {
	const times: { minutes: number; label: string }[] = []
	// Standard InSIS time slots
	const insisSlots = [
		{ start: 450, end: 525 }, // 7:30-8:45
		{ start: 555, end: 645 }, // 9:15-10:45
		{ start: 660, end: 750 }, // 11:00-12:30
		{ start: 765, end: 855 }, // 12:45-14:15
		{ start: 870, end: 960 }, // 14:30-16:00
		{ start: 975, end: 1065 }, // 16:15-17:45
		{ start: 1020, end: 1110 }, // 17:00-18:30
		{ start: 1080, end: 1170 }, // 18:00-19:30
	]
	insisSlots.forEach(({ start }) => {
		times.push({
			minutes: start,
			label: minutesToTime(start),
		})
	})
	return times
})

// Drag selection state
const isDragging = ref(false)
const dragStart = ref<{ day: InSISDay; time: number } | null>(null)
const dragEnd = ref<{ day: InSISDay; time: number } | null>(null)
const showPopover = ref(false)
const popoverPosition = ref({ x: 0, y: 0 })

// Computed selection range
const selectionRange = computed(() => {
	if (!dragStart.value || !dragEnd.value) return null

	// Only allow selection within same day
	if (dragStart.value.day !== dragEnd.value.day) return null

	const minTime = Math.min(dragStart.value.time, dragEnd.value.time)
	const maxTime = Math.max(dragStart.value.time, dragEnd.value.time) + SLOT_DURATION

	return {
		day: dragStart.value.day,
		timeFrom: minTime,
		timeTo: maxTime,
	}
})

// Check if a cell is within selection
function isInSelection(day: InSISDay, time: number): boolean {
	if (!selectionRange.value) return false
	return selectionRange.value.day === day && time >= selectionRange.value.timeFrom && time < selectionRange.value.timeTo
}

// Check if a cell matches the current filter
function matchesFilter(day: InSISDay, time: number): boolean {
	const f = filter.value

	if (!f.include_times) return false

	return f.include_times.some((t) => t.day === day && time >= t.time_from && time < t.time_to)
}

// Mouse handlers
function handleMouseDown(day: InSISDay, time: number, event: MouseEvent) {
	isDragging.value = true
	dragStart.value = { day, time }
	dragEnd.value = { day, time }
	showPopover.value = false
	event.preventDefault()
}

function handleMouseMove(day: InSISDay, time: number) {
	if (!isDragging.value || !dragStart.value) return

	// Only allow dragging within same day
	if (day === dragStart.value.day) {
		dragEnd.value = { day, time }
	}
}

function handleMouseUp(event: MouseEvent) {
	if (!isDragging.value) return

	isDragging.value = false

	if (selectionRange.value) {
		// Update timetable selection in store
		timetableSelection.value = {
			day: selectionRange.value.day,
			timeFrom: selectionRange.value.timeFrom,
			timeTo: selectionRange.value.timeTo,
		}

		// Show popover near the selection
		popoverPosition.value = {
			x: event.clientX,
			y: event.clientY,
		}
		showPopover.value = true
	}
}

function handleMouseLeave() {
	if (isDragging.value) {
		isDragging.value = false
	}
}

// Apply selection as filter
function applyFilter() {
	if (selectionRange.value) {
		courseSearch.setDayFilter(selectionRange.value.day)
		courseSearch.setTimeFilter(selectionRange.value.timeFrom, selectionRange.value.timeTo)
		courseSearch.search()
	}
	showPopover.value = false
	clearSelection()
}

// Clear selection
function clearSelection() {
	dragStart.value = null
	dragEnd.value = null
	courseSearch.clearTimetableSelection()
	showPopover.value = false
}

// Clear time filter
function clearTimeFilter() {
	courseSearch.setDayFilter(null)
	courseSearch.setTimeFilter(null, null)
	courseSearch.search()
	clearSelection()
}

// Format selection for display
const selectionLabel = computed(() => {
	if (!selectionRange.value) return ''
	return `${selectionRange.value.day} ${minutesToTime(selectionRange.value.timeFrom)} - ${minutesToTime(selectionRange.value.timeTo)}`
})
</script>

<template>
	<div class="timetable-filter-wrapper">
		<div class="flex items-center justify-between mb-2">
			<span class="insis-label">Filtr podle rozvrhu</span>
			<button v-if="filter.include_times" class="insis-btn insis-btn-sm cursor-pointer" @click="clearTimeFilter">Zrušit časový filtr</button>
		</div>

		<p class="text-xs text-[var(--insis-gray-600)] mb-2">Táhněte myší pro výběr časového rozmezí, ve kterém hledáte předměty.</p>

		<div class="timetable-container overflow-x-auto" @mouseleave="handleMouseLeave" @mouseup="handleMouseUp">
			<table class="insis-timetable select-none">
				<thead>
					<tr>
						<th class="day-header">Den</th>
						<th v-for="time in headerTimes" :key="time.minutes" class="time-header">
							{{ time.label }}
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="day in Object.keys($tm('days')) as InSISDay[]" :key="day">
						<th class="day-header">{{ day }}</th>
						<td
							v-for="(time, index) in timeSlots"
							:key="time"
							class="time-slot"
							:class="{
								selecting: isDragging && isInSelection(day, time),
								selected: !isDragging && isInSelection(day, time),
								filtered: matchesFilter(day, time),
							}"
							:style="{
								width: `${100 / timeSlots.length}%`,
							}"
							@mousedown="handleMouseDown(day, time, $event)"
							@mousemove="handleMouseMove(day, time)"
						>
							<!-- Show time label for first slot of each hour -->
							<span
								v-if="index === 0 || (timeSlots[index - 1] !== undefined && Math.floor(timeSlots[index - 1]! / 60) !== Math.floor(time / 60))"
								class="slot-time-label"
							>
								{{ minutesToTime(time) }}
							</span>
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- Selection Popover -->
		<Teleport to="body">
			<div
				v-if="showPopover && selectionRange"
				class="insis-popover fixed z-50"
				:style="{
					left: `${popoverPosition.x}px`,
					top: `${popoverPosition.y + 10}px`,
				}"
			>
				<div class="insis-popover-title">Filtrovat předměty</div>
				<p class="text-sm mb-3">
					Hledat předměty v čase:<br />
					<strong>{{ selectionLabel }}</strong>
				</p>
				<div class="flex gap-2">
					<button class="insis-btn insis-btn-primary insis-btn-sm cursor-pointer" @click="applyFilter">Filtrovat</button>
					<button class="insis-btn insis-btn-sm cursor-pointer" @click="clearSelection">Zrušit</button>
				</div>
			</div>
		</Teleport>

		<!-- Legend -->
		<div class="insis-legend mt-2">
			<div class="insis-legend-content text-xs">
				<div class="insis-legend-item">
					<span class="w-4 h-4 bg-[var(--insis-block-selected)] border border-[var(--insis-border)]"></span>
					<span>Vybraný čas</span>
				</div>
				<div class="insis-legend-item">
					<span class="w-4 h-4 bg-[var(--insis-block-lecture)] border border-[var(--insis-border)]"></span>
					<span>Aktivní filtr</span>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.timetable-container {
	border: 1px solid var(--insis-border);
}

.time-slot {
	height: 40px;
	min-width: 20px;
	position: relative;
	transition: background-color 0.1s ease;
}

.time-slot:hover {
	background-color: var(--insis-row-hover);
}

.time-slot.selecting {
	background-color: rgba(179, 217, 255, 0.6);
}

.time-slot.selected {
	background-color: var(--insis-block-selected);
}

.time-slot.filtered {
	background-color: var(--insis-block-lecture);
}

.slot-time-label {
	position: absolute;
	top: 2px;
	left: 2px;
	font-size: 9px;
	color: var(--insis-gray-500);
	pointer-events: none;
}

.time-header {
	font-size: 10px;
	padding: 2px 4px;
	min-width: 60px;
}
</style>
