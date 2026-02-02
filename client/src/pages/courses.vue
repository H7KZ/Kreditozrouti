<script setup lang="ts">
import LanguageSwitcher from '@client/components/common/LanguageSwitcher.vue'
import CourseStatusSummary from '@client/components/courses/CourseStatusSummary.vue'
import CourseTable from '@client/components/courses/CourseTable.vue'
import FilterPanel from '@client/components/filters/FilterPanel.vue'
import TimetableGrid from '@client/components/timetable/TimetableGrid.vue'
import { useCourseLabels } from '@client/composables'
import { resetCourseStatusFilter } from '@client/composables/useCourseStatusFilter'
import { useCoursesStore, useTimetableStore, useUIStore, useWizardStore } from '@client/stores'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import IconCalendar from '~icons/lucide/calendar'
import IconCalendarMinus2 from '~icons/lucide/calendar-minus-2'
import IconFunnel from '~icons/lucide/funnel'
import IconTable from '~icons/lucide/table'

/**
 * Courses Page
 *
 * Main course browser with filters, list view, and timetable view.
 * Features:
 * - Course status summary above tabs showing selected/conflict/incomplete counts
 * - Clickable status badges to filter course list
 * - Refactored filter panel with checkbox-style status filters
 */

const { t } = useI18n()
const router = useRouter()
const coursesStore = useCoursesStore()
const timetableStore = useTimetableStore()
const uiStore = useUIStore()
const wizardStore = useWizardStore()

// Composables
const { getSemesterLabel } = useCourseLabels()

// Redirect to wizard if not completed
watch(
	() => wizardStore.completed,
	(completed) => {
		if (!completed) {
			router.push('/')
		}
	},
	{ immediate: true },
)

// Initialize courses from wizard selection
onMounted(async () => {
	if (wizardStore.completed && wizardStore.studyPlanId) {
		coursesStore.initializeFromWizard()
		await coursesStore.fetchCourses()
	}
})

// Clean up shared filter state on unmount
onUnmounted(() => {
	resetCourseStatusFilter()
})

const disableEmptyTimetable = ref(false)
const showEmptyTimetable = computed(() => uiStore.viewMode === 'timetable' && timetableStore.selectedCourseIds.length === 0 && !disableEmptyTimetable.value)

/** Selected study plan display */
const studyPlanInfo = computed(() => ({
	titles: wizardStore.studyPlanTitles || [],
	idents: wizardStore.studyPlanIdents || [],
}))

/** Course search info using composable for semester label */
const coursesInfo = computed(() => ({
	years: coursesStore.filters.years,
	semester: coursesStore.filters.semesters?.map((s) => getSemesterLabel(s)).join(', '),
}))

/** Selected courses count */
const selectedCoursesCount = computed(() => timetableStore.selectedCourseIds.length)

/** Reset wizard and go back */
function handleResetWizard() {
	if (!confirm(t('pages.courses.changePlanConfirm'))) return
	wizardStore.reset()
	timetableStore.clearAll()
	router.push('/')
}

/** Clear all selected courses */
function handleClearTimetable() {
	if (!confirm(t('pages.courses.clearTimetableConfirm'))) return
	timetableStore.clearAll()
}

async function fetchNextCoursesPage(page: () => void) {
	page()
	await coursesStore.fetchCourses()
}
</script>

<template>
	<div v-if="wizardStore.completed" class="flex min-h-screen flex-col bg-[var(--insis-bg)]">
		<!-- Header -->
		<header class="sticky top-0 z-40 border-b border-[var(--insis-border)] bg-white px-4 py-2">
			<div class="flex items-center justify-between">
				<!-- Left: Logo and study plan info -->
				<div class="flex items-center gap-4">
					<router-link to="/" class="flex items-center gap-3">
						<div class="h-9 w-9 flex items-center justify-center">
							<img src="/logo/kreditozrouti-transparent-cropped.png" alt="K" class="pb-0.5" />
						</div>
						<span class="font-semibold text-[var(--insis-blue)]">
							{{ $t('pages.index.title') }}
						</span>
					</router-link>

					<div class="hidden border-l border-[var(--insis-border)] pl-4 sm:block">
						<p class="text-sm font-medium text-[var(--insis-text)]">
							{{ studyPlanInfo.titles.length > 0 ? studyPlanInfo.titles.join(' / ') : $t('pages.courses.studyPlanFallback') }}
						</p>
						<p class="text-xs text-[var(--insis-gray-500)]">
							{{ $t('pages.courses.searchingForCourses', { semester: coursesInfo.semester, year: coursesInfo.years?.join('/') }) }}
						</p>
					</div>
				</div>

				<!-- Right: Actions -->
				<div class="flex items-center gap-4">
					<!-- Clear timetable -->
					<button v-if="selectedCoursesCount > 0" type="button" class="insis-btn insis-btn-secondary text-sm" @click="handleClearTimetable">
						{{ $t('pages.courses.clearTimetable') }}
					</button>

					<!-- Change study plan -->
					<button type="button" class="insis-btn insis-btn-secondary text-sm" @click="handleResetWizard">
						{{ $t('pages.courses.changePlan') }}
					</button>

					<!-- I18n Switcher -->
					<LanguageSwitcher />

					<!-- Mobile menu toggle -->
					<button type="button" class="insis-btn insis-btn-secondary p-2 lg:hidden" @click="uiStore.toggleMobileFilter">
						<IconFunnel class="h-5 w-5" />
					</button>
				</div>
			</div>
		</header>

		<!-- Main Content -->
		<div class="flex flex-1 overflow-hidden">
			<!-- Sidebar / Filter Panel -->
			<aside
				class="filter-sidebar w-72 shrink-0 overflow-y-auto border-r border-[var(--insis-border)] bg-white"
				:class="{
					'hidden lg:block': !uiStore.mobileFilterOpen,
					'fixed inset-0 z-50 w-full sm:w-80 lg:relative lg:w-72': uiStore.mobileFilterOpen,
				}"
			>
				<!-- Mobile filter header -->
				<div v-if="uiStore.mobileFilterOpen" class="flex items-center justify-between border-b border-[var(--insis-border)] p-3 lg:hidden">
					<span class="font-medium">{{ $t('common.filters') }}</span>
					<button type="button" class="text-[var(--insis-gray-500)] hover:text-[var(--insis-text)]" @click="uiStore.closeMobileFilter">✕</button>
				</div>

				<FilterPanel />
			</aside>

			<!-- Mobile filter backdrop -->
			<div v-if="uiStore.mobileFilterOpen" class="fixed inset-0 z-40 bg-black/50 lg:hidden" @click="uiStore.closeMobileFilter" />

			<!-- Content Area -->
			<main class="flex flex-1 flex-col overflow-hidden mt-3">
				<!-- Course Status Summary (above tabs) -->
				<div class="bg-white px-4 mb-2">
					<CourseStatusSummary />
				</div>

				<!-- View Tabs -->
				<div class="bg-white px-4 flex flex-col gap-2">
					<nav class="insis-tabs">
						<button
							type="button"
							class="insis-tab flex items-center"
							:class="{ 'insis-tab-active': uiStore.viewMode === 'list' }"
							@click="uiStore.switchToListView"
						>
							<IconTable class="mr-1.5 h-4 w-4" />
							{{ $t('pages.courses.courseList') }}
							<span v-if="coursesStore.pagination.total" class="ml-1.5 text-xs text-[var(--insis-gray-500)]">
								({{ coursesStore.pagination.total }})
							</span>
						</button>
						<button
							type="button"
							class="insis-tab flex items-center"
							:class="{ 'insis-tab-active': uiStore.viewMode === 'timetable' }"
							@click="uiStore.switchToTimetableView"
						>
							<IconCalendar class="mr-1.5 h-4 w-4" />
							{{ $t('pages.courses.myTimetable') }}
							<span v-if="selectedCoursesCount > 0" class="ml-1.5 text-xs text-[var(--insis-gray-500)]"> ({{ selectedCoursesCount }}) </span>
						</button>
					</nav>
				</div>

				<!-- Content based on view mode -->
				<div class="flex-1 overflow-auto p-4">
					<!-- Loading state -->
					<div v-if="coursesStore.loading" class="flex items-center justify-center py-12">
						<div class="text-center">
							<div class="insis-spinner mx-auto mb-3" />
							<p class="text-sm text-[var(--insis-gray-500)]">{{ $t('pages.courses.loadingCourses') }}</p>
						</div>
					</div>

					<!-- Error state -->
					<div v-else-if="coursesStore.error" class="rounded border border-[var(--insis-danger)] bg-red-50 p-4 text-sm text-[var(--insis-danger)]">
						<p class="font-medium">{{ $t('pages.courses.loadingError') }}</p>
						<p>{{ coursesStore.error }}</p>
						<button type="button" class="mt-2 text-[var(--insis-blue)] hover:underline" @click="coursesStore.fetchCourses">
							{{ $t('common.tryAgain') }}
						</button>
					</div>

					<!-- Course List View -->
					<template v-else-if="uiStore.viewMode === 'list'">
						<!-- Empty state -->
						<div v-if="coursesStore.courses.length === 0" class="py-12 text-center">
							<p class="text-[var(--insis-gray-500)]">{{ $t('pages.courses.noCoursesFound') }}</p>
							<button
								v-if="coursesStore.hasActiveFilters"
								type="button"
								class="mt-2 text-sm text-[var(--insis-blue)] hover:underline"
								@click="coursesStore.resetFilters"
							>
								{{ $t('pages.courses.clearFilters') }}
							</button>
						</div>

						<!-- Course table -->
						<CourseTable v-else />

						<!-- Pagination -->
						<div
							v-if="coursesStore.pagination.total > coursesStore.pagination.limit"
							class="mt-4 flex items-center justify-between border-t border-[var(--insis-border)] pt-4"
						>
							<p class="text-sm text-[var(--insis-gray-500)]">
								{{
									$t('pages.courses.showingResults', {
										from: coursesStore.pagination.offset + 1,
										to: Math.min(coursesStore.pagination.offset + coursesStore.pagination.count, coursesStore.pagination.total),
										total: coursesStore.pagination.total,
									})
								}}
							</p>
							<div class="flex items-center gap-2">
								<button
									type="button"
									class="insis-btn insis-btn-secondary text-sm"
									:disabled="!coursesStore.hasPrevPage"
									@click="() => fetchNextCoursesPage(coursesStore.prevPage)"
								>
									← {{ $t('common.previous') }}
								</button>
								<span class="text-sm text-[var(--insis-gray-500)]">
									{{ $t('pages.courses.pageInfo', { current: coursesStore.currentPage, total: coursesStore.totalPages }) }}
								</span>
								<button
									type="button"
									class="insis-btn insis-btn-secondary text-sm"
									:disabled="!coursesStore.hasNextPage"
									@click="() => fetchNextCoursesPage(coursesStore.nextPage)"
								>
									{{ $t('common.next') }} →
								</button>
							</div>
						</div>
					</template>

					<!-- Timetable View -->
					<template v-else-if="uiStore.viewMode === 'timetable'">
						<!-- Timetable grid -->
						<TimetableGrid>
							<!-- Empty timetable -->
							<div v-if="showEmptyTimetable" class="absolute top-0 left-0 w-full h-full py-12 text-center bg-white/70">
								<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--insis-gray-200)]">
									<IconCalendarMinus2 class="h-8 w-8 text-[var(--insis-gray-500)]" />
								</div>
								<p class="mb-2 font-medium text-[var(--insis-text)]">
									{{ $t('pages.courses.emptyTimetable.title') }}
								</p>
								<p class="mb-4 text-sm text-[var(--insis-gray-600)]">
									{{ $t('pages.courses.emptyTimetable.description') }}
								</p>
								<div class="flex flex-col gap-4 items-center">
									<button type="button" class="insis-btn insis-btn-primary" @click="uiStore.switchToListView">
										{{ $t('pages.courses.emptyTimetable.browseCourses') }}
									</button>
									<button type="button" class="insis-btn insis-btn-secondary" @click="() => (disableEmptyTimetable = true)">
										{{ $t('pages.courses.emptyTimetable.orDragTimetable') }}
									</button>
								</div>
							</div>
						</TimetableGrid>

						<!-- Timetable legend -->
						<div class="mt-4 border-t border-[var(--insis-border)] pt-4">
							<button
								type="button"
								class="flex cursor-pointer items-center gap-2 text-sm text-[var(--insis-gray-500)] hover:text-[var(--insis-text)]"
								@click="uiStore.toggleLegend"
							>
								<span>{{ uiStore.showLegend ? '▼' : '▶' }}</span>
								{{ $t('common.legend') }}
							</button>
							<div v-if="uiStore.showLegend" class="mt-2 flex flex-wrap gap-4 text-xs">
								<div class="flex items-center gap-1.5">
									<span class="h-3 w-3 rounded bg-[var(--insis-block-lecture)]" />
									<span>{{ $t('unitTypes.lecture') }}</span>
								</div>
								<div class="flex items-center gap-1.5">
									<span class="h-3 w-3 rounded bg-[var(--insis-block-exercise)]" />
									<span>{{ $t('unitTypes.exercise') }}</span>
								</div>
								<div class="flex items-center gap-1.5">
									<span class="h-3 w-3 rounded bg-[var(--insis-block-seminar)]" />
									<span>{{ $t('unitTypes.seminar') }}</span>
								</div>
								<div class="flex items-center gap-1.5">
									<span class="h-3 w-3 rounded bg-[var(--insis-block-date-only)]" />
									<span>{{ $t('unitTypes.dateOnly') }}</span>
								</div>
								<div class="flex items-center gap-1.5">
									<span class="h-3 w-3 rounded ring-2 ring-[var(--insis-danger)]" />
									<span>{{ $t('pages.courses.conflict') }}</span>
								</div>
							</div>
						</div>
					</template>
				</div>
			</main>
		</div>
	</div>
</template>

<style scoped>
.filter-sidebar {
	scrollbar-width: thin;
	scrollbar-color: var(--insis-gray-300) transparent;
}

.filter-sidebar::-webkit-scrollbar {
	width: 6px;
}

.filter-sidebar::-webkit-scrollbar-track {
	background: transparent;
}

.filter-sidebar::-webkit-scrollbar-thumb {
	background-color: var(--insis-gray-300);
	border-radius: 3px;
}
</style>
