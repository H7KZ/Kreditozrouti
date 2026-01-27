<script setup lang="ts">
import LanguageSwitcher from '@client/components/common/LanguageSwitcher.vue'
import CourseTable from '@client/components/courses/CourseTable.vue'
import FilterPanel from '@client/components/filters/FilterPanel.vue'
import TimetableGrid from '@client/components/timetable/TimetableGrid.vue'
import { useCoursesStore, useTimetableStore, useUIStore, useWizardStore } from '@client/stores'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

/*
 * Courses Page
 * Main course browser with filters, list view, and timetable view.
 */

const { t } = useI18n({ useScope: 'global' })
const router = useRouter()
const coursesStore = useCoursesStore()
const timetableStore = useTimetableStore()
const uiStore = useUIStore()
const wizardStore = useWizardStore()

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

const disableEmptyTimetable = ref(false)
const showEmptyTimetable = computed(() => uiStore.viewMode === 'timetable' && timetableStore.selectedCourseIds.length === 0 && !disableEmptyTimetable.value)

/** Selected study plan display */
const studyPlanInfo = computed(() => ({
	title: wizardStore.studyPlanTitle || t('pages.courses.studyPlanFallback'),
	ident: wizardStore.studyPlanIdent || '',
}))

const coursesInfo = computed(() => ({
	years: coursesStore.filters.years,
	semester:
		coursesStore.filters.semesters?.length === 1
			? coursesStore.filters.semesters[0] === 'ZS'
				? t('semesters.ZS')
				: t('semesters.LS')
			: t('semesters.full_year'),
}))

/** Selected courses count */
const selectedCoursesCount = computed(() => timetableStore.selectedCourseIds.length)

/** Whether there are time conflicts */
const hasConflicts = computed(() => timetableStore.hasConflicts)

/** Reset wizard and go back */
function handleResetWizard() {
	if (!confirm(t('pages.courses.changePlanConfirm'))) return
	wizardStore.reset()
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
						<span class="font-semibold text-[var(--insis-blue)]"> {{ $t('pages.index.title') }} </span>
					</router-link>

					<div class="hidden border-l border-[var(--insis-border)] pl-4 sm:block">
						<p class="text-sm font-medium text-[var(--insis-text)]">
							{{ studyPlanInfo.title }}
						</p>
						<p class="text-xs text-[var(--insis-gray-500)]">
							{{ studyPlanInfo.ident }} · {{ coursesInfo.years?.join(' - ') ?? '-' }} · {{ coursesInfo.semester }}
						</p>
					</div>
				</div>

				<!-- Right: Actions and timetable summary -->
				<div class="flex items-center gap-4">
					<!-- Selected courses badge -->
					<div v-if="selectedCoursesCount > 0" class="hidden items-center gap-2 sm:flex">
						<span class="insis-badge insis-badge-success"> {{ $t('pages.courses.coursesInTimetable', { count: selectedCoursesCount }) }} </span>
						<button
							type="button"
							class="text-xs cursor-pointer text-[var(--insis-gray-500)] hover:text-[var(--insis-danger)]"
							:title="$t('pages.courses.clearTimetable')"
							@click="handleClearTimetable"
						>
							✕
						</button>
					</div>

					<!-- Conflict warning -->
					<span v-if="hasConflicts" class="insis-badge insis-badge-danger" :title="$t('pages.courses.conflictTitle')">
						⚠️ {{ $t('pages.courses.conflict') }}
					</span>

					<div class="flex items-center gap-4">
						<!-- Change study plan -->
						<button type="button" class="insis-btn insis-btn-secondary text-sm" @click="handleResetWizard">
							{{ $t('pages.courses.changePlan') }}
						</button>

						<!-- I18n Switcher -->
						<LanguageSwitcher />

						<!-- Mobile menu toggle -->
						<button type="button" class="insis-btn insis-btn-secondary p-2 lg:hidden" @click="uiStore.toggleMobileFilter">
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
								/>
							</svg>
						</button>
					</div>
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
				<!-- View Tabs -->
				<div class="bg-white px-4">
					<nav class="insis-tabs">
						<button
							type="button"
							class="insis-tab flex items-center"
							:class="{ 'insis-tab-active': uiStore.viewMode === 'list' }"
							@click="uiStore.switchToListView"
						>
							<svg class="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
							</svg>
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
							<svg class="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
								/>
							</svg>
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
									<svg class="h-8 w-8 text-[var(--insis-gray-500)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
										/>
									</svg>
								</div>
								<p class="mb-2 font-medium text-[var(--insis-text)]">{{ $t('pages.courses.emptyTimetable.title') }}</p>
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
