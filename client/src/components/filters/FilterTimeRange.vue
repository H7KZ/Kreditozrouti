<script setup lang="ts">
import { useTimeUtils } from '@client/composables'
import { WEEKDAYS } from '@client/constants/timetable'
import { useCoursesStore, useFiltersStore } from '@client/stores'
import type { InSISDay } from '@shared/domain/insis'
import type { TimeSelection } from '@shared/domain/time'
import { computed, ref, watch } from 'vue'
import IconPlus from '~icons/lucide/plus'
import IconX from '~icons/lucide/x'

/*
 * FilterTimeRange
 * Custom filter for selecting days and time ranges.
 * This is different from the generic facet filters.
 * Refactored to use composables for time utilities and formatting.
 */

const coursesStore = useCoursesStore()
const filtersStore = useFiltersStore()

// Composables
const { minutesToTime, timeToMinutes, formatTimeSelection, generateTimeOptions } = useTimeUtils()

// Local state for adding new time filter
const selectedDay = ref<InSISDay | ''>('')
const timeFrom = ref('09:15')
const timeTo = ref('14:15')
const showAddForm = ref(false)

// Ensure timeFrom is always less than timeTo
watch(timeFrom, (newFrom) => {
	const fromMins = timeToMinutes(newFrom)
	const toMins = timeToMinutes(timeTo.value)
	if (fromMins >= toMins) {
		// Set to time to 1 hour after from time, capped at 19:30
		const newToMins = Math.min(fromMins + 60, 19 * 60 + 30)
		timeTo.value = minutesToTime(newToMins)
	}
})

// Ensure timeTo is always greater than timeFrom
watch(timeTo, (newTo) => {
	const toMins = timeToMinutes(newTo)
	const fromMins = timeToMinutes(timeFrom.value)
	if (toMins <= fromMins) {
		// Set from time to 1 hour before to time, floored at 7:30
		const newFromMins = Math.max(toMins - 60, 7 * 60 + 30)
		timeFrom.value = minutesToTime(newFromMins)
	}
})

// Time options using composable (interval, start, end)
const timeOptions = computed(() => generateTimeOptions(15, 7 * 60 + 30, 19 * 60 + 30))

// Active time filters (combined include + exclude)
const activeTimeFilters = computed(() => {
	const include =
		filtersStore.filters.include_times?.map((t, i) => ({
			...t,
			type: 'include' as const,
			index: i,
		})) ?? []
	const exclude =
		filtersStore.filters.exclude_times?.map((t, i) => ({
			...t,
			type: 'exclude' as const,
			index: i,
		})) ?? []
	return [...include, ...exclude]
})

function toggleDay(day: InSISDay) {
	selectedDay.value = selectedDay.value === day ? '' : day
}

function handleAddTimeFilter() {
	if (!selectedDay.value) return

	const fromMins = timeToMinutes(timeFrom.value)
	const toMins = timeToMinutes(timeTo.value)

	if (fromMins >= toMins) {
		// Invalid range
		return
	}

	const selection: TimeSelection = {
		day: selectedDay.value,
		time_from: fromMins,
		time_to: toMins,
	}

	filtersStore.addIncludeTime(selection)
	coursesStore.fetchCourses()

	// Reset form
	selectedDay.value = ''
	showAddForm.value = false
}

function handleRemoveTimeFilter(type: 'include' | 'exclude', index: number) {
	if (type === 'include') {
		filtersStore.removeIncludeTime(index)
	} else {
		filtersStore.removeExcludeTime(index)
	}
	coursesStore.fetchCourses()
}

function handleClearAllTimeFilers() {
	filtersStore.clearIncludeTimes()
	filtersStore.clearExcludeTimes()
	coursesStore.fetchCourses()
}

// Format filter for display using composable
function formatFilter(filter: TimeSelection): string {
	return formatTimeSelection(filter)
}
</script>

<template>
	<div>
		<div class="mb-2 flex items-center justify-between">
			<button
				v-if="activeTimeFilters.length > 0"
				type="button"
				class="text-xs cursor-pointer text-[var(--insis-link)] hover:underline"
				@click="handleClearAllTimeFilers"
			>
				{{ $t('common.clearFilter') }}
			</button>
		</div>

		<!-- Active time filters -->
		<div v-if="activeTimeFilters.length > 0" class="mb-3 space-y-1">
			<div
				v-for="filter in activeTimeFilters"
				:key="`${filter.type}-${filter.index}`"
				:class="[
					'flex items-center justify-between rounded px-2 py-1 text-xs',
					filter.type === 'include' ? 'bg-[var(--insis-success-light)]' : 'bg-[var(--insis-danger-light)]',
				]"
			>
				<span>
					{{ filter.type === 'include' ? '✓' : '✗' }}
					{{ formatFilter(filter) }}
				</span>
				<button
					type="button"
					class="ml-2 cursor-pointer hover:text-[var(--insis-danger)]"
					:aria-label="$t('common.removeTimeFilter')"
					@click="handleRemoveTimeFilter(filter.type, filter.index)"
				>
					<IconX class="h-3 w-3" aria-hidden="true" />
				</button>
			</div>
		</div>

		<!-- Add filter button -->
		<button v-if="!showAddForm" type="button" class="insis-btn-text flex items-center gap-1 text-xs" @click="showAddForm = true">
			<IconPlus class="h-3 w-3" />
			{{ $t('components.filters.FilterTimeRange.addTimeFilter') }}
		</button>

		<!-- Add filter form -->
		<div v-else class="rounded border border-[var(--insis-border)] bg-white p-3">
			<!-- Day selection -->
			<div class="mb-3">
				<label class="mb-1 block text-xs text-[var(--insis-gray-600)]" id="day-selection-label">
					{{ $t('components.filters.FilterTimeRange.dayLabel') }}
				</label>
				<div class="flex" role="group" aria-labelledby="day-selection-label">
					<button
						v-for="day in WEEKDAYS"
						:key="day"
						type="button"
						:class="['insis-day-toggle', selectedDay === day && 'active']"
						:aria-pressed="selectedDay === day"
						:aria-label="$t(`days.${day}`)"
						@click="toggleDay(day)"
					>
						{{ $t(`daysShort.${day}`) }}
					</button>
				</div>
			</div>

			<!-- Time range -->
			<div class="mb-3 grid grid-cols-2 gap-2">
				<div>
					<label class="mb-1 block text-xs text-[var(--insis-gray-600)]" for="time-from"> {{ $t('common.from') }} </label>
					<select id="time-from" v-model="timeFrom" class="insis-select" :aria-label="$t('common.from')">
						<option v-for="opt in timeOptions" :key="opt.value" :value="opt.value">
							{{ opt.label }}
						</option>
					</select>
				</div>
				<div>
					<label class="mb-1 block text-xs text-[var(--insis-gray-600)]" for="time-to"> {{ $t('common.to') }} </label>
					<select id="time-to" v-model="timeTo" class="insis-select" :aria-label="$t('common.to')">
						<option v-for="opt in timeOptions" :key="opt.value" :value="opt.value">
							{{ opt.label }}
						</option>
					</select>
				</div>
			</div>

			<!-- Actions -->
			<div class="flex gap-2">
				<button type="button" class="insis-btn flex-1" @click="showAddForm = false">{{ $t('common.cancel') }}</button>
				<button type="button" class="insis-btn-primary flex-1" :disabled="!selectedDay" @click="handleAddTimeFilter">
					<IconPlus class="mr-1 inline h-3 w-3" aria-hidden="true" />
					{{ $t('common.add') }}
				</button>
			</div>
		</div>

		<!-- Time range slider hint -->
		<p class="mt-2 text-xs text-[var(--insis-gray-500)]">
			{{
				$t('components.filters.FilterTimeRange.availableRange', {
					from: minutesToTime(coursesStore.facets.time_range.min_time),
					to: minutesToTime(coursesStore.facets.time_range.max_time),
				})
			}}
		</p>
	</div>
</template>
