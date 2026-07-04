<script setup lang="ts">
import type { OptimizerCandidateDTO, RemovalCandidateDTO } from '@shared/http/optimize'
import { useI18n } from 'vue-i18n'
import MiniTimetable from './MiniTimetable.vue'

defineProps<{
	fullCandidates: OptimizerCandidateDTO[]
	removalCandidates: RemovalCandidateDTO[]
	partial: boolean
	poolTruncated: boolean
	poolTruncatedCount?: number
}>()

const emit = defineEmits<{
	(e: 'preview', candidate: OptimizerCandidateDTO): void
	(e: 'apply', candidate: OptimizerCandidateDTO): void
}>()

const { t } = useI18n()
</script>

<template>
	<div class="flex flex-col gap-6 p-4">
		<!-- Notices -->
		<p v-if="partial" class="rounded bg-(--insis-warning-light) px-3 py-2 text-xs text-(--insis-warning-text)">
			{{ t('components.optimizer.ResultsGrid.partialNotice') }}
		</p>
		<p v-if="poolTruncated" class="rounded bg-(--insis-warning-light) px-3 py-2 text-xs text-(--insis-warning-text)">
			{{ t('components.optimizer.ResultsGrid.poolTruncatedNotice', { count: poolTruncatedCount }) }}
		</p>

		<!-- Full candidates -->
		<section v-if="fullCandidates.length > 0">
			<h4 class="mb-2 text-xs font-semibold tracking-wide text-(--insis-text-3) uppercase">
				{{ t('components.optimizer.ResultsGrid.fullCandidatesTitle') }}
			</h4>
			<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
				<button
					v-for="(c, i) in fullCandidates"
					:key="i"
					type="button"
					class="flex cursor-pointer flex-col rounded border border-(--insis-border) bg-(--insis-surface) p-3 text-left hover:border-(--insis-blue) hover:shadow-sm"
					@click="emit('preview', c)"
				>
					<span class="mb-1 text-xs font-medium text-(--insis-text)">
						{{ t('components.optimizer.ResultsGrid.option', { n: i + 1 }) }}
					</span>
					<MiniTimetable :units="c.units" class="w-full" />
					<span class="mt-1.5 text-[10px] text-(--insis-text-3)">
						{{ t('components.optimizer.ResultsGrid.score', { score: c.score.total }) }}
					</span>
				</button>
			</div>
		</section>

		<p v-else class="rounded bg-(--insis-surface-2) px-4 py-6 text-center text-sm text-(--insis-text-3)">
			{{ t('components.optimizer.ResultsGrid.noFullCandidates') }}
		</p>

		<!-- Removal candidates -->
		<section v-if="removalCandidates.length > 0">
			<h4 class="mb-2 text-xs font-semibold tracking-wide text-(--insis-text-3) uppercase">
				{{ t('components.optimizer.ResultsGrid.removalCandidatesTitle') }}
			</h4>
			<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
				<button
					v-for="(c, i) in removalCandidates"
					:key="i"
					type="button"
					class="flex cursor-pointer flex-col rounded border border-(--insis-border) bg-(--insis-surface) p-3 text-left hover:border-(--insis-warning) hover:shadow-sm"
					@click="emit('preview', c)"
				>
					<span class="mb-1 text-[10px] text-(--insis-warning-text)">
						{{ t('components.optimizer.ResultsGrid.drops', { course: c.dropped_course_title }) }}
					</span>
					<MiniTimetable :units="c.units" class="w-full" />
					<span class="mt-1.5 text-[10px] text-(--insis-text-3)">
						{{ t('components.optimizer.ResultsGrid.score', { score: c.score.total }) }}
					</span>
				</button>
			</div>
		</section>
	</div>
</template>
