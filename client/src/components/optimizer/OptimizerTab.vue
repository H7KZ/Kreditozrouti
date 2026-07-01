<script setup lang="ts">
import type { CourseWithRelationsDTO } from '@shared/http/responses'
import type { OptimizerCandidateDTO } from '@shared/http/optimize'
import type { OptimizerResults, OptimizerState, SelectedCourseUnit } from '@client/types'
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOptimizer } from '@client/composables'
import { useTimetableStore } from '@client/stores'
import CourseBasket from './CourseBasket.vue'
import ConstraintsPanel from './ConstraintsPanel.vue'
import ResultsGrid from './ResultsGrid.vue'
import TimetablePreviewModal from './TimetablePreviewModal.vue'
import IconLoaderCircle from '~icons/lucide/loader-circle'
import IconChevronLeft from '~icons/lucide/chevron-left'

const props = defineProps<{
	courses: CourseWithRelationsDTO[]
}>()

const { t } = useI18n()
const timetableStore = useTimetableStore()
const { optimize, loading, error, saveConstraints, loadConstraints } = useOptimizer()

const optimizerState = ref<OptimizerState>('setup')
const basketIds = ref<number[]>([])
const constraints = ref(loadConstraints())
const results = ref<OptimizerResults | null>(null)
const previewCandidate = ref<OptimizerCandidateDTO | null>(null)
const previewTitle = ref<string | undefined>(undefined)

const currentUnitIdSet = computed(() => new Set(timetableStore.selectedUnits.map(u => u.unitId)))

onMounted(() => {
	constraints.value = loadConstraints()
})

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

function openPreview(candidate: OptimizerCandidateDTO, title?: string) {
	previewCandidate.value = candidate
	previewTitle.value = title
}

function applyCandidate() {
	if (!previewCandidate.value) return
	timetableStore.loadUnits(previewCandidate.value.units as unknown as SelectedCourseUnit[])
	previewCandidate.value = null
}

function handleGridPreview(candidate: OptimizerCandidateDTO) {
	// Check if it's a removal candidate by duck-typing
	const isRemoval = 'dropped_course_title' in candidate
	openPreview(
		candidate,
		isRemoval
			? t('components.optimizer.OptimizerTab.dropsTitle', { course: (candidate as { dropped_course_title: string }).dropped_course_title })
			: undefined
	)
}
</script>

<template>
	<div class="flex h-full flex-col">
		<!-- Setup / Results header -->
		<div v-if="optimizerState === 'results'" class="flex items-center gap-2 border-b border-(--insis-border) px-4 py-2">
			<button type="button" class="insis-btn-text flex items-center gap-1 text-sm" @click="optimizerState = 'setup'">
				<IconChevronLeft class="h-4 w-4" />
				{{ t('common.back') }}
			</button>
			<span class="text-sm font-medium text-(--insis-text)">
				{{ t('components.optimizer.OptimizerTab.resultsTitle') }}
			</span>
		</div>

		<!-- Setup panel -->
		<template v-if="optimizerState === 'setup' || optimizerState === 'generating'">
			<div class="flex-1 overflow-y-auto">
				<CourseBasket v-model="basketIds" :courses="props.courses" />
				<div class="border-t border-(--insis-border)">
					<ConstraintsPanel v-model="constraints" />
				</div>
			</div>
			<div class="border-t border-(--insis-border) p-4">
				<p v-if="error" class="mb-2 text-xs text-(--insis-danger)">{{ error }}</p>
				<button type="button" class="insis-btn insis-btn-primary w-full" :disabled="basketIds.length === 0 || loading" @click="runOptimize">
					<IconLoaderCircle v-if="loading" class="mr-1.5 h-4 w-4 animate-spin" />
					{{ loading ? t('components.optimizer.OptimizerTab.generating') : t('components.optimizer.OptimizerTab.generate') }}
				</button>
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
			@close="previewCandidate = null"
		/>
	</div>
</template>
