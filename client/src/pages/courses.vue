<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useSeoMeta } from '@unhead/vue'
import { getUpcomingPeriod } from '@shared/domain/period'
import analytics from '@client/analytics'
import CoursesHeader from '@client/components/courses/CoursesHeader.vue'
import CourseStatusSummary from '@client/components/courses/CourseStatusSummary.vue'
import CourseTable from '@client/components/courses/CourseTable.vue'
import MobileBottomNav from '@client/components/common/MobileBottomNav.vue'
import FilterFullScreen from '@client/components/filters/FilterFullScreen.vue'
import FilterPanel from '@client/components/filters/FilterPanel.vue'
import ScheduleSlotsPanel from '@client/components/timetable/ScheduleSlotsPanel.vue'
import TimetableGrid from '@client/components/timetable/TimetableGrid.vue'
import { resetCourseStatusFilter } from '@client/composables/useCourseStatusFilter'
import { useCoursesStore, useFiltersStore, useTimetableStore, useUIStore, useWizardStore } from '@client/stores'
import IconCalendar from '~icons/lucide/calendar'
import IconCalendarMinus2 from '~icons/lucide/calendar-minus-2'
import IconTable from '~icons/lucide/table'

const { t } = useI18n()
const router = useRouter()
const coursesStore = useCoursesStore()
const filtersStore = useFiltersStore()
const timetableStore = useTimetableStore()
const uiStore = useUIStore()
const wizardStore = useWizardStore()

useSeoMeta({
	title: () => {
		const base = t('pages.courses.myTimetable')
		const { year, semester } = getUpcomingPeriod()
		return `${base} | ${year} ${t(`semesters.${semester}`)} – Kreditožrouti`
	},
	ogTitle: () => {
		const base = t('pages.courses.myTimetable')
		const { year, semester } = getUpcomingPeriod()
		return `${base} | ${year} ${t(`semesters.${semester}`)} – Kreditožrouti`
	},
	description: () => t('pages.courses.metaDescription'),
	ogDescription: () => t('pages.courses.metaDescription'),
})

watch(
	() => wizardStore.completed,
	(completed) => {
		if (!completed) {
			router.push('/')
		}
	},
	{ immediate: true },
)

// Analytics: track filter usage events
watch(
	() => filtersStore.filters.title,
	(val) => {
		if (val) analytics.track('filter_used', { filter_type: 'search' })
	},
)
watch(
	() => filtersStore.filters.search,
	(val) => {
		if (val) analytics.track('filter_used', { filter_type: 'syllabus' })
	},
)
watch(
	() => filtersStore.filters.faculty_ids,
	(val) => {
		if (val?.length) analytics.track('filter_used', { filter_type: 'faculty' })
	},
	{ deep: true },
)
watch(
	() => filtersStore.filters.levels,
	(val) => {
		if (val?.length) analytics.track('filter_used', { filter_type: 'study_level' })
	},
	{ deep: true },
)
watch(
	() => filtersStore.filters.languages,
	(val) => {
		if (val?.length) analytics.track('filter_used', { filter_type: 'language' })
	},
	{ deep: true },
)
watch(
	() => filtersStore.filters.groups,
	(val) => {
		if (val?.length) analytics.track('filter_used', { filter_type: 'course_group' })
	},
	{ deep: true },
)
watch(
	() => filtersStore.filters.categories,
	(val) => {
		if (val?.length) analytics.track('filter_used', { filter_type: 'category' })
	},
	{ deep: true },
)
watch(
	() => filtersStore.filters.ects,
	(val) => {
		if (val?.length) analytics.track('filter_used', { filter_type: 'ects' })
	},
	{ deep: true },
)
watch(
	() => filtersStore.filters.mode_of_completions,
	(val) => {
		if (val?.length) analytics.track('filter_used', { filter_type: 'completion' })
	},
	{ deep: true },
)
watch(
	() => filtersStore.filters.lecturers,
	(val) => {
		if (val?.length) analytics.track('filter_used', { filter_type: 'lecturer' })
	},
	{ deep: true },
)
watch(
	() => filtersStore.filters.include_times,
	(val) => {
		if (val?.length) analytics.track('filter_used', { filter_type: 'time' })
	},
	{ deep: true },
)
watch(
	() => filtersStore.hideConflictingCourses,
	(val) => {
		if (val) analytics.track('filter_used', { filter_type: 'hide_conflicts' })
	},
)

onMounted(async () => {
	if (wizardStore.completed && wizardStore.studyPlanId) {
		coursesStore.initializeFromWizard()
		await coursesStore.fetchCourses()
	}
})

onUnmounted(() => {
	resetCourseStatusFilter()
})

const disableEmptyTimetable = ref(false)
const showEmptyTimetable = computed(() => uiStore.viewMode === 'timetable' && timetableStore.selectedCourseIds.length === 0 && !disableEmptyTimetable.value)

const selectedCoursesCount = computed(() => timetableStore.selectedCourseIds.length)

async function fetchNextCoursesPage(page: () => void) {
	page()
	await coursesStore.fetchCourses()
}
</script>

<template>
	<div v-if="wizardStore.completed" class="flex h-screen flex-col overflow-hidden">
		<!-- Header -->
		<CoursesHeader />

		<!-- Body -->
		<div class="flex flex-1 overflow-hidden">
			<!-- Sidebar / Filter Panel -->
			<aside
				class="hidden shrink-0 flex-col overflow-hidden border-r border-(--insis-border) bg-(--insis-surface) lg:flex lg:w-[280px] lg:min-w-[290px] xl:w-[300px] xl:min-w-[300px]"
			>
				<FilterPanel />
			</aside>

			<!-- Main Content -->
			<div class="flex flex-1 flex-col overflow-hidden">
				<!-- Status bar (only when courses selected) -->
				<div v-if="selectedCoursesCount > 0" class="flex shrink-0 items-center gap-2 border-b border-(--insis-border) bg-(--insis-surface) px-4 py-1.5">
					<CourseStatusSummary />
					<div class="flex-1" />
				</div>

				<!-- Tab bar -->
				<div class="hidden shrink-0 items-end gap-2 border-b border-(--insis-border) bg-(--insis-surface) px-4 lg:flex">
					<nav class="insis-tabs" style="width: 100%; padding-top: 4px">
						<button type="button" class="insis-tab" :class="{ 'insis-tab-active': uiStore.viewMode === 'list' }" @click="uiStore.switchToListView">
							<IconTable class="h-3.5 w-3.5" />
							{{ $t('pages.courses.courseList') }}
							<span v-if="coursesStore.pagination.total" class="ml-0.5 text-[11px] text-(--insis-text-3)">
								({{ coursesStore.pagination.total }})
							</span>
						</button>
						<button
							type="button"
							class="insis-tab"
							:class="{ 'insis-tab-active': uiStore.viewMode === 'timetable' }"
							@click="uiStore.switchToTimetableView"
						>
							<IconCalendar class="h-3.5 w-3.5" />
							{{ $t('pages.courses.myTimetable') }}
							<span v-if="selectedCoursesCount > 0" class="ml-0.5 text-[11px] text-(--insis-text-3)">({{ selectedCoursesCount }})</span>
						</button>
					</nav>
				</div>

				<!-- Content -->
				<div
					id="main-content"
					class="flex-1 scrollbar-thin [scrollbar-color:var(--insis-border-mid)_transparent] overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-[3px] [&::-webkit-scrollbar-thumb]:bg-(--insis-border-mid) [&::-webkit-scrollbar-track]:bg-transparent"
					:aria-busy="coursesStore.loading"
				>
					<!-- Loading -->
					<div v-if="coursesStore.loading" class="flex items-center justify-center py-12">
						<div class="text-center" role="status" :aria-label="$t('common.loadingCourses')">
							<div class="insis-spinner mx-auto mb-3" aria-hidden="true" />
							<p class="text-[12px] text-(--insis-text-3)">{{ $t('pages.courses.loadingCourses') }}</p>
						</div>
					</div>

					<!-- Error -->
					<div
						v-else-if="coursesStore.error"
						class="rounded border border-(--insis-danger-border) bg-(--insis-danger-light) p-4 text-sm text-(--insis-danger)"
					>
						<p class="font-medium">{{ $t('pages.courses.loadingError') }}</p>
						<p>{{ coursesStore.error }}</p>
						<button type="button" class="insis-btn-text mt-2" @click="() => coursesStore.fetchCourses()">{{ $t('common.tryAgain') }}</button>
					</div>

					<!-- List View -->
					<template v-else-if="uiStore.viewMode === 'list'">
						<!-- Empty state -->
						<div v-if="coursesStore.courses.length === 0" class="py-12 text-center">
							<p class="text-(--insis-text-3)">{{ $t('pages.courses.noCoursesFound') }}</p>
							<button v-if="filtersStore.hasActiveFilters" type="button" class="insis-btn-text mt-2 text-sm" @click="coursesStore.resetFilters">
								{{ $t('pages.courses.clearFilters') }}
							</button>
						</div>

						<CourseTable v-else />

						<!-- Pagination -->
						<div
							v-if="coursesStore.pagination.total > coursesStore.pagination.limit"
							class="mt-4 flex flex-col items-center gap-3 border-t border-(--insis-border) pt-4 sm:flex-row sm:justify-between"
						>
							<p class="text-center text-[12px] text-(--insis-text-3) sm:text-left">
								{{
									$t('pages.courses.showingResults', {
										from: coursesStore.pagination.offset + 1,
										to: Math.min(coursesStore.pagination.offset + coursesStore.pagination.count, coursesStore.pagination.total),
										total: coursesStore.pagination.total,
									})
								}}
							</p>
							<div class="flex w-full items-center gap-2 sm:w-auto">
								<button
									type="button"
									class="insis-btn insis-btn-secondary flex-1 justify-center sm:flex-none"
									:disabled="!coursesStore.hasPrevPage"
									:aria-label="$t('common.previousPage')"
									@click="fetchNextCoursesPage(coursesStore.prevPage)"
								>
									← {{ $t('common.previous') }}
								</button>
								<span class="text-[12px] text-(--insis-text-2)" aria-live="polite">
									{{ $t('pages.courses.pageInfo', { current: coursesStore.currentPage, total: coursesStore.totalPages }) }}
								</span>
								<button
									type="button"
									class="insis-btn insis-btn-secondary flex-1 justify-center sm:flex-none"
									:disabled="!coursesStore.hasNextPage"
									:aria-label="$t('common.nextPage')"
									@click="fetchNextCoursesPage(coursesStore.nextPage)"
								>
									{{ $t('common.next') }} →
								</button>
							</div>
						</div>
					</template>

					<!-- Timetable View -->
					<template v-else-if="uiStore.viewMode === 'timetable'">
						<ScheduleSlotsPanel />

						<TimetableGrid>
							<!-- Empty timetable -->
							<div
								v-if="showEmptyTimetable"
								class="absolute inset-0 flex flex-col items-center justify-center bg-(--insis-surface)/80 py-12 text-center"
							>
								<div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-(--insis-gray-200)">
									<IconCalendarMinus2 class="h-7 w-7 text-(--insis-gray-500)" />
								</div>
								<p class="mb-1 text-[15px] font-medium text-(--insis-text)">
									{{ $t('pages.courses.emptyTimetable.title') }}
								</p>
								<p class="mb-5 text-sm text-(--insis-text-3)">
									{{ $t('pages.courses.emptyTimetable.description') }}
								</p>
								<div class="flex flex-col items-center gap-3">
									<button type="button" class="insis-btn insis-btn-primary" @click="uiStore.switchToListView">
										{{ $t('pages.courses.emptyTimetable.browseCourses') }}
									</button>
									<button type="button" class="insis-btn insis-btn-secondary" @click="() => (disableEmptyTimetable = true)">
										{{ $t('pages.courses.emptyTimetable.orDragTimetable') }}
									</button>
								</div>
							</div>
						</TimetableGrid>

						<!-- Legend -->
						<div class="mt-4 border-t border-(--insis-border) pt-4">
							<button
								type="button"
								class="flex cursor-pointer items-center gap-2 text-[12px] text-(--insis-text-3) hover:text-(--insis-text)"
								@click="uiStore.toggleLegend"
							>
								<span>{{ uiStore.showLegend ? '▼' : '▶' }}</span>
								{{ $t('common.legend') }}
							</button>
							<div v-if="uiStore.showLegend" class="mt-2 flex flex-wrap gap-4">
								<div class="flex items-center gap-1.5">
									<span class="h-2.5 w-2.5 rounded" style="background: var(--insis-block-lecture)" />
									<span class="text-[11.5px] text-(--insis-text-2)">{{ $t('unitTypes.lecture') }}</span>
								</div>
								<div class="flex items-center gap-1.5">
									<span class="h-2.5 w-2.5 rounded" style="background: var(--insis-block-exercise)" />
									<span class="text-[11.5px] text-(--insis-text-2)">{{ $t('unitTypes.exercise') }}</span>
								</div>
								<div class="flex items-center gap-1.5">
									<span class="h-2.5 w-2.5 rounded" style="background: var(--insis-block-seminar)" />
									<span class="text-[11.5px] text-(--insis-text-2)">{{ $t('unitTypes.seminar') }}</span>
								</div>
								<div class="flex items-center gap-1.5">
									<span class="h-2.5 w-2.5 rounded" style="background: var(--insis-block-date-only)" />
									<span class="text-[11.5px] text-(--insis-text-2)">{{ $t('unitTypes.dateOnly') }}</span>
								</div>
								<div class="flex items-center gap-1.5">
									<span class="h-2.5 w-2.5 rounded ring-2 ring-(--insis-danger)" />
									<span class="text-[11.5px] text-(--insis-text-2)">{{ $t('pages.courses.conflict') }}</span>
								</div>
							</div>
						</div>
					</template>
				</div>
			</div>
		</div>

		<FilterFullScreen v-if="uiStore.mobileFilterOpen" class="lg:hidden" />
		<MobileBottomNav class="shrink-0 lg:hidden" />
	</div>
</template>
