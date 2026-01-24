<script setup lang="ts">
import { Course, StudyPlan } from '@api/Database/types'
import CourseTable from '@client/components/courses/CourseTable.vue'
import FilterPanel from '@client/components/courses/FilterPanel.vue'
import TimetablePreview from '@client/components/courses/TimetablePreview.vue'
import StudyPlanWizard from '@client/components/wizard/StudyPlanWizard.vue'
import { useCourseFilters } from '@client/stores/courseFilters'
import { useCourseSearch } from '@client/stores/courseSearch'
import { useStudentContext } from '@client/stores/studentContext'
import { storeToRefs } from 'pinia'
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const courseSearch = useCourseSearch()
const courseFilters = useCourseFilters()
const studentContext = useStudentContext()

const { courses, isLoading, error, meta, currentPage, totalPages, totalResults, facets } = storeToRefs(courseSearch)
const { isWizardComplete, selectedStudyPlan } = storeToRefs(studentContext)

// View state
const activeTab = ref<'list' | 'timetable'>('list')
const selectedCourse = ref<Course | null>(null)

// Auto-search when study plan is selected
watch(isWizardComplete, (complete) => {
	if (complete) {
		courseSearch.search()
	}
})

// Auto-search when filters change
watch(
	() => courseFilters.apiFilter,
	() => {
		if (isWizardComplete.value) {
			courseSearch.search()
		}
	},
	{ deep: true },
)

onMounted(() => {
	// If already has a study plan selected, search immediately
	if (isWizardComplete.value) {
		courseSearch.search()
	}
})

function handleWizardComplete(studyPlan: StudyPlan) {
	console.log('Study plan selected:', studyPlan)
	courseSearch.search()
}

function handleCourseSelect(course: Course) {
	selectedCourse.value = course
	// Could open a detail modal here
}

function handlePageChange(page: number) {
	courseSearch.goToPage(page)
	courseSearch.search()
}
</script>

<template>
	<div class="course-browser">
		<!-- Header -->
		<div class="mb-4">
			<h1 class="text-xl font-bold text-[var(--insis-gray-900)]">{{ t('search.title') }}</h1>
			<div class="insis-breadcrumbs">
				<a href="/">{{ t('search.breadcrumbs.home') }}</a>
				<span class="separator">»</span>
				<span class="current">{{ t('search.breadcrumbs.search') }}</span>
			</div>
		</div>

		<!-- No Study Plan Notice (shown when user skipped wizard) -->
		<div v-if="isWizardComplete && !selectedStudyPlan" class="bg-[#fef3c7] border border-[#f59e0b] text-[#92400e] px-4 py-3 rounded mb-4">
			<div class="flex items-center gap-2">
				<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<span class="text-sm flex-1">
					{{ t('courses.noStudyPlanNotice') }}
				</span>
				<a href="/" class="text-sm font-medium hover:underline cursor-pointer"> {{ t('wizard.select') }} → </a>
			</div>
		</div>

		<!-- Study Plan Wizard -->
		<StudyPlanWizard @complete="handleWizardComplete" />

		<!-- Main Content (only shown when wizard is complete or user wants to search without plan) -->
		<div v-if="isWizardComplete" class="course-browser-content mt-6">
			<div class="flex flex-col lg:flex-row gap-0 h-[calc(100vh-200px)]">
				<!-- Filter Sidebar -->
				<FilterPanel :facets="facets ?? undefined" :loading="isLoading" />

				<!-- Main Results Area -->
				<div class="flex-1 min-w-0 p-6 overflow-auto">
					<!-- Results Header -->
					<div class="flex items-center justify-between mb-4">
						<div class="text-sm text-[var(--insis-gray-600)]">
							<template v-if="meta">
								{{ t('search.resultsCount', { count: totalResults }) }}
								<span v-if="selectedStudyPlan">
									{{ t('search.inStudyPlan', { plan: selectedStudyPlan.title }) }}
								</span>
							</template>
						</div>

						<!-- View Tabs -->
						<div class="insis-tabs border-b-0">
							<button class="insis-tab cursor-pointer" :class="{ active: activeTab === 'list' }" @click="activeTab = 'list'">
								{{ t('search.tabs.list') }}
							</button>
							<button class="insis-tab cursor-pointer" :class="{ active: activeTab === 'timetable' }" @click="activeTab = 'timetable'">
								{{ t('search.tabs.timetable') }}
							</button>
						</div>
					</div>

					<!-- Error State -->
					<div v-if="error" class="insis-panel-danger mb-4">
						{{ error }}
						<button class="insis-btn insis-btn-sm ml-2 cursor-pointer" @click="courseSearch.search()">{{ t('errors.tryAgain') }}</button>
					</div>

					<!-- Tab Content -->
					<div class="insis-tab-content">
						<!-- List View -->
						<div v-if="activeTab === 'list'">
							<CourseTable :courses="courses" :loading="isLoading" @select="handleCourseSelect" />

							<!-- Pagination -->
							<div v-if="totalPages > 1" class="flex items-center justify-between mt-4 pt-4 border-t border-[var(--insis-border)]">
								<div class="text-sm text-[var(--insis-gray-600)]">
									{{ t('search.pagination.page', { current: currentPage, total: totalPages }) }}
								</div>
								<div class="flex gap-1">
									<button
										class="insis-btn insis-btn-sm cursor-pointer"
										:disabled="currentPage <= 1"
										@click="handlePageChange(currentPage - 1)"
									>
										{{ t('search.pagination.previous') }}
									</button>
									<button
										v-for="page in Math.min(5, totalPages)"
										:key="page"
										class="insis-btn insis-btn-sm cursor-pointer"
										:class="{ 'insis-btn-primary': page === currentPage }"
										@click="handlePageChange(page)"
									>
										{{ page }}
									</button>
									<template v-if="totalPages > 5">
										<span class="px-2">...</span>
										<button
											class="insis-btn insis-btn-sm cursor-pointer"
											:class="{ 'insis-btn-primary': totalPages === currentPage }"
											@click="handlePageChange(totalPages)"
										>
											{{ totalPages }}
										</button>
									</template>
									<button
										class="insis-btn insis-btn-sm cursor-pointer"
										:disabled="currentPage >= totalPages"
										@click="handlePageChange(currentPage + 1)"
									>
										{{ t('search.pagination.next') }}
									</button>
								</div>
							</div>
						</div>

						<!-- Timetable View -->
						<div v-else-if="activeTab === 'timetable'">
							<TimetablePreview :courses="courses" />
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Quick Search (when wizard not complete) -->
		<div v-else class="mt-6">
			<div class="insis-panel-info">
				<p class="text-sm">
					{{ t('search.noContext') }}
					<button class="text-[var(--insis-link)] underline cursor-pointer hover:no-underline" @click="studentContext.skipWizard()">
						{{ t('wizard.skip') }}
					</button>
					{{ t('wizard.skipWithoutPlan') }}.
				</p>
			</div>
		</div>
	</div>
</template>

<style scoped>
.course-browser {
	max-width: 1400px;
	margin: 0 auto;
	padding: 1rem;
}
</style>
