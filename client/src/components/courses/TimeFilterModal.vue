<script setup lang="ts">
import InSISDay from '@scraper/Types/InSISDay.ts'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

interface Props {
	open: boolean
	initialFrom?: number | null
	initialTo?: number | null
	initialDay?: InSISDay | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
	'update:open': [value: boolean]
	apply: [{ from: number | null; to: number | null; day: InSISDay | null }]
}>()

const { t, tm } = useI18n()

// Local state
const selectedDay = ref<InSISDay | null>(null)
const selectionStart = ref<{ day: InSISDay; time: number } | null>(null)
const selectionEnd = ref<{ day: InSISDay; time: number } | null>(null)
const isDragging = ref(false)

// Time slots (30 min intervals from 7:30 to 20:00)
const timeSlots = computed(() => {
	const slots: number[] = []
	for (let mins = 7 * 60 + 30; mins <= 20 * 60; mins += 30) {
		slots.push(mins)
	}
	return slots
})

const days: InSISDay[] = Object.keys(tm('days')) as InSISDay[]

// Reset on open
watch(
	() => props.open,
	(isOpen) => {
		if (isOpen) {
			// Initialize from props
			if (props.initialDay && props.initialFrom !== null && props.initialTo !== null) {
				selectionStart.value = { day: props.initialDay, time: props.initialFrom ?? 0 }
				selectionEnd.value = { day: props.initialDay, time: props.initialTo ?? 1440 }
				selectedDay.value = props.initialDay
			} else {
				selectionStart.value = null
				selectionEnd.value = null
				selectedDay.value = null
			}
		}
	},
)

// Format time for display
function formatTime(mins: number): string {
	const h = Math.floor(mins / 60)
	const m = mins % 60
	return `${h}:${m.toString().padStart(2, '0')}`
}

// Check if cell is in selection
function isInSelection(day: InSISDay, time: number): boolean {
	if (!selectionStart.value || !selectionEnd.value) return false
	if (day !== selectionStart.value.day) return false

	const minTime = Math.min(selectionStart.value.time, selectionEnd.value.time)
	const maxTime = Math.max(selectionStart.value.time, selectionEnd.value.time)

	return time >= minTime && time < maxTime + 30
}

// Mouse handlers for drag selection
function handleMouseDown(day: InSISDay, time: number) {
	isDragging.value = true
	selectionStart.value = { day, time }
	selectionEnd.value = { day, time }
	selectedDay.value = day
}

function handleMouseMove(day: InSISDay, time: number) {
	if (!isDragging.value || !selectionStart.value) return
	if (day !== selectionStart.value.day) return // Only allow single-day selection
	selectionEnd.value = { day, time }
}

function handleMouseUp() {
	isDragging.value = false
}

// Apply selection
function applySelection() {
	if (selectionStart.value && selectionEnd.value) {
		const minTime = Math.min(selectionStart.value.time, selectionEnd.value.time)
		const maxTime = Math.max(selectionStart.value.time, selectionEnd.value.time) + 30

		emit('apply', {
			from: minTime,
			to: maxTime,
			day: selectedDay.value,
		})
	}
	emit('update:open', false)
}

// Clear selection
function clearSelection() {
	selectionStart.value = null
	selectionEnd.value = null
	selectedDay.value = null
	emit('apply', { from: null, to: null, day: null })
	emit('update:open', false)
}

// Close modal
function close() {
	emit('update:open', false)
}
</script>

<template>
	<Teleport to="body">
		<div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="close" @mouseup="handleMouseUp">
			<div class="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden">
				<!-- Header -->
				<div class="px-6 py-4 border-b border-[#e5e7eb] flex items-center justify-between">
					<div>
						<h3 class="text-lg font-semibold text-[#1f2937]">
							{{ t('filters.calendarTitle') }}
						</h3>
						<p class="text-sm text-[#6b7280]">
							{{ t('filters.calendarDescription') }}
						</p>
					</div>
					<button class="text-[#6b7280] hover:text-[#1f2937] cursor-pointer" @click="close">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<!-- Calendar Grid -->
				<div class="p-6 overflow-auto">
					<div class="grid grid-cols-[auto_repeat(5,1fr)] gap-px bg-[#e5e7eb] border border-[#e5e7eb] select-none">
						<!-- Header row -->
						<div class="bg-[#f9fafb] p-2"></div>
						<div v-for="day in days" :key="day" class="bg-[#f9fafb] p-2 text-center text-sm font-medium text-[#374151]">
							{{ day }}
						</div>

						<!-- Time rows -->
						<template v-for="time in timeSlots" :key="time">
							<div class="bg-[#f9fafb] px-2 py-1 text-xs text-[#6b7280] text-right">
								{{ formatTime(time) }}
							</div>
							<div
								v-for="day in days"
								:key="`${day}-${time}`"
								class="bg-white h-6 cursor-crosshair transition-colors"
								:class="{
									'bg-[#4a7eb8] bg-opacity-30': isInSelection(day, time),
								}"
								@mousedown="handleMouseDown(day, time)"
								@mousemove="handleMouseMove(day, time)"
							/>
						</template>
					</div>

					<!-- Selection info -->
					<div v-if="selectionStart && selectionEnd" class="mt-4 p-3 bg-[#f0f7ff] rounded-lg">
						<p class="text-sm text-[#1e4a7a]">
							<strong>{{ t('filters.selectedTime') }}:</strong>
							{{ selectedDay }}
							{{ formatTime(Math.min(selectionStart.time, selectionEnd.time)) }}
							-
							{{ formatTime(Math.max(selectionStart.time, selectionEnd.time) + 30) }}
						</p>
					</div>
				</div>

				<!-- Footer -->
				<div class="px-6 py-4 border-t border-[#e5e7eb] flex justify-between">
					<button class="insis-btn cursor-pointer" @click="clearSelection">
						{{ t('filters.clearTimeFilter') }}
					</button>
					<div class="flex gap-2">
						<button class="insis-btn cursor-pointer" @click="close">
							{{ t('app.cancel') }}
						</button>
						<button class="insis-btn-primary cursor-pointer" :disabled="!selectionStart || !selectionEnd" @click="applySelection">
							{{ t('filters.applyTimeFilter') }}
						</button>
					</div>
				</div>
			</div>
		</div>
	</Teleport>
</template>
