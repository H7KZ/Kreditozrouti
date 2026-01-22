<script setup lang="ts">
import { CourseWithRelations } from '@api/Database/types'
import { TimetableSlot } from '@api/Interfaces/Timetable.ts'
import { useCoursesApi } from '@client/composables/useApi.ts'
import { useCoursesStore } from '@client/stores/courses.ts'
import { useSelectionStore } from '@client/stores/selection.ts'
import { useTimeTableStore } from '@client/stores/timetable.ts'
import InSISDay from '@scraper/Types/InSISDay.ts'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const selectionStore = useSelectionStore()
const coursesStore = useCoursesStore()
const timetableStore = useTimeTableStore()
const { fetchCourses, loading: apiLoading } = useCoursesApi()

// Selected course for detail panel
const selectedCourse = ref<CourseWithRelations | null>(null)

// Show selection action menu
const showSelectionMenu = ref(false)
const lastSelection = ref<{ days: InSISDay[]; time_from: number; time_to: number } | null>(null)

// Load courses
async function loadCourses() {
	coursesStore.setLoading(true)

	const request = { ...coursesStore.buildRequest }

	// Add study plan context if available
	if (selectionStore.studyPlan) {
		request.study_plan_id = selectionStore.studyPlan.id
	}

	// Add time exclusions
	if (timetableStore.excludedTimes.length > 0) {
		request.exclude_times = timetableStore.excludedTimes
	}

	const response = await fetchCourses(request)

	if (response) {
		coursesStore.setCourses(response.data, response.meta)
		coursesStore.setFacets(response.facets)
	}

	coursesStore.setLoading(false)
}

// Watch for filter changes
watch(
	() => coursesStore.buildRequest,
	() => {
		loadCourses()
	},
	{ deep: true },
)

// Watch for timetable exclusions
watch(
	() => timetableStore.excludedTimes,
	() => {
		loadCourses()
	},
	{ deep: true },
)

// Initial load
onMounted(() => {
	loadCourses()
})

// Handle timetable selection complete
function onSelectionComplete(selection: { days: InSISDay[]; time_from: number; time_to: number }) {
	lastSelection.value = selection
	showSelectionMenu.value = true
}

// Selection menu actions
function excludeSelectedTime() {
	if (lastSelection.value) {
		lastSelection.value.days.forEach((day) => {
			timetableStore.addExcludedTime({
				day,
				time_from: lastSelection.value!.time_from,
				time_to: lastSelection.value!.time_to,
			})
		})
	}
	closeSelectionMenu()
}

function filterBySelectedTime() {
	if (lastSelection.value) {
		// Set time range filter
		coursesStore.setTimeRange(lastSelection.value.time_from, lastSelection.value.time_to)

		// Set day filter
		coursesStore.updateFilter('day', lastSelection.value.days)
	}
	closeSelectionMenu()
}

function closeSelectionMenu() {
	showSelectionMenu.value = false
	lastSelection.value = null
	timetableStore.clearSelection()
}

// Handle course click
function onCourseClick(course: CourseWithRelations) {
	selectedCourse.value = course
}

// Handle slot click in timetable
function onSlotClick(slot: TimetableSlot) {
	// Find the course and show detail
	const course = coursesStore.courses.find((c) => c.id === slot.course_id)
	if (course) {
		selectedCourse.value = course
	}
}

// Add course to timetable
function addCourseToTimetable(course: CourseWithRelations) {
	// Convert course slots to timetable slots
	for (const unit of course.timetable_units) {
		if (!unit.slots) continue

		for (const slot of unit.slots) {
			if (!slot.day || !slot.time_from_minutes || !slot.time_to_minutes) continue
			timetableStore.addSlot({
				course_id: course.id,
				course_ident: course.ident,
				unit_id: unit.id ?? -1,
				slot_id: slot.id ?? -1,
				day: slot.day,
				time_from: slot.time_from_minutes,
				time_to: slot.time_to_minutes,
				location: slot.location,
				lecturer: unit.lecturer,
			})
		}
	}
}

// Context summary
const contextSummary = computed(() => {
	if (!selectionStore.isComplete) return null
	return `${selectionStore.faculty?.title} · ${selectionStore.semester} ${selectionStore.year} · ${selectionStore.studyPlan?.ident}`
})

// Courses that match the selected time range
const matchingCoursesForSelection = computed(() => {
	if (!lastSelection.value) return []

	return coursesStore.courses.filter((course) => {
		// Check if any of the course's slots match the selected time
		return course.timetable_units.some((unit) => {
			if (!unit.slots) return false

			unit.slots.some((slot) => {
				// Check if the slot is on one of the selected days
				if (slot.day && !lastSelection.value!.days.includes(slot.day)) return false

				if (!slot.time_from_minutes) return false
				if (!slot.time_to_minutes) return false
				if (!lastSelection.value?.time_to) return false
				if (!lastSelection.value?.time_from) return false

				// Check if the slot overlaps with the selected time range
				return slot.time_from_minutes < lastSelection.value.time_to && slot.time_to_minutes > lastSelection.value.time_from
			})
		})
	})
})

// Show courses overlay on timetable
const showCoursesOverlay = computed(() => {
	return showSelectionMenu.value && lastSelection.value && matchingCoursesForSelection.value.length > 0
})
</script>

<template>
	<div class="courses-page">
		<!-- Context bar -->
		<div v-if="contextSummary" class="context-bar">
			<span class="context-info">{{ contextSummary }}</span>
			<RouterLink to="/" class="context-change">
				{{ t('common.change') }}
			</RouterLink>
		</div>

		<div class="courses-layout">
			<!-- Left sidebar: Filters -->
			<aside class="filters-sidebar">
				<CourseFilterPanel :facets="coursesStore.facets" @filter-change="loadCourses" />

				<!-- Excluded times list -->
				<div v-if="timetableStore.excludedTimes.length > 0" class="excluded-times-panel">
					<h4>{{ t('timetable.excludedTimes') }}</h4>
					<ul class="excluded-list">
						<li v-for="(excl, index) in timetableStore.excludedTimes" :key="index" class="excluded-item">
							<span>
								{{ excl.day }}
								{{ timetableStore.formatTime(excl.time_from) }}–{{ timetableStore.formatTime(excl.time_to) }}
							</span>
							<button class="remove-btn" @click="timetableStore.removeExcludedTime(index)" :title="t('common.remove')">×</button>
						</li>
					</ul>
					<button class="insis-btn insis-btn-small" @click="timetableStore.clearExcludedTimes()">
						{{ t('timetable.clearExclusions') }}
					</button>
				</div>
			</aside>

			<!-- Main content -->
			<main class="main-content">
				<!-- Timetable -->
				<section class="timetable-section">
					<div class="section-header">
						<h2>{{ t('timetable.title') }}</h2>
						<p class="section-hint">{{ t('timetable.dragHint') }}</p>
					</div>
					<div class="timetable-container">
						<InteractiveTimetable :slots="timetableStore.slots" @selection-complete="onSelectionComplete" @slot-click="onSlotClick" />

						<!-- Courses overlay showing matching courses -->
						<CoursesOverlay
							:courses="matchingCoursesForSelection"
							:selection="lastSelection"
							:visible="showCoursesOverlay"
							@course-click="onCourseClick"
							@close="closeSelectionMenu"
						/>
					</div>

					<!-- Time selection action menu (modal) -->
					<TimeSelectionMenu
						:visible="showSelectionMenu"
						:selection="lastSelection"
						:matching-courses="matchingCoursesForSelection"
						@filter-courses="filterBySelectedTime"
						@exclude-time="excludeSelectedTime"
						@close="closeSelectionMenu"
						@course-click="onCourseClick"
					/>
				</section>

				<!-- Course list -->
				<section class="courses-section">
					<div class="section-header">
						<h2>
							{{ t('courses.title') }}
							<span v-if="coursesStore.total > 0" class="count-badge">
								{{ coursesStore.total }}
							</span>
						</h2>
					</div>
					<CourseList :courses="coursesStore.courses" :loading="coursesStore.loading || apiLoading" @course-click="onCourseClick" />
				</section>
			</main>

			<!-- Right sidebar: Course detail -->
			<aside class="detail-sidebar">
				<CourseDetailPanel :course="selectedCourse" @close="selectedCourse = null" @add-to-timetable="addCourseToTimetable" />
			</aside>
		</div>
	</div>
</template>

<style scoped>
.courses-page {
	display: flex;
	flex-direction: column;
	min-height: calc(100vh - 120px);
}

.context-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10px 16px;
	background: var(--color-insis-table-header);
	border-bottom: 1px solid #ddd;
	margin: -16px -16px 16px;
}

.context-info {
	font-size: 14px;
	font-weight: 500;
	color: #333;
}

.context-change {
	font-size: 13px;
	color: var(--color-insis-link);
}

.courses-layout {
	display: grid;
	grid-template-columns: 280px 1fr 350px;
	gap: 20px;
	flex: 1;
}

.filters-sidebar {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.main-content {
	display: flex;
	flex-direction: column;
	gap: 24px;
	min-width: 0;
}

.detail-sidebar {
	position: sticky;
	top: 16px;
	height: fit-content;
	max-height: calc(100vh - 140px);
}

.section-header {
	display: flex;
	align-items: baseline;
	gap: 12px;
	margin-bottom: 12px;
}

.section-header h2 {
	font-family: Georgia, serif;
	font-size: 18px;
	color: var(--color-insis-primary);
	margin: 0;
	display: flex;
	align-items: center;
	gap: 8px;
}

.count-badge {
	font-size: 13px;
	font-family: Arial, sans-serif;
	background: var(--color-insis-primary);
	color: white;
	padding: 2px 8px;
	border-radius: 10px;
}

.section-hint {
	font-size: 12px;
	color: #888;
	margin: 0;
}

.timetable-section {
	position: relative;
}

.timetable-container {
	position: relative;
	overflow: hidden;
	border-radius: 4px;
}

/* Excluded times panel */
.excluded-times-panel {
	padding: 16px;
	background: white;
	border: 1px solid #ddd;
	border-radius: 4px;
}

.excluded-times-panel h4 {
	font-size: 14px;
	margin: 0 0 12px;
	color: #333;
}

.excluded-list {
	list-style: none;
	margin: 0 0 12px;
	padding: 0;
}

.excluded-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 6px 8px;
	background: repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(200, 0, 0, 0.05) 4px, rgba(200, 0, 0, 0.05) 8px);
	border: 1px solid rgba(200, 0, 0, 0.2);
	border-radius: 4px;
	margin-bottom: 6px;
	font-size: 13px;
}

.excluded-item .remove-btn {
	background: transparent;
	border: none;
	color: var(--color-insis-error);
	cursor: pointer;
	font-size: 16px;
	padding: 0 4px;
}

/* Responsive adjustments */
@media (max-width: 1400px) {
	.courses-layout {
		grid-template-columns: 260px 1fr 300px;
	}
}

@media (max-width: 1200px) {
	.courses-layout {
		grid-template-columns: 240px 1fr;
	}

	.detail-sidebar {
		display: none;
	}
}

@media (max-width: 900px) {
	.courses-layout {
		grid-template-columns: 1fr;
	}

	.filters-sidebar {
		order: 2;
	}
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
	transition:
		opacity 0.2s,
		transform 0.2s;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
	transform: translateX(-50%) translateY(10px);
}
</style>
