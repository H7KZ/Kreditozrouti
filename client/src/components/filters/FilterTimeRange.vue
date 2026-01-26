<script setup lang="ts">
import { computed, ref } from 'vue'
import IconPlus from '~icons/lucide/plus'
import IconX from '~icons/lucide/x'
import { TimeSelection } from '@api/Validations'
import { DAYS_ORDER, DAYS_SHORT, useTimeUtils } from '@client/composables'
import { useCoursesStore } from '@client/stores'
import InSISDay from '@scraper/Types/InSISDay.ts'

/*
 * FilterTimeRange
 * Custom filter for selecting days and time ranges.
 * This is different from the generic facet filters.
 */

const coursesStore = useCoursesStore()
const { minutesToTime, timeToMinutes, formatTimeSelection } = useTimeUtils()

// Local state for adding new time filter
const selectedDay = ref<InSISDay | ''>('')
const timeFrom = ref('09:15')
const timeTo = ref('14:15')
const showAddForm = ref(false)

// Time options for select inputs (7:30 to 20:00 in 15-min increments)
const timeOptions = computed(() => {
	const options: { value: string; label: string }[] = []
	for (let mins = 7 * 60 + 30; mins <= 20 * 60; mins += 15) {
		const time = minutesToTime(mins)
		options.push({ value: time, label: time })
	}
	return options
})

// Active time filters (combined include + exclude)
const activeTimeFilters = computed(() => {
	const include =
		coursesStore.filters.include_times?.map((t, i) => ({
			...t,
			type: 'include' as const,
			index: i,
		})) ?? []
	const exclude =
		coursesStore.filters.exclude_times?.map((t, i) => ({
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

	coursesStore.addIncludeTime(selection)
	coursesStore.fetchCourses()

	// Reset form
	selectedDay.value = ''
	showAddForm.value = false
}

function handleRemoveTimeFilter(type: 'include' | 'exclude', index: number) {
	if (type === 'include') {
		coursesStore.removeIncludeTime(index)
	} else {
		coursesStore.removeExcludeTime(index)
	}
	coursesStore.fetchCourses()
}

function handleClearAllTimeFilers() {
	coursesStore.clearIncludeTimes()
	coursesStore.clearExcludeTimes()
	coursesStore.fetchCourses()
}
</script>

<template>
	<div>
		<div class="mb-2 flex items-center justify-between">
			<button
				v-if="activeTimeFilters.length > 0"
				type="button"
				class="text-xs text-[var(--insis-link)] hover:underline"
				@click="handleClearAllTimeFilers"
			>
				{{ $t('common.clearAll') }}
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
					{{ formatTimeSelection(filter) }}
				</span>
				<button type="button" class="ml-2 cursor-pointer hover:text-[var(--insis-danger)]" @click="handleRemoveTimeFilter(filter.type, filter.index)">
					<IconX class="h-3 w-3" />
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
				<label class="mb-1 block text-xs text-[var(--insis-gray-600)]"> {{ $t('components.filters.FilterTimeRange.dayLabel') }} </label>
				<div class="flex">
					<button
						v-for="day in DAYS_ORDER.slice(0, 5)"
						:key="day"
						type="button"
						:class="['insis-day-toggle', selectedDay === day && 'active']"
						@click="toggleDay(day)"
					>
						{{ DAYS_SHORT[day] }}
					</button>
				</div>
			</div>

			<!-- Time range -->
			<div class="mb-3 grid grid-cols-2 gap-2">
				<div>
					<label class="mb-1 block text-xs text-[var(--insis-gray-600)]"> {{ $t('common.from') }} </label>
					<select v-model="timeFrom" class="insis-select">
						<option v-for="opt in timeOptions" :key="opt.value" :value="opt.value">
							{{ opt.label }}
						</option>
					</select>
				</div>
				<div>
					<label class="mb-1 block text-xs text-[var(--insis-gray-600)]"> {{ $t('common.to') }} </label>
					<select v-model="timeTo" class="insis-select">
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
					<IconPlus class="mr-1 inline h-3 w-3" />
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
