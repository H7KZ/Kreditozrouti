<script setup lang="ts">
import { CourseWithRelations } from '@api/Database/types'
import { useCoursesStore } from '@client/stores/courses.ts'
import { useI18n } from 'vue-i18n'

defineProps<{
	courses: CourseWithRelations[]
	loading?: boolean
}>()

const emit = defineEmits<{
	(e: 'course-click', course: CourseWithRelations): void
	(e: 'course-select', course: CourseWithRelations): void
}>()

const { t } = useI18n()
const coursesStore = useCoursesStore()

// Get course schedule summary
function getScheduleSummary(course: CourseWithRelations): string {
	if (!course.timetable_units || course.timetable_units.length === 0) return '—'

	const slots = course.timetable_units.flatMap((u) => u.slots)
	if (slots.length === 0) return '—'

	// Group by day and show unique times
	const schedules = slots.map((s) => {
		const from = formatTime(s?.time_from_minutes ?? 0)
		const to = formatTime(s?.time_to_minutes ?? 1440)
		return `${s?.day} ${from}-${to}`
	})

	return [...new Set(schedules)].slice(0, 2).join(', ') + (schedules.length > 2 ? '…' : '')
}

function formatTime(minutes: number): string {
	const hours = Math.floor(minutes / 60)
	const mins = minutes % 60
	return `${hours}:${mins.toString().padStart(2, '0')}`
}

// Check if course is selected
function isSelected(courseId: number): boolean {
	return coursesStore.selectedCourseIds.has(courseId)
}

function toggleSelection(course: CourseWithRelations, event: Event) {
	event.stopPropagation()
	coursesStore.toggleCourseSelection(course.id)
	emit('course-select', course)
}

function onCourseClick(course: CourseWithRelations) {
	emit('course-click', course)
}
</script>

<template>
	<div class="course-list-wrapper">
		<!-- Loading state -->
		<div v-if="loading" class="insis-loading">
			<div class="insis-spinner"></div>
			<span>{{ t('common.loading') }}</span>
		</div>

		<!-- Empty state -->
		<div v-else-if="courses.length === 0" class="course-list-empty">
			<p>{{ t('courses.noResults') }}</p>
		</div>

		<!-- Course table -->
		<table v-else class="insis-table course-table">
			<thead>
				<tr>
					<th class="col-select"></th>
					<th class="col-status">{{ t('courses.columns.status') }}</th>
					<th class="col-ident">{{ t('courses.columns.ident') }}</th>
					<th class="col-title">{{ t('courses.columns.title') }}</th>
					<th class="col-faculty">{{ t('courses.columns.faculty') }}</th>
					<th class="col-category">{{ t('courses.columns.category') }}</th>
					<th class="col-ects">{{ t('courses.columns.ects') }}</th>
					<th class="col-language">{{ t('courses.columns.language') }}</th>
					<th class="col-schedule">{{ t('courses.columns.schedule') }}</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="course in courses" :key="course.id" class="course-row" :class="{ selected: isSelected(course.id) }" @click="onCourseClick(course)">
					<td class="col-select">
						<label class="insis-checkbox" @click.stop>
							<input type="checkbox" :checked="isSelected(course.id)" @change="toggleSelection(course, $event)" />
						</label>
					</td>
					<td class="col-status">
						<span class="status-indicator" :class="{ available: true }" :title="t('courses.status.available')"></span>
					</td>
					<td class="col-ident">
						<a class="course-link" @click.stop="onCourseClick(course)">
							{{ course.ident }}
						</a>
					</td>
					<td class="col-title">
						<div class="course-title-cell">
							<span class="course-title">{{ course.title }}</span>
						</div>
					</td>
					<td class="col-faculty">
						<span class="faculty-badge">{{ course.faculty_id }}</span>
					</td>
					<td class="col-ects">
						<span class="insis-course-ects">{{ course.ects }}</span>
					</td>
					<td class="col-language">{{ course.languages }}</td>
					<td class="col-schedule">
						<span class="schedule-summary">{{ getScheduleSummary(course) }}</span>
					</td>
				</tr>
			</tbody>
		</table>

		<!-- Pagination -->
		<div v-if="courses.length > 0" class="course-list-pagination">
			<span class="pagination-info">
				{{
					t('courses.pagination.showing', {
						from: coursesStore.offset + 1,
						to: Math.min(coursesStore.offset + courses.length, coursesStore.total),
						total: coursesStore.total,
					})
				}}
			</span>
			<div class="pagination-controls">
				<button class="insis-btn" :disabled="coursesStore.currentPage <= 1" @click="coursesStore.setPage(coursesStore.currentPage - 1)">
					« {{ t('common.prev') }}
				</button>
				<span class="page-indicator"> {{ coursesStore.currentPage }} / {{ coursesStore.totalPages }} </span>
				<button
					class="insis-btn"
					:disabled="coursesStore.currentPage >= coursesStore.totalPages"
					@click="coursesStore.setPage(coursesStore.currentPage + 1)"
				>
					{{ t('common.next') }} »
				</button>
			</div>
		</div>
	</div>
</template>

<style scoped>
.course-list-wrapper {
	background: white;
	border: 1px solid #ddd;
	border-radius: 4px;
}

.course-list-empty {
	padding: 40px 20px;
	text-align: center;
	color: #666;
}

.course-table {
	width: 100%;
	margin: 0;
}

.course-table th {
	position: sticky;
	top: 0;
	z-index: 1;
}

.col-select {
	width: 40px;
	text-align: center;
}

.col-status {
	width: 30px;
	text-align: center;
}

.col-ident {
	width: 100px;
}

.col-title {
	min-width: 200px;
}

.col-faculty {
	width: 60px;
	text-align: center;
}

.col-category {
	width: 140px;
}

.col-ects {
	width: 50px;
	text-align: center;
}

.col-language {
	width: 50px;
	text-align: center;
}

.col-schedule {
	width: 150px;
}

.course-row {
	cursor: pointer;
	transition: background-color 0.1s;
}

.course-row:hover {
	background-color: var(--color-insis-table-hover) !important;
}

.course-row.selected {
	background-color: rgba(0, 149, 213, 0.1) !important;
}

.status-indicator {
	display: inline-block;
	width: 12px;
	height: 12px;
	border-radius: 50%;
	background: #ccc;
}

.status-indicator.available {
	background: var(--color-insis-success);
}

.course-link {
	color: var(--color-insis-link);
	text-decoration: none;
	font-weight: 500;
}

.course-link:hover {
	text-decoration: underline;
}

.course-title-cell {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.course-title {
	font-weight: 500;
}

.course-annotation {
	font-size: 11px;
	color: #666;
	line-height: 1.3;
}

.faculty-badge {
	display: inline-block;
	padding: 2px 6px;
	background: var(--color-insis-table-header);
	border-radius: 3px;
	font-size: 11px;
	font-weight: 500;
}

.category-badge {
	display: inline-block;
	padding: 2px 8px;
	border-radius: 3px;
	font-size: 11px;
}

.group-badge {
	display: inline-block;
	margin-left: 4px;
	padding: 2px 6px;
	background: #eee;
	border-radius: 3px;
	font-size: 11px;
	font-weight: bold;
}

.schedule-summary {
	font-size: 12px;
	color: #555;
}

.course-list-pagination {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	border-top: 1px solid #ddd;
	background: var(--color-insis-table-row-even);
}

.pagination-info {
	font-size: 13px;
	color: #666;
}

.pagination-controls {
	display: flex;
	align-items: center;
	gap: 12px;
}

.page-indicator {
	font-size: 13px;
	color: #333;
}
</style>
