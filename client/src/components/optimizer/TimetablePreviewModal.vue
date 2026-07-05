<script setup lang="ts">
import type { OptimizerCandidateDTO } from '@kreditozrouti/core/http/optimize'
import type { SelectedCourseUnit } from '@client/types'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import TimetableGrid from '@client/components/timetable/TimetableGrid.vue'
import IconX from '~icons/lucide/x'

const props = defineProps<{
	candidate: OptimizerCandidateDTO
	currentUnitIds: Set<number>
	title?: string
}>()

const emit = defineEmits<{
	(e: 'apply'): void
	(e: 'close'): void
}>()

const { t } = useI18n()

// Units in this candidate not already in the current timetable → amber ring
const highlightUnitIds = computed(() => props.candidate.units.filter(u => !props.currentUnitIds.has(u.unitId)).map(u => u.unitId))

// Cast SelectedCourseUnitDTO → SelectedCourseUnit (same shape, compatible)
const units = computed(() => props.candidate.units as unknown as SelectedCourseUnit[])

const score = computed(() => props.candidate.score)
</script>

<template>
	<Teleport to="body">
		<div class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" @click.self="emit('close')">
			<div class="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-(--insis-surface) shadow-2xl">
				<!-- Header -->
				<div class="flex items-center justify-between gap-4 border-b border-(--insis-border) px-4 py-3">
					<h2 class="text-sm font-semibold text-(--insis-text)">
						{{ title ?? t('components.optimizer.TimetablePreviewModal.title') }}
					</h2>
					<button
						type="button"
						class="cursor-pointer text-(--insis-text-3) hover:text-(--insis-text)"
						:aria-label="t('common.close')"
						@click="emit('close')"
					>
						<IconX class="h-4 w-4" />
					</button>
				</div>

				<!-- Timetable -->
				<div class="min-h-0 flex-1 overflow-auto p-4">
					<TimetableGrid
						:units="units"
						:highlight-unit-ids="highlightUnitIds"
						:show-share="false"
						:show-export="false"
						:enable-drag="false"
						:enable-course-modal="false"
					/>
				</div>

				<!-- Score breakdown + actions -->
				<div class="flex flex-wrap items-center justify-between gap-3 border-t border-(--insis-border) px-4 py-3">
					<dl class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-(--insis-text-3)">
						<div v-if="score.campus_conflicts" class="flex gap-1">
							<dt>{{ t('components.optimizer.TimetablePreviewModal.campusConflicts') }}:</dt>
							<dd class="font-medium text-(--insis-text)">{{ score.campus_conflicts }}</dd>
						</div>
						<div v-if="score.gap_minutes" class="flex gap-1">
							<dt>{{ t('components.optimizer.TimetablePreviewModal.gapMinutes') }}:</dt>
							<dd class="font-medium text-(--insis-text)">{{ score.gap_minutes }} min</dd>
						</div>
						<div v-if="score.off_preferred_days" class="flex gap-1">
							<dt>{{ t('components.optimizer.TimetablePreviewModal.offPreferredDays') }}:</dt>
							<dd class="font-medium text-(--insis-text)">{{ score.off_preferred_days }}</dd>
						</div>
						<div v-if="score.long_study_blocks" class="flex gap-1">
							<dt>{{ t('components.optimizer.TimetablePreviewModal.longStudyBlocks') }}:</dt>
							<dd class="font-medium text-(--insis-text)">{{ score.long_study_blocks }}</dd>
						</div>
					</dl>
					<div class="flex gap-2">
						<button type="button" class="insis-btn insis-btn-secondary" @click="emit('close')">
							{{ t('common.cancel') }}
						</button>
						<button type="button" class="insis-btn insis-btn-primary" @click="emit('apply')">
							{{ t('components.optimizer.TimetablePreviewModal.apply') }}
						</button>
					</div>
				</div>
			</div>
		</div>
	</Teleport>
</template>
