<script setup lang="ts">
import type { OptimizerCandidateDTO } from '@shared/http/optimize'
import type { OptimizerResults, OptimizerState, SelectedCourseUnit } from '@client/types'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOptimizer, useOptimizerBasket } from '@client/composables'
import { useAlertsStore, useScheduleSlotsStore, useTimetableStore } from '@client/stores'
import CourseBasket from './CourseBasket.vue'
import ConstraintsPanel from './ConstraintsPanel.vue'
import CourseExplorer from './CourseExplorer.vue'
import ResultsGrid from './ResultsGrid.vue'
import TimetablePreviewModal from './TimetablePreviewModal.vue'
import IconLoaderCircle from '~icons/lucide/loader-circle'
import IconChevronLeft from '~icons/lucide/chevron-left'

const { t } = useI18n()
const timetableStore = useTimetableStore()
const slotsStore = useScheduleSlotsStore()
const alertsStore = useAlertsStore()
const { optimize, loading, error, saveConstraints, loadConstraints } = useOptimizer()
const { basketIds, add: addToBasket, remove: removeFromBasket } = useOptimizerBasket()

const optimizerState = ref<OptimizerState>('setup')
const constraints = ref(loadConstraints())
const results = ref<OptimizerResults | null>(null)
const previewCandidate = ref<OptimizerCandidateDTO | null>(null)
const previewTitle = ref<string | undefined>(undefined)
const previewExploreCourseId = ref<number | null>(null)
const basketEcts = ref<number>(0)

const currentUnitIdSet = computed(() => new Set(timetableStore.selectedUnits.map(u => u.unitId)))

// Seed basket from timetable on first load if basket is empty
onMounted(() => {
	if (basketIds.value.length === 0) {
		timetableStore.selectedCourseIds.forEach(id => addToBasket(id))
	}
	constraints.value = loadConstraints()
})

// Sync timetable course selection → basket
let prevTimetableIds = new Set(timetableStore.selectedCourseIds)
watch(
	() => timetableStore.selectedCourseIds,
	newIds => {
		const newSet = new Set(newIds)
		for (const id of newSet) {
			if (!prevTimetableIds.has(id)) addToBasket(id)
		}
		for (const id of prevTimetableIds) {
			if (!newSet.has(id)) removeFromBasket(id)
		}
		prevTimetableIds = newSet
	},
	{ deep: true }
)

async function runOptimize() {
	if (basketIds.value.length === 0) return
	optimizerState.value = 'generating'
	try {
		saveConstraints(constraints.value)
		const response = await optimize({ course_ids: basketIds.value, constraints: constraints.value, mode: 'build' })
		results.value = {
			fullCandidates: response.full_candidates,
			removalCandidates: response.removal_candidates,
			partial: response.partial,
			poolTruncated: response.pool_truncated
		}
		optimizerState.value = 'results'
	} catch {
		optimizerState.value = 'setup'
	}
}

function openPreview(candidate: OptimizerCandidateDTO, title?: string, exploreCourseId?: number) {
	previewCandidate.value = candidate
	previewTitle.value = title
	previewExploreCourseId.value = exploreCourseId ?? null
}

function applyCandidate() {
	if (!previewCandidate.value) return
	if (previewExploreCourseId.value != null) addToBasket(previewExploreCourseId.value)
	const currentUnits = [...timetableStore.selectedUnits]
	if (currentUnits.length > 0) {
		const slotsNeeded = slotsStore.slots.length + 1
		if (slotsNeeded > 5) {
			alertsStore.addAlert({ type: 'error', title: t('pages.share.slotsFull'), timeout: 6000 })
			return
		}
		slotsStore.saveCurrentAsSlot(`${t('pages.share.backupSlotName')} – ${new Date().toLocaleDateString()}`, currentUnits)
		alertsStore.addAlert({ type: 'success', title: t('pages.share.backupSavedAlert'), timeout: 5000 })
	}
	timetableStore.loadUnits(previewCandidate.value.units as unknown as SelectedCourseUnit[])
	previewCandidate.value = null
}

function handleGridPreview(candidate: OptimizerCandidateDTO) {
	const isRemoval = 'dropped_course_title' in candidate
	openPreview(
		candidate,
		isRemoval
			? t('components.optimizer.OptimizerTab.dropsTitle', { course: (candidate as { dropped_course_title: string }).dropped_course_title })
			: undefined
	)
}

function handleExploreApply(result: import('@shared/http/optimize').ExploreResultDTO) {
	if (!result.best_candidate) return
	openPreview(result.best_candidate, result.course_title, result.course_id)
}
</script>

<template>
	<div class="flex h-full flex-col">
		<!-- Results header -->
		<div v-if="optimizerState === 'results'" class="flex items-center gap-2 border-b border-(--insis-border) px-4 py-2">
			<button type="button" class="insis-btn-text flex items-center gap-1 text-sm" @click="optimizerState = 'setup'">
				<IconChevronLeft class="h-4 w-4" />
				{{ t('common.back') }}
			</button>
			<span class="text-sm font-medium text-(--insis-text)">
				{{ t('components.optimizer.OptimizerTab.resultsTitle') }}
			</span>
		</div>

		<!-- Setup panel — two-column layout -->
		<template v-if="optimizerState === 'setup' || optimizerState === 'generating'">
			<div class="overflow-y-auto">
				<div class="grid grid-cols-1 gap-0 sm:grid-cols-[1fr_1fr]">
					<!-- Left: basket + generate -->
					<div class="flex flex-col border-b border-(--insis-border) sm:border-r sm:border-b-0">
						<CourseBasket v-model="basketIds" @update:ects="basketEcts = $event" />
						<div class="flex flex-col gap-2 border-t border-(--insis-border) p-4">
							<p v-if="error" class="mb-2 text-xs text-(--insis-danger)">{{ error }}</p>
							<button
								type="button"
								class="insis-btn insis-btn-primary max-w-min"
								:disabled="basketIds.length === 0 || loading"
								@click="runOptimize"
							>
								<IconLoaderCircle v-if="loading" class="mr-1.5 h-4 w-4 animate-spin" />
								{{ loading ? t('components.optimizer.OptimizerTab.generating') : t('components.optimizer.OptimizerTab.generate') }}
							</button>
						</div>
					</div>

					<!-- Right: constraints -->
					<div>
						<ConstraintsPanel v-model="constraints" :basket-ects="basketEcts || undefined" />
					</div>
				</div>

				<!-- Course explorer — full width below the two-column grid -->
				<CourseExplorer :basket-ids="basketIds" :constraints="constraints" @apply="handleExploreApply" />
			</div>
		</template>

		<!-- Results panel -->
		<div v-else-if="optimizerState === 'results' && results" class="flex-1 overflow-y-auto">
			<ResultsGrid
				:full-candidates="results.fullCandidates"
				:removal-candidates="results.removalCandidates"
				:partial="results.partial"
				:pool-truncated="results.poolTruncated"
				@preview="handleGridPreview"
			/>
		</div>

		<!-- Timetable preview modal -->
		<TimetablePreviewModal
			v-if="previewCandidate"
			:candidate="previewCandidate"
			:current-unit-ids="currentUnitIdSet"
			:title="previewTitle"
			@apply="applyCandidate"
			@close="
				() => {
					previewCandidate = null
					previewExploreCourseId = null
				}
			"
		/>
	</div>
</template>
