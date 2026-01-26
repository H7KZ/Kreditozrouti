<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTimeUtils } from '@client/composables'
import InSISDay from '@scraper/Types/InSISDay.ts'

/*
 * TimetableDragPopover
 * Popover displayed after drag selection on timetable.
 * Allows user to filter courses for the selected time slot.
 */

const { t, te } = useI18n({ useScope: 'global' })
const { minutesToTime } = useTimeUtils()

interface Position {
	x: number
	y: number
}

interface Selection {
	day: InSISDay | null
	timeFrom: number
	timeTo: number
}

interface Props {
	position: Position
	selection: Selection | null
}

interface Emits {
	(e: 'filter'): void
	(e: 'cancel'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const popoverRef = ref<HTMLElement | null>(null)

/** Day label translated */
const dayLabel = computed(() => {
	if (!props.selection?.day) return ''
	const key = `days.${props.selection.day}`
	return te(key) ? t(key) : props.selection.day
})

/** Formatted time range */
const timeRange = computed(() => {
	if (!props.selection) return ''
	return `${minutesToTime(props.selection.timeFrom)} - ${minutesToTime(props.selection.timeTo)}`
})

/** Duration in minutes */
const duration = computed(() => {
	if (!props.selection) return 0
	return props.selection.timeTo - props.selection.timeFrom
})

/** Duration formatted as hours:minutes */
const durationFormatted = computed(() => {
	const hours = Math.floor(duration.value / 60)
	const minutes = duration.value % 60
	if (hours === 0) return `${minutes} ${t('time.minutes')}`
	if (minutes === 0) return `${hours} ${t('time.hours')}`
	return t('time.hoursMinutes', { hours, minutes })
})

/** Calculate popover position with viewport bounds checking */
const popoverStyle = computed(() => {
	const POPOVER_WIDTH = 280
	const POPOVER_HEIGHT = 140
	const MARGIN = 16

	let x = props.position.x
	let y = props.position.y

	// Adjust X if overflowing right
	if (x + POPOVER_WIDTH + MARGIN > window.innerWidth) {
		x = window.innerWidth - POPOVER_WIDTH - MARGIN
	}

	// Adjust Y if overflowing bottom
	if (y + POPOVER_HEIGHT + MARGIN > window.innerHeight) {
		y = y - POPOVER_HEIGHT - 10
	}

	return {
		left: `${Math.max(MARGIN, x)}px`,
		top: `${Math.max(MARGIN, y)}px`,
	}
})

/** Handle click outside to cancel */
function handleClickOutside(event: MouseEvent) {
	if (popoverRef.value && !popoverRef.value.contains(event.target as Node)) {
		emit('cancel')
	}
}

/** Handle escape key to cancel */
function handleKeyDown(event: KeyboardEvent) {
	if (event.key === 'Escape') {
		emit('cancel')
	}
}

onMounted(() => {
	setTimeout(() => {
		document.addEventListener('click', handleClickOutside)
		document.addEventListener('keydown', handleKeyDown)
	}, 0)
})

onUnmounted(() => {
	document.removeEventListener('click', handleClickOutside)
	document.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
	<div ref="popoverRef" class="popover fixed z-50 w-[280px] rounded border border-[var(--insis-border)] bg-white shadow-lg" :style="popoverStyle">
		<!-- Header -->
		<div class="border-b border-[var(--insis-border)] bg-[var(--insis-header-bg)] px-3 py-2">
			<h3 class="text-sm font-medium text-[var(--insis-text)]">{{ $t('components.timetable.TimetableDragPopover.title') }}</h3>
		</div>

		<!-- Content -->
		<div class="p-3">
			<!-- Selected time info -->
			<div class="mb-3 space-y-1 text-sm">
				<div class="flex items-center justify-between">
					<span class="text-[var(--insis-gray-500)]">{{ $t('common.day') }}:</span>
					<span class="font-medium text-[var(--insis-text)]">{{ dayLabel }}</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-[var(--insis-gray-500)]">{{ $t('common.time') }}:</span>
					<span class="font-medium text-[var(--insis-text)]">{{ timeRange }}</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-[var(--insis-gray-500)]">{{ $t('common.duration') }}:</span>
					<span class="text-[var(--insis-gray-600)]">{{ durationFormatted }}</span>
				</div>
			</div>

			<!-- Description -->
			<p class="mb-3 text-xs text-[var(--insis-gray-500)]">{{ $t('components.timetable.TimetableDragPopover.description') }}</p>

			<!-- Actions -->
			<div class="flex items-center justify-end gap-2">
				<button type="button" class="insis-btn insis-btn-secondary text-sm" @click="emit('cancel')">{{ $t('common.cancel') }}</button>
				<button type="button" class="insis-btn insis-btn-primary text-sm flex items-center" @click="emit('filter')">
					<svg class="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
					{{ $t('components.timetable.TimetableDragPopover.searchCourses') }}
				</button>
			</div>
		</div>
	</div>
</template>

<style scoped>
.popover {
	animation: popover-in 0.15s ease-out;
}

@keyframes popover-in {
	from {
		opacity: 0;
		transform: translateY(-4px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}
</style>
