<script setup lang="ts">
import CourseTable from '@client/components/courses/CourseTable.vue'
import SearchSidebar from '@client/components/courses/SearchSidebar.vue'
import TimetablePreview from '@client/components/courses/TimetablePreview.vue'
import StudyPlanWizard from '@client/components/wizard/StudyPlanWizard.vue'
import { useCourseSearch } from '@client/stores/courseSearch'
import { useStudentContext } from '@client/stores/studentContext'
import type { Course } from '@client/types/courses'
import type { StudyPlan } from '@client/types/studyPlans'
import { storeToRefs } from 'pinia'
import { onMounted, ref, watch } from 'vue'

const courseSearch = useCourseSearch()
const studentContext = useStudentContext()

const { courses, isLoading, error, meta, currentPage, totalPages, totalResults } = storeToRefs(courseSearch)
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
			<h1 class="text-xl font-bold text-[var(--insis-gray-900)]">Vyhledávání předmětů</h1>
			<div class="insis-breadcrumbs">
				<a href="/">Úvodní stránka</a>
				<span class="separator">»</span>
				<span class="current">Vyhledávání předmětů</span>
			</div>
		</div>

		<!-- Study Plan Wizard -->
		<StudyPlanWizard @complete="handleWizardComplete" />

		<!-- Main Content (only shown when wizard is complete or user wants to search without plan) -->
		<div v-if="isWizardComplete" class="course-browser-content mt-6">
			<div class="flex flex-col lg:flex-row gap-6">
				<!-- Sidebar -->
				<div class="lg:w-72 flex-shrink-0">
					<SearchSidebar />
				</div>

				<!-- Main Results Area -->
				<div class="flex-1 min-w-0">
					<!-- Results Header -->
					<div class="flex items-center justify-between mb-4">
						<div class="text-sm text-[var(--insis-gray-600)]">
							<template v-if="meta">
								Nalezeno <strong>{{ totalResults }}</strong> předmětů
								<span v-if="selectedStudyPlan">
									ve studijním plánu <strong>{{ selectedStudyPlan.title }}</strong>
								</span>
							</template>
						</div>

						<!-- View Tabs -->
						<div class="insis-tabs border-b-0">
							<button class="insis-tab" :class="{ active: activeTab === 'list' }" @click="activeTab = 'list'">Seznam</button>
							<button class="insis-tab" :class="{ active: activeTab === 'timetable' }" @click="activeTab = 'timetable'">Rozvrh</button>
						</div>
					</div>

					<!-- Error State -->
					<div v-if="error" class="insis-panel-danger mb-4">
						{{ error }}
						<button class="insis-btn insis-btn-sm ml-2" @click="courseSearch.search()">Zkusit znovu</button>
					</div>

					<!-- Tab Content -->
					<div class="insis-tab-content">
						<!-- List View -->
						<div v-if="activeTab === 'list'">
							<CourseTable :courses="courses" :loading="isLoading" @select="handleCourseSelect" />

							<!-- Pagination -->
							<div v-if="totalPages > 1" class="flex items-center justify-between mt-4 pt-4 border-t border-[var(--insis-border)]">
								<div class="text-sm text-[var(--insis-gray-600)]">Stránka {{ currentPage }} z {{ totalPages }}</div>
								<div class="flex gap-1">
									<button class="insis-btn insis-btn-sm" :disabled="currentPage <= 1" @click="handlePageChange(currentPage - 1)">
										← Předchozí
									</button>
									<button
										v-for="page in Math.min(5, totalPages)"
										:key="page"
										class="insis-btn insis-btn-sm"
										:class="{ 'insis-btn-primary': page === currentPage }"
										@click="handlePageChange(page)"
									>
										{{ page }}
									</button>
									<template v-if="totalPages > 5">
										<span class="px-2">...</span>
										<button
											class="insis-btn insis-btn-sm"
											:class="{ 'insis-btn-primary': totalPages === currentPage }"
											@click="handlePageChange(totalPages)"
										>
											{{ totalPages }}
										</button>
									</template>
									<button class="insis-btn insis-btn-sm" :disabled="currentPage >= totalPages" @click="handlePageChange(currentPage + 1)">
										Další →
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
					Vyberte nejprve studijní plán výše, nebo
					<button class="text-[var(--insis-link)] underline" @click="studentContext.goToStep('complete' as any)">přeskočte na vyhledávání</button>
					bez kontextu studijního plánu.
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
