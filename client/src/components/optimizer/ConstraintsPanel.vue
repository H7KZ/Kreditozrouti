<script setup lang="ts">
import type { SolverConstraints } from '@kreditozrouti/core/http/optimize'
import type { Day } from '@kreditozrouti/core/domain/constants'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { WEEKDAYS } from '@client/constants/timetable'
import IconX from '~icons/lucide/x'

const props = defineProps<{
	modelValue: SolverConstraints
	basketEcts?: number
}>()

const emit = defineEmits<{
	(e: 'update:modelValue', v: SolverConstraints): void
}>()

const { t } = useI18n()

const creditMin = ref<number | null>(props.modelValue.credit_min ?? null)
const creditMax = ref<number | null>(props.modelValue.credit_max ?? null)
const preferredDays = ref<Day[]>([...(props.modelValue.preferred_days ?? [])])
const maxConsecutiveHours = ref<number | null>(props.modelValue.max_consecutive_minutes != null ? props.modelValue.max_consecutive_minutes / 60 : null)

interface BlackoutRow {
	day: Day
	timeFrom: string
	timeTo: string
}

function minutesToTime(m: number) {
	return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
function timeToMinutes(t: string): number {
	const [h, m] = t.split(':').map(Number)
	return isNaN(h) || isNaN(m) ? NaN : h * 60 + m
}

const blackoutWindows = ref<BlackoutRow[]>(
	(props.modelValue.blackout_windows ?? [])
		.filter(w => w.day != null)
		.map(w => ({ day: w.day as Day, timeFrom: minutesToTime(w.time_from), timeTo: minutesToTime(w.time_to) }))
)
const newBlackoutDays = ref<Day[]>([])
const newBlackoutFrom = ref('09:15')
const newBlackoutTo = ref('14:15')

// Auto-fill credits from basket when user hasn't set them
watch(
	() => props.basketEcts,
	ects => {
		if (ects == null) return
		if (creditMin.value == null) creditMin.value = ects
		if (creditMax.value == null) creditMax.value = ects
	},
	{ immediate: true }
)

const creditWarning = computed(() => {
	if (props.basketEcts == null) return false
	return creditMax.value != null && creditMax.value < props.basketEcts
})

function emitValue() {
	const constraints: SolverConstraints = {}
	if (creditMin.value != null && !isNaN(creditMin.value)) constraints.credit_min = creditMin.value
	if (creditMax.value != null && !isNaN(creditMax.value)) constraints.credit_max = creditMax.value
	if (preferredDays.value.length > 0) constraints.preferred_days = [...preferredDays.value]
	if (maxConsecutiveHours.value != null && !isNaN(maxConsecutiveHours.value)) constraints.max_consecutive_minutes = maxConsecutiveHours.value * 60
	if (blackoutWindows.value.length > 0)
		constraints.blackout_windows = blackoutWindows.value.map(w => ({
			day: w.day,
			time_from: timeToMinutes(w.timeFrom),
			time_to: timeToMinutes(w.timeTo)
		}))
	emit('update:modelValue', constraints)
}

watch([creditMin, creditMax, preferredDays, maxConsecutiveHours, blackoutWindows], emitValue, { deep: true })

function togglePreferredDay(day: Day) {
	const i = preferredDays.value.indexOf(day)
	if (i === -1) preferredDays.value.push(day)
	else preferredDays.value.splice(i, 1)
}

function toggleBlackoutDay(day: Day) {
	const i = newBlackoutDays.value.indexOf(day)
	if (i === -1) newBlackoutDays.value.push(day)
	else newBlackoutDays.value.splice(i, 1)
}

function addBlackout() {
	if (newBlackoutDays.value.length === 0) return
	const from = timeToMinutes(newBlackoutFrom.value)
	const to = timeToMinutes(newBlackoutTo.value)
	if (isNaN(from) || isNaN(to) || from >= to) return
	for (const day of newBlackoutDays.value) {
		blackoutWindows.value.push({ day, timeFrom: newBlackoutFrom.value, timeTo: newBlackoutTo.value })
	}
	newBlackoutDays.value = []
	newBlackoutFrom.value = '09:15'
	newBlackoutTo.value = '14:15'
}
</script>

<template>
	<div class="flex flex-col gap-6 p-4">
		<h3 class="text-sm font-semibold text-(--insis-text)">
			{{ t('components.optimizer.ConstraintsPanel.title') }}
		</h3>

		<!-- Credit range -->
		<fieldset>
			<legend class="mb-2 text-xs font-medium text-(--insis-text)">
				{{ t('components.optimizer.ConstraintsPanel.creditLimits') }}
			</legend>
			<div class="flex items-end gap-3">
				<label class="flex flex-col gap-1">
					<span class="text-xs text-(--insis-text-3)">{{ t('components.optimizer.ConstraintsPanel.creditMin') }}</span>
					<input v-model.number="creditMin" type="number" min="0" class="insis-input w-24" />
				</label>
				<span class="mb-2 text-sm text-(--insis-text-3)">–</span>
				<label class="flex flex-col gap-1">
					<span class="text-xs text-(--insis-text-3)">{{ t('components.optimizer.ConstraintsPanel.creditMax') }}</span>
					<input v-model.number="creditMax" type="number" min="0" class="insis-input w-24" />
				</label>
				<span v-if="basketEcts != null" class="mb-2 text-xs text-(--insis-text-3)">
					{{ t('components.optimizer.ConstraintsPanel.basketTotal', { n: basketEcts }) }}
				</span>
			</div>
			<p v-if="creditWarning" class="mt-1 text-xs text-(--insis-warning)">
				{{ t('components.optimizer.ConstraintsPanel.creditMaxWarning') }}
			</p>
		</fieldset>

		<!-- Preferred days -->
		<fieldset>
			<legend class="mb-2 text-xs font-medium text-(--insis-text)">
				{{ t('components.optimizer.ConstraintsPanel.preferredDays') }}
			</legend>
			<div class="flex gap-1">
				<button
					v-for="day in WEEKDAYS"
					:key="day"
					type="button"
					:class="['insis-day-toggle', preferredDays.includes(day) && 'active']"
					:aria-pressed="preferredDays.includes(day)"
					:aria-label="t(`days.${day}`)"
					@click="togglePreferredDay(day)"
				>
					{{ t(`daysShort.${day}`) }}
				</button>
			</div>
		</fieldset>

		<!-- Blackout windows -->
		<fieldset class="flex flex-col gap-2">
			<legend class="mb-2 text-xs font-medium text-(--insis-text)">
				{{ t('components.optimizer.ConstraintsPanel.blackoutWindows') }}
			</legend>

			<div v-if="blackoutWindows.length > 0" class="mb-1 flex flex-col gap-1">
				<div
					v-for="(w, i) in blackoutWindows"
					:key="`${w.day}-${w.timeFrom}`"
					class="flex items-center justify-between rounded bg-(--insis-danger-light) px-2 py-1 text-xs"
				>
					<span>{{ t(`days.${w.day}`) }} {{ w.timeFrom }}–{{ w.timeTo }}</span>
					<button
						type="button"
						class="ml-2 cursor-pointer hover:text-(--insis-danger)"
						:aria-label="t('common.removeTimeFilter')"
						@click="blackoutWindows.splice(i, 1)"
					>
						<IconX class="h-3 w-3" />
					</button>
				</div>
			</div>

			<div class="flex flex-wrap items-end gap-2">
				<div class="flex flex-col gap-1">
					<span class="text-xs text-(--insis-text-3)">{{ t('components.optimizer.ConstraintsPanel.blackoutDays') }}</span>
					<div class="flex gap-1">
						<button
							v-for="day in WEEKDAYS"
							:key="day"
							type="button"
							:class="['insis-day-toggle', newBlackoutDays.includes(day) && 'active']"
							:aria-pressed="newBlackoutDays.includes(day)"
							:aria-label="t(`days.${day}`)"
							@click="toggleBlackoutDay(day)"
						>
							{{ t(`daysShort.${day}`) }}
						</button>
					</div>
				</div>
				<label class="flex flex-col gap-1">
					<span class="text-xs text-(--insis-text-3)">{{ t('common.from') }}</span>
					<input v-model="newBlackoutFrom" type="time" class="insis-input" />
				</label>
				<label class="flex flex-col gap-1">
					<span class="text-xs text-(--insis-text-3)">{{ t('common.to') }}</span>
					<input v-model="newBlackoutTo" type="time" class="insis-input" />
				</label>
				<button type="button" class="insis-btn insis-btn-secondary self-end" :disabled="newBlackoutDays.length === 0" @click="addBlackout">
					{{ t('common.add') }}
				</button>
			</div>
		</fieldset>

		<!-- Max consecutive hours -->
		<label class="flex flex-col gap-1">
			<span class="text-xs font-medium text-(--insis-text)">
				{{ t('components.optimizer.ConstraintsPanel.maxConsecutiveHours') }}
			</span>
			<input v-model.number="maxConsecutiveHours" type="number" min="0" step="0.5" class="insis-input w-24" />
		</label>
	</div>
</template>
