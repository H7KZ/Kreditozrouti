<script setup lang="ts">
import type { InSISStudyPlanCourseCategory, InSISStudyPlanCourseGroup } from '@kreditozrouti/core/domain/insis'
import type { ExploreResultDTO, SolverConstraints } from '@kreditozrouti/core/http/optimize'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { postOptimize } from '@client/services/optimizeService'
import { useWizardDataStore, useWizardStore } from '@client/stores'
import MiniTimetable from './MiniTimetable.vue'
import IconSparkles from '~icons/lucide/sparkles'
import IconLoaderCircle from '~icons/lucide/loader-circle'
import IconChevronDown from '~icons/lucide/chevron-down'

// Categories worth exploring (skip prohibited/beyond_scope/exchange_program).
const EXPLORABLE: InSISStudyPlanCourseCategory[] = ['compulsory', 'elective', 'language', 'state_exam', 'physical_education']

const props = defineProps<{
	basketIds: number[]
	constraints: SolverConstraints
}>()

const emit = defineEmits<{
	(e: 'apply', result: ExploreResultDTO): void
}>()

const { t } = useI18n()
const wizardDataStore = useWizardDataStore()
const wizardStore = useWizardStore()

const expanded = ref(false)
const selectedGroup = ref<InSISStudyPlanCourseGroup | null>(null)
const selectedCategory = ref<InSISStudyPlanCourseCategory | null>(null)
const results = ref<ExploreResultDTO[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const hasRun = ref(false)

const hasStudyPlan = computed(() => wizardStore.studyPlanIds.length > 0)

async function loadIfNeeded() {
	if (wizardStore.studyPlanIds.length > 0 && wizardDataStore.studyPlans.length === 0) {
		await wizardDataStore.loadStudyPlans()
	}
}

onMounted(loadIfNeeded)
watch(expanded, v => {
	if (v) loadIfNeeded()
})

// group → category → deduplicated course IDs (excludes courses already in basket, from selected study plans only)
const coursesByGroupAndCategory = computed(() => {
	const selectedPlanIds = new Set(wizardStore.studyPlanIds)
	const basketSet = new Set(props.basketIds)
	const map = new Map<InSISStudyPlanCourseGroup, Map<InSISStudyPlanCourseCategory, number[]>>()
	for (const sp of wizardDataStore.studyPlans) {
		if (!selectedPlanIds.has(sp.id)) continue
		for (const spc of sp.courses) {
			if (!spc.course_id || basketSet.has(spc.course_id)) continue
			if (!EXPLORABLE.includes(spc.category)) continue
			let catMap = map.get(spc.group)
			if (!catMap) {
				catMap = new Map()
				map.set(spc.group, catMap)
			}
			const list = catMap.get(spc.category)
			if (list) {
				if (!list.includes(spc.course_id)) list.push(spc.course_id)
			} else catMap.set(spc.category, [spc.course_id])
		}
	}
	return map
})

const availableGroups = computed(() =>
	[...coursesByGroupAndCategory.value.entries()].filter(([, cats]) => [...cats.values()].some(ids => ids.length > 0)).map(([g]) => g)
)

function groupCount(group: InSISStudyPlanCourseGroup): number {
	const catMap = coursesByGroupAndCategory.value.get(group)
	if (!catMap) return 0
	return [...catMap.values()].reduce((sum, ids) => sum + ids.length, 0)
}

// Categories available under the selected group (or all groups if none selected)
const availableCategories = computed(() => {
	const counts = new Map<InSISStudyPlanCourseCategory, number>()
	const source = selectedGroup.value
		? [[selectedGroup.value, coursesByGroupAndCategory.value.get(selectedGroup.value)] as const]
		: [...coursesByGroupAndCategory.value.entries()]
	for (const [, catMap] of source) {
		if (!catMap) continue
		for (const [cat, ids] of catMap) {
			counts.set(cat, (counts.get(cat) ?? 0) + ids.length)
		}
	}
	return EXPLORABLE.filter(c => (counts.get(c) ?? 0) > 0).map(c => ({ cat: c, count: counts.get(c)! }))
})

function categoryCount(cat: InSISStudyPlanCourseCategory): number {
	return availableCategories.value.find(e => e.cat === cat)?.count ?? 0
}

function selectGroup(g: InSISStudyPlanCourseGroup) {
	selectedGroup.value = selectedGroup.value === g ? null : g
	// reset category if it's no longer available under new group
	if (selectedCategory.value && !availableCategories.value.some(e => e.cat === selectedCategory.value)) {
		selectedCategory.value = null
	}
	results.value = []
	hasRun.value = false
	error.value = null
}

function selectCategory(cat: InSISStudyPlanCourseCategory) {
	selectedCategory.value = selectedCategory.value === cat ? null : cat
	results.value = []
	hasRun.value = false
	error.value = null
}

function fitLevel(score: number): 'perfect' | 'good' | 'moderate' {
	if (score === 0) return 'perfect'
	if (score <= 50) return 'good'
	return 'moderate'
}

const exploreIds = computed(() => {
	if (!selectedCategory.value) return []
	const source = selectedGroup.value
		? [[selectedGroup.value, coursesByGroupAndCategory.value.get(selectedGroup.value)] as const]
		: [...coursesByGroupAndCategory.value.entries()]
	const ids = new Set<number>()
	for (const [, catMap] of source) {
		if (!catMap) continue
		for (const id of catMap.get(selectedCategory.value) ?? []) ids.add(id)
	}
	return [...ids]
})

async function findFits() {
	if (exploreIds.value.length === 0) return

	loading.value = true
	error.value = null
	hasRun.value = false
	results.value = []

	try {
		const response = await postOptimize({
			course_ids: props.basketIds,
			explore_course_ids: exploreIds.value,
			constraints: props.constraints,
			mode: 'explore'
		})
		results.value = response.explore_results ?? []
		hasRun.value = true
	} catch {
		error.value = t('components.optimizer.CourseExplorer.error')
	} finally {
		loading.value = false
	}
}
</script>

<template>
	<div class="border-t border-(--insis-border)">
		<!-- Collapsible header -->
		<button
			type="button"
			class="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-(--insis-text) hover:bg-(--insis-surface-2)"
			@click="expanded = !expanded"
		>
			<span class="flex items-center gap-2">
				<IconSparkles class="h-3.5 w-3.5 text-(--insis-blue)" aria-hidden="true" />
				{{ t('components.optimizer.CourseExplorer.title') }}
			</span>
			<IconChevronDown :class="['h-4 w-4 text-(--insis-text-3) transition-transform duration-200', expanded && 'rotate-180']" aria-hidden="true" />
		</button>

		<div v-if="expanded" class="px-4 pt-1 pb-5">
			<!-- No study plan set up -->
			<p v-if="!hasStudyPlan" class="text-sm text-(--insis-text-3)">
				{{ t('components.optimizer.CourseExplorer.noStudyPlan') }}
			</p>

			<template v-else>
				<!-- Group picker -->
				<div v-if="availableGroups.length > 1" class="mb-2">
					<p class="mb-2 text-xs text-(--insis-text-3)">{{ t('components.optimizer.CourseExplorer.pickGroup') }}</p>
					<div class="flex flex-wrap gap-1.5">
						<button
							v-for="g in availableGroups"
							:key="g"
							type="button"
							:class="[
								'cursor-pointer rounded border px-2.5 py-1 text-[11px] font-medium transition-colors',
								selectedGroup === g
									? 'border-(--insis-blue) bg-(--insis-blue-subtle) text-(--insis-blue)'
									: 'border-(--insis-border) text-(--insis-text-2) hover:border-(--insis-blue) hover:text-(--insis-blue)'
							]"
							:aria-pressed="selectedGroup === g"
							@click="selectGroup(g)"
						>
							{{ t(`components.optimizer.CourseExplorer.groups.${g}`) }}
							<span class="ml-0.5 text-(--insis-text-3)">({{ groupCount(g) }})</span>
						</button>
					</div>
				</div>

				<!-- Category picker -->
				<div class="mb-3">
					<p class="mb-2 text-xs text-(--insis-text-3)">{{ t('components.optimizer.CourseExplorer.pickCategory') }}</p>
					<div class="flex flex-wrap gap-1.5">
						<button
							v-for="{ cat } in availableCategories"
							:key="cat"
							type="button"
							:class="[
								'cursor-pointer rounded border px-2.5 py-1 text-[11px] font-medium transition-colors',
								selectedCategory === cat
									? 'border-(--insis-blue) bg-(--insis-blue-subtle) text-(--insis-blue)'
									: 'border-(--insis-border) text-(--insis-text-2) hover:border-(--insis-blue) hover:text-(--insis-blue)'
							]"
							:aria-pressed="selectedCategory === cat"
							@click="selectCategory(cat)"
						>
							{{ t(`components.optimizer.CourseExplorer.categories.${cat}`) }}
							<span class="ml-0.5 text-(--insis-text-3)">({{ categoryCount(cat) }})</span>
						</button>
					</div>
				</div>

				<!-- Find fits CTA -->
				<div class="mb-4 flex items-center gap-3">
					<button type="button" class="insis-btn insis-btn-secondary" :disabled="!selectedCategory || loading" @click="findFits">
						<IconLoaderCircle v-if="loading" class="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
						{{ loading ? t('components.optimizer.CourseExplorer.searching') : t('components.optimizer.CourseExplorer.findFits') }}
					</button>
					<p v-if="!selectedCategory" class="text-xs text-(--insis-text-3)">
						{{ t('components.optimizer.CourseExplorer.selectCategoryFirst') }}
					</p>
				</div>

				<!-- Error -->
				<p v-if="error" class="mb-3 text-xs text-(--insis-danger)">{{ error }}</p>

				<!-- Results -->
				<template v-if="hasRun">
					<p v-if="results.length === 0" class="text-sm text-(--insis-text-3)">
						{{ t('components.optimizer.CourseExplorer.noCourses') }}
					</p>

					<div v-else class="flex flex-col gap-2">
						<p class="mb-1 text-xs text-(--insis-text-3)">
							{{ t('components.optimizer.CourseExplorer.resultsTitle', { n: results.length }) }}
						</p>

						<div
							v-for="(r, i) in results"
							:key="r.course_id"
							class="rounded border border-(--insis-border) bg-(--insis-surface) p-3 transition-colors hover:border-(--insis-border-mid)"
						>
							<!-- Course header row -->
							<div class="mb-2 flex items-start justify-between gap-2">
								<div class="flex min-w-0 items-center gap-2">
									<span
										class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
										:class="{
											'bg-(--insis-success-light) text-(--insis-success)':
												r.best_candidate && fitLevel(r.best_candidate.score.total) === 'perfect',
											'bg-(--insis-blue-subtle) text-(--insis-blue)':
												r.best_candidate && fitLevel(r.best_candidate.score.total) === 'good',
											'bg-(--insis-warning-light) text-(--insis-warning)':
												!r.best_candidate || fitLevel(r.best_candidate.score.total) === 'moderate'
										}"
									>
										#{{ i + 1 }}
									</span>
									<span class="shrink-0 text-xs font-medium text-(--insis-text)">{{ r.course_ident }}</span>
									<span class="truncate text-xs text-(--insis-text-2)" :title="r.course_title">{{ r.course_title }}</span>
								</div>
								<span v-if="r.ects" class="shrink-0 text-[10px] text-(--insis-text-3)">{{ r.ects }} ECTS</span>
							</div>

							<!-- Has a fit -->
							<template v-if="r.best_candidate">
								<MiniTimetable :units="r.best_candidate.units" class="w-full" />
								<div class="mt-2 flex items-center justify-between">
									<span
										class="text-[10px]"
										:class="{
											'text-(--insis-success)': fitLevel(r.best_candidate.score.total) === 'perfect',
											'text-(--insis-text-3)': fitLevel(r.best_candidate.score.total) === 'good',
											'text-(--insis-warning)': fitLevel(r.best_candidate.score.total) === 'moderate'
										}"
									>
										{{
											fitLevel(r.best_candidate.score.total) === 'perfect'
												? t('components.optimizer.CourseExplorer.fitPerfect')
												: t('components.optimizer.CourseExplorer.fitScore', { score: r.best_candidate.score.total })
										}}
									</span>
									<button type="button" class="insis-btn insis-btn-primary py-0.5 text-[11px]" @click="emit('apply', r)">
										{{ t('components.optimizer.CourseExplorer.preview') }}
									</button>
								</div>
							</template>

							<!-- No fit found -->
							<p v-else class="mt-1 text-[10px] text-(--insis-text-3)">
								{{ t('components.optimizer.CourseExplorer.noFit') }}
							</p>
						</div>
					</div>
				</template>
			</template>
		</div>
	</div>
</template>
