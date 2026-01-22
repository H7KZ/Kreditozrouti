<script setup lang="ts">
import { TimetableSlot } from '@api/Interfaces/Timetable.ts'
import { TIMETABLE_END_HOUR, TIMETABLE_START_HOUR, useTimeTableStore } from '@client/stores/timetable.ts'
import InSISDay from '@scraper/Types/InSISDay.ts'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
	defineProps<{
		slots?: TimetableSlot[]
		readonly?: boolean
		showExclusions?: boolean
	}>(),
	{
		slots: () => [],
		readonly: false,
		showExclusions: true,
	},
)

const emit = defineEmits<{
	(e: 'selection-complete', selection: { days: InSISDay[]; time_from: number; time_to: number }): void
	(e: 'slot-click', slot: TimetableSlot): void
}>()

const { t } = useI18n()
const timetableStore = useTimeTableStore()
const containerRef = ref<HTMLElement | null>(null)

// Day labels in Czech
const dayLabels: Record<InSISDay, string> = {
	Po: 'Pondělí',
	Út: 'Úterý',
	St: 'Středa',
	Čt: 'Čtvrtek',
	Pá: 'Pátek',
}

// Generate time labels for header
const timeLabels = computed(() => {
	const labels: { time: number; label: string }[] = []
	for (let hour = TIMETABLE_START_HOUR; hour <= TIMETABLE_END_HOUR; hour++) {
		labels.push({
			time: hour * 60,
			label: `${hour}:00`,
		})
	}
	return labels
})

// Get hour cells for the grid
const hourCells = computed(() => {
	const cells: number[] = []
	for (let hour = TIMETABLE_START_HOUR; hour < TIMETABLE_END_HOUR; hour++) {
		cells.push(hour * 60)
	}
	return cells
})

// Mouse/touch handlers for drag selection
function onCellMouseDown(day: InSISDay, timeSlot: number, event: MouseEvent) {
	if (props.readonly) return
	event.preventDefault()
	timetableStore.startDrag({ day, timeSlot })
}

function onCellMouseEnter(day: InSISDay, timeSlot: number) {
	if (props.readonly || !timetableStore.dragSelection.isActive) return
	timetableStore.updateDrag({ day, timeSlot })
}

function onMouseUp() {
	if (props.readonly || !timetableStore.dragSelection.isActive) return

	const bounds = timetableStore.currentSelectionBounds
	if (bounds) {
		emit('selection-complete', bounds)
	}
	timetableStore.endDrag()
}

function onSlotClick(slot: TimetableSlot, event: MouseEvent) {
	event.stopPropagation()
	emit('slot-click', slot)
}

// Get slot style for absolute positioning
function getSlotStyle(slot: TimetableSlot) {
	const cellWidth = 100 / (TIMETABLE_END_HOUR - TIMETABLE_START_HOUR)
	const left = ((slot.time_from - TIMETABLE_START_HOUR * 60) / 60) * cellWidth
	const width = ((slot.time_to - slot.time_from) / 60) * cellWidth

	return {
		left: `${left}%`,
		width: `${width}%`,
	}
}

// Get slot type class
function getSlotTypeClass(): string {
	return 'insis-schedule-lecture'
}

// Global mouse up listener
onMounted(() => {
	document.addEventListener('mouseup', onMouseUp)
})

onUnmounted(() => {
	document.removeEventListener('mouseup', onMouseUp)
})
</script>

<template>
	<div class="timetable-wrapper" ref="containerRef">
		<div class="insis-schedule">
			<!-- Time header -->
			<div class="schedule-header">
				<div class="schedule-corner">{{ t('timetable.day') }}</div>
				<div class="schedule-times">
					<div v-for="label in timeLabels" :key="label.time" class="schedule-time-label">
						{{ label.label }}
					</div>
				</div>
			</div>

			<!-- Days rows -->
			<div v-for="day in timetableStore.days" :key="day" class="schedule-row">
				<div class="schedule-day-label">
					<span class="day-short">{{ day }}</span>
					<span class="day-full">{{ dayLabels[day] }}</span>
				</div>

				<div class="schedule-day-cells">
					<!-- Hour cells for grid -->
					<div
						v-for="hour in hourCells"
						:key="hour"
						class="schedule-hour-cell"
						:class="{
							selecting: timetableStore.isCellInSelection(day, hour),
							selected: timetableStore.isCellSelected(day, hour),
							excluded: showExclusions && timetableStore.isTimeExcluded(day, hour),
						}"
						@mousedown="onCellMouseDown(day, hour, $event)"
						@mouseenter="onCellMouseEnter(day, hour)"
					>
						<!-- Quarter divisions -->
						<div class="quarter-dividers">
							<span></span>
							<span></span>
							<span></span>
						</div>
					</div>

					<!-- Slots overlay -->
					<div class="schedule-slots-layer">
						<div
							v-for="slot in (slots || []).filter((s) => s.day === day)"
							:key="slot.slot_id"
							class="schedule-slot"
							:class="getSlotTypeClass()"
							:style="getSlotStyle(slot)"
							@click="onSlotClick(slot, $event)"
						>
							<div class="slot-content">
								<div class="slot-course">{{ slot.course_ident }}</div>
								<div class="slot-title">{{ slot.course_ident }}</div>
								<div class="slot-meta">
									<span v-if="slot.location">{{ slot.location }}</span>
									<span v-if="slot.lecturer">{{ slot.lecturer }}</span>
								</div>
							</div>
						</div>
					</div>

					<!-- Selection overlay -->
					<div
						v-if="timetableStore.dragSelection.isActive && timetableStore.currentSelectionBounds"
						class="insis-timetable-selection"
						:class="{ visible: timetableStore.currentSelectionBounds.days.includes(day) }"
					></div>
				</div>
			</div>
		</div>

		<!-- Selection info tooltip -->
		<Transition name="fade">
			<div v-if="timetableStore.currentSelectionBounds" class="selection-tooltip">
				{{ timetableStore.formatTime(timetableStore.currentSelectionBounds.time_from) }}
				–
				{{ timetableStore.formatTime(timetableStore.currentSelectionBounds.time_to) }}
			</div>
		</Transition>
	</div>
</template>

<style scoped>
.timetable-wrapper {
	position: relative;
	user-select: none;
}

.schedule-header {
	display: flex;
	border-bottom: 2px solid var(--color-insis-table-header);
}

.schedule-corner {
	width: 80px;
	flex-shrink: 0;
	padding: 8px;
	background: var(--color-insis-table-header);
	font-weight: 500;
	font-size: 12px;
	text-align: center;
}

.schedule-times {
	flex: 1;
	display: flex;
}

.schedule-time-label {
	flex: 1;
	padding: 8px 4px;
	background: var(--color-insis-table-header);
	font-size: 11px;
	text-align: left;
	border-left: 1px solid rgba(0, 0, 0, 0.1);
}

.schedule-row {
	display: flex;
	border-bottom: 1px solid #ddd;
	min-height: 60px;
}

.schedule-day-label {
	width: 80px;
	flex-shrink: 0;
	padding: 8px;
	background: var(--color-insis-table-row-even);
	display: flex;
	flex-direction: column;
	justify-content: center;
}

.day-short {
	font-weight: bold;
	font-size: 14px;
}

.day-full {
	font-size: 11px;
	color: #666;
}

.schedule-day-cells {
	flex: 1;
	display: flex;
	position: relative;
}

.schedule-hour-cell {
	flex: 1;
	border-left: 1px solid #e0e0e0;
	background: white;
	cursor: crosshair;
	position: relative;
	transition: background-color 0.1s;
}

.schedule-hour-cell:hover {
	background: rgba(0, 149, 213, 0.05);
}

.schedule-hour-cell.selecting {
	background: rgba(0, 149, 213, 0.2);
}

.schedule-hour-cell.selected {
	background: rgba(0, 149, 213, 0.15);
}

.schedule-hour-cell.excluded {
	background: repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(200, 0, 0, 0.08) 4px, rgba(200, 0, 0, 0.08) 8px);
}

.quarter-dividers {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	display: flex;
	pointer-events: none;
}

.quarter-dividers span {
	flex: 1;
	border-right: 1px dotted #eee;
}

.quarter-dividers span:last-child {
	border-right: none;
}

/* Slots layer */
.schedule-slots-layer {
	position: absolute;
	top: 2px;
	left: 0;
	right: 0;
	bottom: 2px;
	pointer-events: none;
}

.schedule-slot {
	position: absolute;
	top: 0;
	bottom: 0;
	border-radius: 4px;
	padding: 4px 6px;
	overflow: hidden;
	cursor: pointer;
	pointer-events: auto;
	border: 1px solid rgba(0, 0, 0, 0.15);
	transition:
		transform 0.1s,
		box-shadow 0.1s;
}

.schedule-slot:hover {
	transform: scale(1.02);
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	z-index: 10;
}

.slot-content {
	height: 100%;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.slot-course {
	font-weight: bold;
	font-size: 11px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.slot-title {
	font-size: 10px;
	line-height: 1.2;
	overflow: hidden;
	flex: 1;
}

.slot-meta {
	font-size: 9px;
	color: rgba(0, 0, 0, 0.6);
	margin-top: auto;
}

.slot-meta span {
	display: block;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

/* Selection tooltip */
.selection-tooltip {
	position: fixed;
	bottom: 20px;
	left: 50%;
	transform: translateX(-50%);
	background: var(--color-insis-header-bg);
	color: white;
	padding: 8px 16px;
	border-radius: 6px;
	font-size: 14px;
	font-weight: 500;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	z-index: 100;
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
