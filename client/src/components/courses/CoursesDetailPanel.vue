<script setup lang="ts">
import { CourseWithRelations } from '@api/Database/types'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
	course: CourseWithRelations | null
}>()

const emit = defineEmits<{
	(e: 'close'): void
	(e: 'add-to-timetable', course: CourseWithRelations): void
}>()

const { t } = useI18n()

// Format time
function formatTime(minutes: number): string {
	const hours = Math.floor(minutes / 60)
	const mins = minutes % 60
	return `${hours}:${mins.toString().padStart(2, '0')}`
}

// Group slots by unit
const groupedUnits = computed(() => {
	if (!props.course?.timetable_units) return []

	return props.course.timetable_units.map((unit) => ({
		...unit,
		slots: unit.slots?.map((slot) => ({
			...slot,
			timeDisplay: `${slot.day} ${formatTime(slot.time_from_minutes ?? 0)}-${formatTime(slot.time_to_minutes ?? 1440)}`,
		})),
	}))
})

function addToTimetable() {
	if (props.course) {
		emit('add-to-timetable', props.course)
	}
}
</script>

<template>
	<div class="course-detail-panel" v-if="course">
		<div class="panel-header">
			<div class="course-header-info">
				<span class="course-ident">{{ course.ident }}</span>
				<h3 class="course-title">{{ course.title }}</h3>
			</div>
			<button class="close-btn" @click="emit('close')" :title="t('common.close')">×</button>
		</div>

		<div class="panel-content">
			<!-- Course meta info -->
			<div class="course-meta-grid">
				<div class="meta-item">
					<span class="meta-label">{{ t('courses.detail.faculty') }}</span>
					<span class="meta-value">{{ course.faculty_id }}</span>
				</div>
				<div class="meta-item">
					<span class="meta-label">{{ t('courses.detail.ects') }}</span>
					<span class="meta-value ects">{{ course.ects }} {{ t('courses.detail.credits') }}</span>
				</div>
				<div class="meta-item">
					<span class="meta-label">{{ t('courses.detail.semester') }}</span>
					<span class="meta-value">{{ course.semester }} {{ course.year }}</span>
				</div>
				<div class="meta-item">
					<span class="meta-label">{{ t('courses.detail.language') }}</span>
					<span class="meta-value">{{ course.languages }}</span>
				</div>
				<div class="meta-item">
					<span class="meta-label">{{ t('courses.detail.completion') }}</span>
					<span class="meta-value">{{ course.mode_of_completion }}</span>
				</div>
			</div>

			<!-- Schedule / Units -->
			<div class="course-schedule" v-if="groupedUnits.length > 0">
				<h4>{{ t('courses.detail.schedule') }}</h4>

				<div v-for="unit in groupedUnits" :key="unit.id" class="unit-block">
					<table class="slots-table insis-table">
						<thead>
							<tr>
								<th>{{ t('courses.detail.time') }}</th>
								<th>{{ t('courses.detail.room') }}</th>
								<th>{{ t('courses.detail.lecturer') }}</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="slot in unit.slots" :key="slot.id">
								<td>{{ slot.timeDisplay }}</td>
								<td>{{ slot.location || '—' }}</td>
								<td>{{ unit.lecturer || '—' }}</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>

		<div class="panel-footer">
			<a :href="`https://insis.vse.cz/katalog/?kod=${course.ident}`" target="_blank" rel="noopener" class="insis-btn">
				{{ t('courses.detail.viewInInsis') }} ↗
			</a>
			<button class="insis-btn insis-btn-primary" @click="addToTimetable">
				{{ t('courses.detail.addToTimetable') }}
			</button>
		</div>
	</div>

	<!-- Empty state -->
	<div v-else class="course-detail-empty">
		<p>{{ t('courses.detail.selectCourse') }}</p>
	</div>
</template>

<style scoped>
.course-detail-panel {
	display: flex;
	flex-direction: column;
	height: 100%;
	background: white;
	border: 1px solid #ddd;
	border-radius: 4px;
}

.panel-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	padding: 16px;
	border-bottom: 1px solid #ddd;
	background: var(--color-insis-table-row-even);
}

.course-header-info {
	flex: 1;
}

.course-ident {
	font-size: 12px;
	color: #666;
}

.course-title {
	margin: 4px 0 0;
	font-size: 16px;
	color: var(--color-insis-primary-dark);
	font-family: Georgia, serif;
}

.close-btn {
	background: transparent;
	border: none;
	font-size: 24px;
	color: #999;
	cursor: pointer;
	padding: 0 8px;
	line-height: 1;
}

.close-btn:hover {
	color: #333;
}

.panel-content {
	flex: 1;
	overflow-y: auto;
	padding: 16px;
}

.course-meta-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 12px;
	margin-bottom: 20px;
}

.meta-item {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.meta-label {
	font-size: 11px;
	color: #666;
	text-transform: uppercase;
}

.meta-value {
	font-size: 14px;
	color: #333;
}

.meta-value.ects {
	font-weight: bold;
	color: var(--color-insis-primary);
}

.group-badge {
	display: inline-block;
	padding: 2px 8px;
	background: var(--color-insis-primary);
	color: white;
	border-radius: 3px;
	font-weight: bold;
}

.course-annotation {
	margin-bottom: 20px;
}

.course-annotation h4 {
	font-size: 13px;
	font-weight: 500;
	margin: 0 0 8px;
	color: #333;
}

.course-annotation p {
	font-size: 13px;
	line-height: 1.5;
	color: #555;
	margin: 0;
}

.course-schedule h4 {
	font-size: 13px;
	font-weight: 500;
	margin: 0 0 12px;
	color: #333;
}

.unit-block {
	margin-bottom: 16px;
}

.unit-header {
	margin-bottom: 8px;
}

.unit-type-badge {
	display: inline-block;
	padding: 4px 10px;
	border-radius: 4px;
	font-size: 12px;
	font-weight: 500;
}

.unit-type-badge.lecture {
	background: var(--color-insis-lecture);
}

.unit-type-badge.seminar {
	background: var(--color-insis-seminar);
}

.unit-type-badge.lab {
	background: #e1bee7;
}

.unit-type-badge.other {
	background: #eee;
}

.slots-table {
	font-size: 12px;
}

.slots-table th,
.slots-table td {
	padding: 6px 10px;
}

.capacity-badge {
	font-size: 12px;
}

.capacity-badge.warning {
	color: var(--color-insis-warning);
}

.capacity-badge.full {
	color: var(--color-insis-error);
	font-weight: bold;
}

.panel-footer {
	display: flex;
	gap: 12px;
	padding: 16px;
	border-top: 1px solid #ddd;
	background: #fafafa;
}

.panel-footer .insis-btn {
	flex: 1;
}

.course-detail-empty {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	padding: 40px;
	color: #666;
	text-align: center;
	background: #fafafa;
	border: 1px dashed #ddd;
	border-radius: 4px;
}
</style>
