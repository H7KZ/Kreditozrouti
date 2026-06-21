<script setup lang="ts">
import type { MergedUnit } from '@client/composables'
import { isMergedUnit, useScheduleExport, useSlotMerging } from '@client/composables'
import type { SelectedCourseUnit } from '@client/types'
import type { InSISDay } from '@shared/domain/insis'
import { computed, ref, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import TimetableCourseModal from '@client/components/timetable/TimetableCourseModal.vue'
import { WEEKDAYS } from '@client/constants/timetable'
import { useTimetableStore } from '@client/stores'

const { locale } = useI18n()
const timetableStore = useTimetableStore()

const { mergedUnitsByDay } = useSlotMerging(toRef(() => timetableStore.unitsByDay))

const agendaRef = ref<HTMLElement | null>(null)
const { exportSchedule, exporting } = useScheduleExport(agendaRef)

// InSISDay values ARE the Czech names; map to English for en locale
const DAY_EN: Record<string, string> = {
	Pondělí: 'Monday',
	Úterý: 'Tuesday',
	Středa: 'Wednesday',
	Čtvrtek: 'Thursday',
	Pátek: 'Friday'
}

function dayLabel(day: InSISDay): string {
	return locale.value === 'en' ? (DAY_EN[day] ?? day) : day
}

interface DayData {
	day: InSISDay
	units: (SelectedCourseUnit | MergedUnit)[]
	hasUnits: boolean
	count: number
}

const agendaDays = computed<DayData[]>(() =>
	WEEKDAYS.map(day => {
		const units = [...(mergedUnitsByDay.value.get(day) ?? [])].sort((a, b) => a.timeFrom - b.timeFrom)
		return { day, units, hasUnits: units.length > 0, count: units.length }
	})
)

const hasAnyCourses = computed(() => agendaDays.value.some(d => d.hasUnits))

function hasConflict(unit: SelectedCourseUnit | MergedUnit): boolean {
	const ids = isMergedUnit(unit) ? unit.mergedSlotIds : [unit.slotId]
	return timetableStore.conflicts.some(([a, b]) => ids.includes(a.slotId) || ids.includes(b.slotId))
}

function formatTime(minutes: number): string {
	return `${Math.floor(minutes / 60)
		.toString()
		.padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}`
}

const UNIT_COLORS: Record<string, string> = {
	lecture: 'var(--insis-block-lecture)',
	exercise: 'var(--insis-block-exercise)',
	seminar: 'var(--insis-block-seminar)'
}

function borderColor(unit: SelectedCourseUnit | MergedUnit): string {
	return UNIT_COLORS[unit.unitType] ?? 'var(--insis-block-lecture)'
}

// Modal
const showModal = ref(false)
const modalUnit = ref<SelectedCourseUnit | null>(null)

function openModal(unit: SelectedCourseUnit | MergedUnit) {
	// MergedUnit has originalUnits[]; pass the first original unit to the modal
	// (TimetableCourseModal expects a SelectedCourseUnit, not a MergedUnit)
	modalUnit.value = isMergedUnit(unit) ? unit.originalUnits[0] : unit
	showModal.value = true
}

function closeModal() {
	showModal.value = false
	modalUnit.value = null
}
</script>

<template>
	<div ref="agendaRef" class="px-4 py-3">
		<!-- Export button (only when courses selected) -->
		<div v-if="timetableStore.selectedUnits.length > 0" class="mb-3 flex justify-end">
			<button
				type="button"
				:disabled="exporting"
				class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-(--insis-blue) ring-1 ring-(--insis-blue)/30 transition hover:bg-(--insis-blue)/8 disabled:opacity-50"
				@click="exportSchedule"
			>
				{{ exporting ? $t('pages.courses.emptyTimetable.exporting') : $t('pages.courses.emptyTimetable.export') }}
			</button>
		</div>

		<!-- Empty state -->
		<div v-if="!hasAnyCourses" class="flex flex-col items-center py-12 text-center">
			<p class="mb-1 text-[15px] font-medium text-(--insis-text)">
				{{ $t('pages.courses.emptyTimetable.title') }}
			</p>
			<p class="text-sm text-(--insis-text-3)">
				{{ $t('pages.courses.emptyTimetable.description') }}
			</p>
		</div>

		<!-- Day sections -->
		<template v-else>
			<div v-for="dayData in agendaDays" :key="dayData.day" class="mb-5">
				<div class="mb-2 flex items-center gap-2">
					<span class="text-xs font-bold tracking-wide uppercase" :class="dayData.hasUnits ? 'text-(--insis-blue)' : 'text-(--insis-text-3)'">
						{{ dayLabel(dayData.day) }}
					</span>
					<div class="h-px flex-1 bg-(--insis-border)" />
					<span class="text-xs text-(--insis-text-3)">
						<template v-if="dayData.hasUnits">{{ dayData.count }}×</template>
						<template v-else>{{ $t('components.timetable.TimetableAgenda.free') }}</template>
					</span>
				</div>

				<div v-if="dayData.hasUnits" class="space-y-2">
					<button
						v-for="unit in dayData.units"
						:key="isMergedUnit(unit) ? `merged-${unit.slotId}` : unit.slotId"
						type="button"
						class="flex min-h-[52px] w-full items-start gap-3 rounded-md border bg-(--insis-surface) px-3 py-2.5 text-left transition-colors active:bg-(--insis-surface-2)"
						:class="hasConflict(unit) ? 'border-(--insis-danger-border)' : 'border-(--insis-border)'"
						:style="{
							borderLeftWidth: '3px',
							borderLeftColor: hasConflict(unit) ? 'var(--insis-danger)' : borderColor(unit)
						}"
						@click="openModal(unit)"
					>
						<div class="min-w-0 flex-1">
							<div class="truncate text-sm font-semibold text-(--insis-text)">{{ unit.courseTitle }}</div>
							<div class="mt-0.5 text-xs text-(--insis-text-3)">
								{{ formatTime(unit.timeFrom) }} – {{ formatTime(unit.timeTo) }}
								<template v-if="unit.location"> · {{ unit.location }}</template>
							</div>
						</div>
						<div class="flex shrink-0 flex-col items-end gap-1 pt-0.5">
							<span
								class="rounded-full px-2 py-0.5 text-xs font-medium"
								:style="{
									color: borderColor(unit),
									background: `color-mix(in srgb, ${borderColor(unit)} 18%, transparent)`
								}"
							>
								{{ $t(`unitTypes.${unit.unitType}`, unit.unitType) }}
							</span>
							<span v-if="hasConflict(unit)" class="text-xs text-(--insis-danger)" role="img" :aria-label="$t('pages.courses.conflict')">⚠</span>
						</div>
					</button>
				</div>
			</div>
		</template>

		<TimetableCourseModal v-if="showModal && modalUnit" :unit="modalUnit" @close="closeModal" />
	</div>
</template>
