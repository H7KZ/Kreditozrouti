<script setup lang="ts">
import { Course, CourseUnit, CourseUnitSlot } from '@api/Database/types'
import { minutesToTime } from '@client/lib/utils.ts'
import { useCourseFilters } from '@client/stores/courseFilters'
import { useTimetableStore } from '@client/stores/timetable'
import InSISDay from '@scraper/Types/InSISDay.ts'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

interface Props {
	mode?: 'view' | 'filter' // 'view' shows added courses, 'filter' allows drag selection
	startHour?: number
	endHour?: number
}

const props = withDefaults(defineProps<Props>(), {
	mode: 'view',
	startHour: 7,
	endHour: 20,
})

interface SlotWithCourse extends CourseUnitSlot {
	course: Course
	unit: CourseUnit
}

const emit = defineEmits<{
	slotClick: [slot: SlotWithCourse, event: MouseEvent]
	filterApply: [data: { day: InSISDay; from: number; to: number }]
}>()

const { t, tm, locale } = useI18n()
const timetable = useTimetableStore()
const filters = useCourseFilters()

// Days of the week
const days = tm('days')

// Generate time slots (15 min intervals for precise drag selection)
const timeSlots = computed(() => {
	const slots: number[] = []
	const startMinutes = props.startHour === 7 ? 30 : 0 // Start at 7:30 for InSIS
	for (let hour = props.startHour; hour <= props.endHour; hour++) {
		const startMin = hour === props.startHour ? startMinutes : 0
		const endMin = hour === props.endHour ? 0 : 45
		for (let min = startMin; min <= endMin; min += 15) {
			slots.push(hour * 60 + min)
		}
	}
	return slots
})

// Calculate grid dimensions
const SLOT_HEIGHT = 12 // pixels per 15 min slot
const DAY_WIDTH = 140 // pixels per day column

// Drag selection state
const isDragging = ref(false)
const dragStart = ref<{ day: InSISDay; time: number } | null>(null)
const dragEnd = ref<{ day: InSISDay; time: number } | null>(null)

// Selection range
const selectionRange = computed(() => {
	if (!dragStart.value || !dragEnd.value) return null
	if (dragStart.value.day !== dragEnd.value.day) return null

	const minTime = Math.min(dragStart.value.time, dragEnd.value.time)
	const maxTime = Math.max(dragStart.value.time, dragEnd.value.time) + 15

	return {
		day: dragStart.value.day,
		timeFrom: minTime,
		timeTo: maxTime,
	}
})

// Check if cell is in drag selection
function isInDragSelection(day: InSISDay, time: number): boolean {
	if (!selectionRange.value) return false
	return selectionRange.value.day === day && time >= selectionRange.value.timeFrom && time < selectionRange.value.timeTo
}

// Calculate slot position and size
function getSlotStyle(slot: SlotWithCourse) {
	const dayIndex = Object.keys(days).indexOf(slot.day || 'Po')
	if (dayIndex === -1) return { display: 'none' }

	const startMinutes = props.startHour === 7 ? 30 : 0
	const gridStartTime = props.startHour * 60 + startMinutes

	const top = ((slot.time_from! - gridStartTime) / 15) * SLOT_HEIGHT
	const height = ((slot.time_to! - slot.time_from!) / 15) * SLOT_HEIGHT
	const left = dayIndex * DAY_WIDTH + 1

	return {
		position: 'absolute' as const,
		top: `${top}px`,
		height: `${height}px`,
		left: `${left}px`,
		width: `${DAY_WIDTH - 2}px`,
		zIndex: 10,
	}
}

// Get color for slot based on course
function getSlotColor(slot: SlotWithCourse): string {
	const colors = [
		'bg-blue-100 border-l-blue-400 text-blue-900',
		'bg-green-100 border-l-green-400 text-green-900',
		'bg-purple-100 border-l-purple-400 text-purple-900',
		'bg-amber-100 border-l-amber-400 text-amber-900',
		'bg-rose-100 border-l-rose-400 text-rose-900',
		'bg-cyan-100 border-l-cyan-400 text-cyan-900',
		'bg-indigo-100 border-l-indigo-400 text-indigo-900',
	]

	return colors[slot.course.id % colors.length] || 'bg-gray-100 border-l-gray-400 text-gray-900'
}

// Get course name
function getCourseName(course: Course): string {
	if (locale.value === 'cs' && course.czech_title) return course.czech_title
	return course.title || course.ident
}

// Mouse handlers for drag selection
function handleMouseDown(day: InSISDay, time: number, event: MouseEvent) {
	if (props.mode !== 'filter') return
	event.preventDefault()

	isDragging.value = true
	dragStart.value = { day, time }
	dragEnd.value = { day, time }
}

function handleMouseMove(day: InSISDay, time: number) {
	if (!isDragging.value || !dragStart.value) return
	// Only allow single-day selection
	if (day !== dragStart.value.day) return

	dragEnd.value = { day, time }
}

function handleMouseUp() {
	if (!isDragging.value || !selectionRange.value) {
		isDragging.value = false
		dragStart.value = null
		dragEnd.value = null
		return
	}

	// Apply filter
	filters.setTimeFilter(selectionRange.value.timeFrom, selectionRange.value.timeTo, selectionRange.value.day)

	emit('filterApply', {
		day: selectionRange.value.day,
		from: selectionRange.value.timeFrom,
		to: selectionRange.value.timeTo,
	})

	// Reset drag state
	isDragging.value = false
	dragStart.value = null
	dragEnd.value = null
}

// Handle slot click
function handleSlotClick(slot: SlotWithCourse, event: MouseEvent) {
	if (props.mode === 'view') {
		emit('slotClick', slot, event)
	}
}

// Global mouse up handler
function handleGlobalMouseUp() {
	if (isDragging.value) {
		handleMouseUp()
	}
}

onMounted(() => {
	window.addEventListener('mouseup', handleGlobalMouseUp)
})

onUnmounted(() => {
	window.removeEventListener('mouseup', handleGlobalMouseUp)
})

// Grid container height
const gridHeight = computed(() => {
	return timeSlots.value.length * SLOT_HEIGHT
})
</script>

<template>
	<div class="timetable-grid">
		<!-- Header hint for filter mode -->
		<div v-if="mode === 'filter'" class="mb-3 p-2 bg-[#f0f7ff] rounded border border-[#4a7eb8]/20 text-sm text-[#1e4a7a]">
			<div class="flex items-center gap-2">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				{{ t('timetable.dragHint') }}
			</div>
		</div>

		<!-- Grid container -->
		<div class="relative border border-[#d1d5db] rounded-lg overflow-hidden bg-white">
			<!-- Day headers -->
			<div class="flex border-b border-[#d1d5db] bg-[#e8eef5]">
				<div class="w-16 flex-shrink-0 p-2 text-xs font-semibold text-[#6b7280] border-r border-[#d1d5db]">
					<!-- Time column header -->
				</div>
				<div
					v-for="day in days"
					:key="day"
					class="flex-1 p-2 text-center text-sm font-semibold text-[#374151] border-r border-[#d1d5db] last:border-r-0"
					:style="{ minWidth: `${DAY_WIDTH}px` }"
				>
					{{ t(`timetable.days.${day}`) }}
				</div>
			</div>

			<!-- Time grid -->
			<div class="flex">
				<!-- Time labels -->
				<div class="w-16 flex-shrink-0 border-r border-[#d1d5db]">
					<div
						v-for="time in timeSlots"
						:key="time"
						class="text-xs text-right text-[#6b7280] border-b border-[#f3f4f6] flex items-start justify-end pt-1 pr-2"
						:style="{ height: `${SLOT_HEIGHT}px` }"
					>
						<span v-if="time % 60 === 0">{{ minutesToTime(time) }}</span>
					</div>
				</div>

				<!-- Day columns with cells -->
				<div class="flex-1 relative" :style="{ minWidth: `${DAY_WIDTH * days.length}px`, height: `${gridHeight}px` }">
					<!-- Background grid -->
					<div class="absolute inset-0 flex">
						<div v-for="day in days" :key="day" class="border-r border-[#f3f4f6] last:border-r-0" :style="{ width: `${DAY_WIDTH}px` }">
							<div
								v-for="time in timeSlots"
								:key="time"
								class="border-b border-[#f3f4f6] transition-colors"
								:class="{
									'cursor-crosshair hover:bg-[#f0f7ff]': mode === 'filter',
									'bg-[#4a7eb8] bg-opacity-20': isInDragSelection(day, time),
								}"
								:style="{ height: `${SLOT_HEIGHT}px` }"
								@mousedown="handleMouseDown(day, time, $event)"
								@mousemove="handleMouseMove(day, time)"
							/>
						</div>
					</div>

					<!-- Slots overlay (view mode) -->
					<div v-if="mode === 'view'" class="absolute inset-0">
						<div
							v-for="slot in timetable.allSlots"
							:key="`${slot.unit?.id}-${slot.id}`"
							:style="getSlotStyle(slot as SlotWithCourse)"
							class="rounded border-l-4 p-1.5 overflow-hidden cursor-pointer transition-shadow hover:shadow-md"
							:class="getSlotColor(slot as SlotWithCourse)"
							@click="handleSlotClick(slot as SlotWithCourse, $event)"
						>
							<div class="text-xs font-semibold truncate">
								{{ slot.course?.ident }}
							</div>
							<div class="text-xs truncate opacity-75">
								{{ getCourseName(slot.course!) }}
							</div>
							<div class="text-xs truncate opacity-60">{{ minutesToTime(slot.time_from!) }}-{{ minutesToTime(slot.time_to!) }}</div>
							<div v-if="slot.location" class="text-xs truncate opacity-60">
								{{ slot.location }}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Stats (view mode) -->
		<div v-if="mode === 'view' && !timetable.isEmpty" class="mt-4 flex items-center justify-between text-sm text-[#6b7280]">
			<div>
				{{ timetable.allEntries.length }}
				{{ timetable.allEntries.length === 1 ? t('courses.unitSingular') : t('courses.unitPlural') }}
				{{ t('timetable.inTimetable') }}
			</div>
			<div class="font-medium">{{ t('timetable.totalCredits') }}: {{ timetable.totalCredits }} {{ t('courseTable.columns.credits').toLowerCase() }}</div>
		</div>

		<!-- Empty state (view mode) -->
		<div v-if="mode === 'view' && timetable.isEmpty" class="mt-8 text-center py-8 text-[#6b7280]">
			<svg class="w-16 h-16 mx-auto mb-4 text-[#d1d5db]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="1.5"
					d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
				/>
			</svg>
			<p class="text-lg font-medium mb-2">{{ t('timetable.empty') }}</p>
		</div>
	</div>
</template>

<style scoped>
.timetable-grid {
	user-select: none;
}
</style>
