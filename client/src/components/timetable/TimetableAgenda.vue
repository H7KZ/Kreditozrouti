<script setup lang="ts">
import type { MergedUnit } from '@client/composables'
import { isMergedUnit, useScheduleExport, useShareTimetable, useSlotMerging } from '@client/composables'
import type { SelectedCourseUnit } from '@client/types'
import type { InSISDay } from '@shared/domain/insis'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import TimetableCourseModal from '@client/components/timetable/TimetableCourseModal.vue'
import { WEEKDAYS } from '@client/constants/timetable'
import { useAlertsStore, useTimetableStore } from '@client/stores'
import IconX from '~icons/lucide/x'

const props = withDefaults(
	defineProps<{
		units?: SelectedCourseUnit[]
		showShare?: boolean
		showExport?: boolean
		enableCourseModal?: boolean
	}>(),
	{ units: undefined, showShare: true, showExport: true, enableCourseModal: true }
)

const { locale, t } = useI18n()
const timetableStore = useTimetableStore()
const alertsStore = useAlertsStore()

const agendaRef = ref<HTMLElement | null>(null)
const { exportSchedule, exporting } = useScheduleExport(agendaRef)
const { sharing, shareTimetable } = useShareTimetable()

async function handleShare() {
	const units = props.units ?? timetableStore.selectedUnits
	const url = await shareTimetable(units)
	if (url) {
		alertsStore.addAlert({ type: 'success', title: t('components.timetable.TimetableGrid.shareCopied'), timeout: 4000 })
	} else if (!sharing.value) {
		alertsStore.addAlert({ type: 'error', title: t('components.timetable.TimetableGrid.shareError'), timeout: 6000 })
	}
}

const { mergedUnitsByDay } = useSlotMerging(
	computed(() => {
		if (props.units) {
			const map = new Map<InSISDay, SelectedCourseUnit[]>()
			for (const u of props.units) {
				if (!u.day) continue
				if (!map.has(u.day)) map.set(u.day, [])
				map.get(u.day)!.push(u)
			}
			return map
		}
		return timetableStore.unitsByDay
	})
)

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
	if (props.units) return false
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

function removeFromTimetable(unit: SelectedCourseUnit | MergedUnit) {
	if (window.innerWidth < 1024) {
		if (!window.confirm(t('components.timetable.TimetableAgenda.confirmRemove'))) return
	}
	if (isMergedUnit(unit)) {
		unit.originalUnits.forEach(u => timetableStore.removeUnit(u.unitId))
	} else {
		timetableStore.removeUnit(unit.unitId)
	}
}
</script>

<template>
	<div ref="agendaRef" class="px-4 py-3">
		<!-- Toolbar: share + export -->
		<div v-if="hasAnyCourses && (showShare || showExport)" class="mb-3 flex justify-end gap-2">
			<!-- Share button -->
			<button
				v-if="showShare"
				type="button"
				:disabled="sharing"
				class="flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-(--insis-blue) ring-1 ring-(--insis-blue)/30 transition hover:bg-(--insis-blue)/8 disabled:cursor-not-allowed disabled:opacity-50"
				@click="handleShare"
			>
				<i-lucide-share-2 v-if="!sharing" class="h-3.5 w-3.5" aria-hidden="true" />
				<i-lucide-loader-circle v-else class="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
				{{ sharing ? $t('components.timetable.TimetableGrid.sharing') : $t('components.timetable.TimetableGrid.share') }}
			</button>
			<!-- Export button -->
			<button
				v-if="showExport"
				type="button"
				:disabled="exporting"
				class="flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-(--insis-blue) ring-1 ring-(--insis-blue)/30 transition hover:bg-(--insis-blue)/8 disabled:cursor-not-allowed disabled:opacity-50"
				@click="exportSchedule"
			>
				<i-lucide-download v-if="!exporting" class="h-3.5 w-3.5" aria-hidden="true" />
				<i-lucide-loader-circle v-else class="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
				{{ exporting ? $t('components.timetable.TimetableAgenda.exporting') : $t('components.timetable.TimetableAgenda.saveAsImage') }}
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
					<div
						v-for="unit in dayData.units"
						:key="isMergedUnit(unit) ? `merged-${unit.slotId}` : unit.slotId"
						class="flex items-stretch overflow-hidden rounded-md border bg-(--insis-surface) transition-colors"
						:class="hasConflict(unit) ? 'border-(--insis-danger-border)' : 'border-(--insis-border)'"
						:style="{
							borderLeftWidth: '3px',
							borderLeftColor: hasConflict(unit) ? 'var(--insis-danger)' : borderColor(unit)
						}"
					>
						<button
							type="button"
							class="flex min-h-[52px] min-w-0 flex-1 items-start gap-3 overflow-hidden rounded-md px-3 py-2.5 text-left active:bg-(--insis-surface-2)"
							@click="enableCourseModal && openModal(unit)"
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
								<span v-if="hasConflict(unit)" class="text-xs text-(--insis-danger)" role="img" :aria-label="$t('pages.courses.conflict')"
									>⚠</span
								>
							</div>
						</button>
						<button
							v-if="enableCourseModal"
							type="button"
							class="flex shrink-0 items-start px-2 pt-2.5 text-(--insis-text-3) hover:text-(--insis-text)"
							:aria-label="$t('common.remove')"
							@click="removeFromTimetable(unit)"
						>
							<IconX class="h-3.5 w-3.5" aria-hidden="true" />
						</button>
					</div>
				</div>
			</div>
		</template>

		<TimetableCourseModal v-if="enableCourseModal && showModal && modalUnit" :unit="modalUnit" @close="closeModal" />
	</div>
</template>
