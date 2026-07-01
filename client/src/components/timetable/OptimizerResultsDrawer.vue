<script setup lang="ts">
import type { OptimizeResponseDTO, OptimizerCandidateDTO } from '@shared/http/optimize'
import type { OptimizerMode } from '@client/types/optimizer'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { MAX_POOL_SIZE } from '@shared/http/optimize'
import { useTimetableStore } from '@client/stores'
import TimetableGrid from '@client/components/timetable/TimetableGrid.vue'
import IconCalendarMinus2 from '~icons/lucide/calendar-minus-2'
import IconX from '~icons/lucide/x'

// Props & emits

interface Props {
	modelValue: boolean
	response: OptimizeResponseDTO | null
	mode: OptimizerMode
}

interface Emits {
	(e: 'update:modelValue', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { t } = useI18n()
const timetableStore = useTimetableStore()

// Active candidate

const activeCandidateIndex = ref(0)

watch(
	() => props.modelValue,
	open => {
		if (open) activeCandidateIndex.value = 0
	}
)

const candidates = computed<OptimizerCandidateDTO[]>(() => props.response?.candidates.slice(0, 5) ?? [])
const activeCandidate = computed<OptimizerCandidateDTO | null>(() => candidates.value[activeCandidateIndex.value] ?? null)

function selectCandidate(index: number) {
	activeCandidateIndex.value = index
}

// Score breakdown rows

interface ScoreRow {
	key: 'campus_conflicts' | 'gap_minutes' | 'off_preferred_days' | 'long_study_blocks'
	labelKey: string
	value: number
}

const scoreRows = computed<ScoreRow[]>(() => {
	const score = activeCandidate.value?.score
	if (!score) return []
	return [
		{ key: 'campus_conflicts', labelKey: 'components.timetable.OptimizerResultsDrawer.campusConflicts', value: score.campus_conflicts },
		{ key: 'gap_minutes', labelKey: 'components.timetable.OptimizerResultsDrawer.scheduleGaps', value: score.gap_minutes },
		{ key: 'off_preferred_days', labelKey: 'components.timetable.OptimizerResultsDrawer.offPreferredDays', value: score.off_preferred_days },
		{ key: 'long_study_blocks', labelKey: 'components.timetable.OptimizerResultsDrawer.longStudyBlocks', value: score.long_study_blocks }
	]
})

// Diff highlighting: units in changed_unit_ids get the success-light "added/changed" treatment,
// rendered as a small summary list since TimetableGrid has no per-unit class-override prop.
// changed_unit_ids does not distinguish "added" from "moved", so all changed units are treated
// as success-light (unit-card.selected) and unchanged units keep the default surface
// (unit-card, no modifier) — this is a documented simplification of the finer add-vs-move split.
interface DiffRow {
	unitId: number
	label: string
	changed: boolean
}

const diffRows = computed<DiffRow[]>(() => {
	const candidate = activeCandidate.value
	if (!candidate) return []
	const changedIds = new Set(candidate.changed_unit_ids)
	return candidate.units.map(unit => ({
		unitId: unit.unitId,
		label: `${unit.courseIdent} · ${unit.unitType ?? ''}`,
		changed: changedIds.has(unit.unitId)
	}))
})

// Apply

function close() {
	emit('update:modelValue', false)
}

function candidateMatchesCurrentSelection(candidate: OptimizerCandidateDTO): boolean {
	const currentSlotIds = new Set(timetableStore.selectedSlotIds)
	const candidateSlotIds = candidate.units.map(u => u.slotId)
	if (currentSlotIds.size !== candidateSlotIds.length) return false
	return candidateSlotIds.every(id => currentSlotIds.has(id))
}

function handleApply() {
	const candidate = activeCandidate.value
	if (!candidate) return

	const isAdditive = props.mode === 'add'
	const isIdenticalOrEmpty = timetableStore.selectedSlotIds.length === 0 || candidateMatchesCurrentSelection(candidate)

	if (!isAdditive && !isIdenticalOrEmpty) {
		if (!window.confirm(t('components.timetable.OptimizerResultsDrawer.replaceConfirm'))) return
	}

	timetableStore.loadUnits(candidate.units)
	close()
}
</script>

<template>
	<Teleport to="body">
		<div v-if="modelValue" class="insis-modal-backdrop" @click.self="close">
			<div class="insis-modal max-w-5xl">
				<!-- Header -->
				<div class="insis-modal-header">
					<h2 class="text-lg font-semibold text-(--insis-text)">
						{{ t('components.timetable.OptimizerResultsDrawer.title') }}
					</h2>
					<button
						type="button"
						class="insis-btn-text shrink-0"
						:aria-label="t('components.timetable.OptimizerResultsDrawer.cancel')"
						@click="close"
					>
						<IconX class="h-5 w-5" />
					</button>
				</div>

				<div class="insis-modal-body flex flex-col gap-4">
					<!-- Advisory notices -->
					<div
						v-if="response?.partial"
						class="rounded border border-(--insis-warning-border) bg-(--insis-warning-light) px-3 py-2 text-xs text-(--insis-warning)"
					>
						{{ t('components.timetable.OptimizerResultsDrawer.partialResultsNotice') }}
					</div>
					<div
						v-if="response?.pool_truncated"
						class="rounded border border-(--insis-warning-border) bg-(--insis-warning-light) px-3 py-2 text-xs text-(--insis-warning)"
					>
						{{ t('components.timetable.OptimizerResultsDrawer.poolTruncatedNotice', { count: MAX_POOL_SIZE }) }}
					</div>
					<div
						v-if="mode === 'add' && response?.unlocked_course_id"
						class="rounded border border-(--insis-warning-border) bg-(--insis-warning-light) px-3 py-2 text-xs text-(--insis-warning)"
					>
						{{ t('components.timetable.OptimizerResultsDrawer.unlockedCourseNotice') }}
					</div>

					<!-- Empty state -->
					<div v-if="candidates.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
						<div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-(--insis-gray-200)">
							<IconCalendarMinus2 class="h-7 w-7 text-(--insis-gray-500)" />
						</div>
						<p class="mb-1 text-[15px] font-medium text-(--insis-text)">
							{{
								mode === 'add' && response?.unlocked_course_id === undefined
									? t('components.timetable.OptimizerResultsDrawer.addModeUnsolvableTitle')
									: t('components.timetable.OptimizerResultsDrawer.emptyTitle')
							}}
						</p>
						<p class="text-sm text-(--insis-text-3)">
							{{
								mode === 'add' && response?.unlocked_course_id === undefined
									? t('components.timetable.OptimizerResultsDrawer.addModeUnsolvableBody')
									: t('components.timetable.OptimizerResultsDrawer.emptyBody')
							}}
						</p>
					</div>

					<!-- Candidate tabs + detail -->
					<template v-else>
						<nav class="insis-tabs">
							<button
								v-for="(candidate, index) in candidates"
								:key="index"
								type="button"
								class="insis-tab flex items-center gap-2"
								:class="{ 'insis-tab-active': activeCandidateIndex === index }"
								@click="selectCandidate(index)"
							>
								{{ t('components.timetable.OptimizerResultsDrawer.candidateTab', { n: index + 1 }) }}
								<span class="insis-badge insis-badge-blue">{{ Math.round(candidate.score.total) }}</span>
							</button>
						</nav>

						<div v-if="activeCandidate" class="flex flex-col gap-4 lg:flex-row">
							<div class="min-w-0 flex-1">
								<TimetableGrid
									:units="activeCandidate.units"
									:show-share="false"
									:show-export="false"
									:enable-drag="false"
									:enable-course-modal="false"
								/>
							</div>

							<div class="flex w-full flex-col gap-2 lg:w-64 lg:shrink-0">
								<p class="text-sm font-medium text-(--insis-text)">
									{{ t('components.timetable.OptimizerResultsDrawer.scoreBreakdown') }}
								</p>
								<div class="flex flex-col gap-1">
									<div
										v-for="row in scoreRows"
										:key="row.key"
										class="flex items-center justify-between rounded px-2 py-1 text-xs"
										:class="row.value === 0 ? 'bg-(--insis-success-light) text-(--insis-success)' : 'bg-(--insis-warning-light) text-(--insis-warning)'"
									>
										<span>{{ t(row.labelKey) }}</span>
										<span class="font-semibold">{{ row.value }}</span>
									</div>
								</div>

								<!-- Diff summary vs current selections -->
								<p class="mt-3 text-sm font-medium text-(--insis-text)">
									{{ t('components.timetable.OptimizerResultsDrawer.diffSummary') }}
								</p>
								<div class="flex flex-col gap-1">
									<div
										v-for="row in diffRows"
										:key="row.unitId"
										class="unit-card rounded px-2 py-1 text-xs"
										:class="{ selected: row.changed }"
									>
										{{ row.label }}
									</div>
								</div>
							</div>
						</div>
					</template>
				</div>

				<!-- Footer -->
				<div class="insis-modal-footer flex flex-col gap-2 sm:flex-row-reverse">
					<button
						v-if="activeCandidate"
						type="button"
						class="insis-btn insis-btn-primary text-sm"
						@click="handleApply"
					>
						{{ t('components.timetable.OptimizerResultsDrawer.useThisTimetable') }}
					</button>
					<button type="button" class="insis-btn insis-btn-secondary text-sm" @click="close">
						{{ t('components.timetable.OptimizerResultsDrawer.cancel') }}
					</button>
				</div>
			</div>
		</div>
	</Teleport>
</template>
