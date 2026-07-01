<script setup lang="ts">
import type { SolverConstraints } from '@shared/http/optimize'
import type { CourseWithRelationsDTO } from '@shared/http/responses'
import type { Day } from '@shared/domain/constants'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { WEEKDAYS } from '@client/constants/timetable'
import IconX from '~icons/lucide/x'

// Props & emits

interface Props {
	modelValue: boolean
	courses: CourseWithRelationsDTO[]
	initialConstraints?: SolverConstraints
}

interface Emits {
	(e: 'update:modelValue', value: boolean): void
	(e: 'generate', constraints: SolverConstraints): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { t } = useI18n()

// Local state mirroring every SolverConstraints field

const requiredCourseIds = ref<number[]>([])
const excludedCourseIds = ref<number[]>([])
const creditMin = ref<number | null>(null)
const creditMax = ref<number | null>(null)
const preferredDays = ref<Day[]>([])
const maxConsecutiveHours = ref<number | null>(null)

interface BlackoutWindowRow {
	day: Day
	timeFrom: string
	timeTo: string
}

const blackoutWindows = ref<BlackoutWindowRow[]>([])
const newBlackoutDay = ref<Day | ''>('')
const newBlackoutFrom = ref('09:15')
const newBlackoutTo = ref('14:15')

function timeToMinutes(time: string): number {
	const parts = time.split(':')
	if (parts.length < 2) return NaN
	const h = Number(parts[0])
	const m = Number(parts[1])
	return Number.isNaN(h) || Number.isNaN(m) ? NaN : h * 60 + m
}

function minutesToTime(minutes: number): string {
	return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function initFromConstraints() {
	const initial = props.initialConstraints
	requiredCourseIds.value = initial?.required_course_ids ? [...initial.required_course_ids] : []
	excludedCourseIds.value = initial?.excluded_course_ids ? [...initial.excluded_course_ids] : []
	creditMin.value = initial?.credit_min ?? null
	creditMax.value = initial?.credit_max ?? null
	preferredDays.value = initial?.preferred_days ? [...initial.preferred_days] : []
	maxConsecutiveHours.value = initial?.max_consecutive_minutes != null ? initial.max_consecutive_minutes / 60 : null
	blackoutWindows.value = (initial?.blackout_windows ?? []).map(w => ({
		day: w.day,
		timeFrom: minutesToTime(w.time_from),
		timeTo: minutesToTime(w.time_to)
	}))
	newBlackoutDay.value = ''
	newBlackoutFrom.value = '09:15'
	newBlackoutTo.value = '14:15'
}

watch(
	() => props.modelValue,
	open => {
		if (open) initFromConstraints()
	}
)

// Preferred days toggle

function togglePreferredDay(day: Day) {
	const index = preferredDays.value.indexOf(day)
	if (index === -1) {
		preferredDays.value.push(day)
	} else {
		preferredDays.value.splice(index, 1)
	}
}

// Blackout windows

function addBlackoutWindow() {
	if (!newBlackoutDay.value) return
	const fromMins = timeToMinutes(newBlackoutFrom.value)
	const toMins = timeToMinutes(newBlackoutTo.value)
	if (Number.isNaN(fromMins) || Number.isNaN(toMins)) return
	if (fromMins >= toMins) return

	blackoutWindows.value.push({
		day: newBlackoutDay.value,
		timeFrom: newBlackoutFrom.value,
		timeTo: newBlackoutTo.value
	})

	newBlackoutDay.value = ''
	newBlackoutFrom.value = '09:15'
	newBlackoutTo.value = '14:15'
}

function removeBlackoutWindow(index: number) {
	blackoutWindows.value.splice(index, 1)
}

// Actions

function close() {
	emit('update:modelValue', false)
}

function handleGenerate() {
	const constraints: SolverConstraints = {}

	if (requiredCourseIds.value.length > 0) constraints.required_course_ids = [...requiredCourseIds.value]
	if (excludedCourseIds.value.length > 0) constraints.excluded_course_ids = [...excludedCourseIds.value]
	if (creditMin.value != null && !Number.isNaN(creditMin.value)) constraints.credit_min = creditMin.value
	if (creditMax.value != null && !Number.isNaN(creditMax.value)) constraints.credit_max = creditMax.value
	if (preferredDays.value.length > 0) constraints.preferred_days = [...preferredDays.value]
	if (maxConsecutiveHours.value != null && !Number.isNaN(maxConsecutiveHours.value)) constraints.max_consecutive_minutes = maxConsecutiveHours.value * 60
	if (blackoutWindows.value.length > 0) {
		constraints.blackout_windows = blackoutWindows.value.map(w => ({
			day: w.day,
			time_from: timeToMinutes(w.timeFrom),
			time_to: timeToMinutes(w.timeTo)
		}))
	}

	emit('generate', constraints)
	close()
}
</script>

<template>
	<Teleport to="body">
		<div v-if="modelValue" class="insis-modal-backdrop" @click.self="close">
			<div class="insis-modal">
				<!-- Header -->
				<div class="insis-modal-header">
					<h2 class="text-lg font-semibold text-(--insis-text)">
						{{ t('components.timetable.OptimizerConstraintDrawer.title') }}
					</h2>
					<button
						type="button"
						class="insis-btn-text shrink-0"
						:aria-label="t('components.timetable.OptimizerConstraintDrawer.cancel')"
						@click="close"
					>
						<IconX class="h-5 w-5" />
					</button>
				</div>

				<div class="insis-modal-body flex flex-col gap-4">
					<!-- Required courses -->
					<fieldset class="flex flex-col gap-1">
						<legend class="mb-1 text-sm font-medium text-(--insis-text)">
							{{ t('components.timetable.OptimizerConstraintDrawer.requiredCourses') }}
						</legend>
						<select v-model="requiredCourseIds" multiple class="insis-input h-24">
							<option v-for="course in courses" :key="course.id" :value="course.id">
								{{ course.ident }} — {{ course.title }}
							</option>
						</select>
					</fieldset>

					<!-- Excluded courses -->
					<fieldset class="flex flex-col gap-1">
						<legend class="mb-1 text-sm font-medium text-(--insis-text)">
							{{ t('components.timetable.OptimizerConstraintDrawer.excludedCourses') }}
						</legend>
						<select v-model="excludedCourseIds" multiple class="insis-input h-24">
							<option v-for="course in courses" :key="course.id" :value="course.id">
								{{ course.ident }} — {{ course.title }}
							</option>
						</select>
					</fieldset>

					<!-- Credit min/max -->
					<div class="grid grid-cols-2 gap-2">
						<label class="flex flex-col gap-1">
							<span class="text-xs text-(--insis-text-3)">
								{{ t('components.timetable.OptimizerConstraintDrawer.creditMin') }}
							</span>
							<input v-model.number="creditMin" type="number" min="0" class="insis-input" />
						</label>
						<label class="flex flex-col gap-1">
							<span class="text-xs text-(--insis-text-3)">
								{{ t('components.timetable.OptimizerConstraintDrawer.creditMax') }}
							</span>
							<input v-model.number="creditMax" type="number" min="0" class="insis-input" />
						</label>
					</div>

					<!-- Preferred days -->
					<fieldset>
						<legend class="mb-1 text-sm font-medium text-(--insis-text)" id="preferred-days-label">
							{{ t('components.timetable.OptimizerConstraintDrawer.preferredDays') }}
						</legend>
						<div class="flex" role="group" aria-labelledby="preferred-days-label">
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
						<legend class="mb-1 text-sm font-medium text-(--insis-text)">
							{{ t('components.timetable.OptimizerConstraintDrawer.blackoutWindows') }}
						</legend>

						<div v-if="blackoutWindows.length > 0" class="flex flex-col gap-1">
							<div
								v-for="(window, index) in blackoutWindows"
								:key="`${window.day}-${window.timeFrom}-${window.timeTo}`"
								class="flex items-center justify-between rounded bg-(--insis-danger-light) px-2 py-1 text-xs"
							>
								<span>{{ t(`days.${window.day}`) }} {{ window.timeFrom }}–{{ window.timeTo }}</span>
								<button
									type="button"
									class="ml-2 cursor-pointer hover:text-(--insis-danger)"
									:aria-label="t('common.removeTimeFilter')"
									@click="removeBlackoutWindow(index)"
								>
									<IconX class="h-3 w-3" aria-hidden="true" />
								</button>
							</div>
						</div>

						<div class="flex flex-wrap items-end gap-2">
							<div class="flex" role="group" :aria-label="t('components.timetable.OptimizerConstraintDrawer.blackoutWindows')">
								<button
									v-for="day in WEEKDAYS"
									:key="day"
									type="button"
									:class="['insis-day-toggle', newBlackoutDay === day && 'active']"
									:aria-pressed="newBlackoutDay === day"
									:aria-label="t(`days.${day}`)"
									@click="newBlackoutDay = newBlackoutDay === day ? '' : day"
								>
									{{ t(`daysShort.${day}`) }}
								</button>
							</div>
							<label class="flex flex-col gap-1">
								<span class="text-xs text-(--insis-text-3)">{{ t('common.from') }}</span>
								<input v-model="newBlackoutFrom" type="time" class="insis-input" />
							</label>
							<label class="flex flex-col gap-1">
								<span class="text-xs text-(--insis-text-3)">{{ t('common.to') }}</span>
								<input v-model="newBlackoutTo" type="time" class="insis-input" />
							</label>
							<button type="button" class="insis-btn insis-btn-secondary" :disabled="!newBlackoutDay" @click="addBlackoutWindow">
								{{ t('common.add') }}
							</button>
						</div>
					</fieldset>

					<!-- Max consecutive hours -->
					<label class="flex flex-col gap-1">
						<span class="text-sm font-medium text-(--insis-text)">
							{{ t('components.timetable.OptimizerConstraintDrawer.maxConsecutiveHours') }}
						</span>
						<input v-model.number="maxConsecutiveHours" type="number" min="0" class="insis-input" />
					</label>
				</div>

				<!-- Footer -->
				<div class="insis-modal-footer flex flex-col gap-2 sm:flex-row-reverse">
					<button type="button" class="insis-btn insis-btn-primary text-sm" @click="handleGenerate">
						{{ t('components.timetable.OptimizerConstraintDrawer.generate') }}
					</button>
					<button type="button" class="insis-btn insis-btn-secondary text-sm" @click="close">
						{{ t('components.timetable.OptimizerConstraintDrawer.cancel') }}
					</button>
				</div>
			</div>
		</div>
	</Teleport>
</template>
