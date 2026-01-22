<script setup lang="ts">
import { CourseWithRelations } from '@api/Database/types'
import InSISDay from '@scraper/Types/InSISDay.ts'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
	visible: boolean
	selection: {
		days: InSISDay[]
		time_from: number
		time_to: number
	} | null
	matchingCourses?: CourseWithRelations[]
	position?: { x: number; y: number }
}>()

const emit = defineEmits<{
	(e: 'filter-courses'): void
	(e: 'exclude-time'): void
	(e: 'close'): void
	(e: 'course-click', course: CourseWithRelations): void
}>()

const { t } = useI18n()

// Format time from minutes
function formatTime(minutes: number): string {
	const hours = Math.floor(minutes / 60)
	const mins = minutes % 60
	return `${hours}:${mins.toString().padStart(2, '0')}`
}

const timeRangeDisplay = computed(() => {
	if (!props.selection) return ''
	return `${props.selection.days.join(', ')} ${formatTime(props.selection.time_from)}–${formatTime(props.selection.time_to)}`
})

const hasMatchingCourses = computed(() => {
	return props.matchingCourses && props.matchingCourses.length > 0
})
</script>

<template>
	<Teleport to="body">
		<Transition name="menu-fade">
			<div v-if="visible && selection" class="time-selection-menu-overlay" @click.self="emit('close')">
				<div class="time-selection-menu" :style="position ? { left: `${position.x}px`, top: `${position.y}px` } : {}">
					<!-- Header with time range -->
					<div class="menu-header">
						<span class="time-range">{{ timeRangeDisplay }}</span>
						<button class="close-btn" @click="emit('close')">×</button>
					</div>

					<!-- Matching courses preview -->
					<div v-if="hasMatchingCourses" class="matching-courses">
						<div class="matching-header">
							<span class="matching-label">{{ t('timetable.matchingCourses') }}:</span>
							<span class="matching-count">{{ matchingCourses!.length }}</span>
						</div>
						<ul class="course-preview-list">
							<li
								v-for="course in matchingCourses!.slice(0, 5)"
								:key="course.id"
								class="course-preview-item"
								@click="emit('course-click', course)"
							>
								<span class="course-ident">{{ course.ident }}</span>
								<span class="course-title">{{ course.title }}</span>
							</li>
						</ul>
						<div v-if="matchingCourses!.length > 5" class="more-courses">
							{{ t('timetable.andMoreCourses', { count: matchingCourses!.length - 5 }) }}
						</div>
					</div>

					<!-- No matching courses -->
					<div v-else class="no-courses">
						<p>{{ t('timetable.noCoursesInTime') }}</p>
					</div>

					<!-- Actions -->
					<div class="menu-actions">
						<button class="action-btn action-filter" @click="emit('filter-courses')">
							<span class="action-icon">🔍</span>
							<span class="action-text">{{ t('timetable.filterByTime') }}</span>
						</button>
						<button class="action-btn action-exclude" @click="emit('exclude-time')">
							<span class="action-icon">🚫</span>
							<span class="action-text">{{ t('timetable.excludeTime') }}</span>
						</button>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<style scoped>
.time-selection-menu-overlay {
	position: fixed;
	inset: 0;
	z-index: 1000;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(0, 0, 0, 0.1);
}

.time-selection-menu {
	background: white;
	border-radius: 8px;
	box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
	min-width: 320px;
	max-width: 400px;
	overflow: hidden;
}

.menu-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14px 16px;
	background: var(--color-insis-header-bg);
	color: white;
}

.time-range {
	font-weight: 500;
	font-size: 15px;
}

.close-btn {
	background: transparent;
	border: none;
	color: white;
	font-size: 22px;
	cursor: pointer;
	opacity: 0.8;
	padding: 0 4px;
	line-height: 1;
}

.close-btn:hover {
	opacity: 1;
}

.matching-courses {
	padding: 12px 16px;
	background: var(--color-insis-table-header);
	border-bottom: 1px solid #ddd;
}

.matching-header {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 10px;
}

.matching-label {
	font-size: 13px;
	font-weight: 500;
	color: #333;
}

.matching-count {
	background: var(--color-insis-primary);
	color: white;
	font-size: 12px;
	font-weight: bold;
	padding: 2px 8px;
	border-radius: 10px;
}

.course-preview-list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.course-preview-item {
	display: flex;
	align-items: baseline;
	gap: 8px;
	padding: 6px 8px;
	margin: 0 -8px;
	border-radius: 4px;
	cursor: pointer;
	transition: background-color 0.1s;
}

.course-preview-item:hover {
	background: rgba(0, 149, 213, 0.1);
}

.course-ident {
	font-size: 12px;
	font-weight: bold;
	color: var(--color-insis-link);
	min-width: 70px;
}

.course-title {
	font-size: 13px;
	color: #333;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.more-courses {
	font-size: 12px;
	color: #666;
	margin-top: 8px;
	font-style: italic;
}

.no-courses {
	padding: 20px 16px;
	text-align: center;
}

.no-courses p {
	margin: 0;
	font-size: 13px;
	color: #666;
}

.menu-actions {
	display: flex;
	gap: 8px;
	padding: 12px 16px;
}

.action-btn {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6px;
	padding: 12px 8px;
	border: 1px solid #ddd;
	border-radius: 6px;
	background: white;
	cursor: pointer;
	transition: all 0.15s;
}

.action-btn:hover {
	border-color: var(--color-insis-primary);
	background: var(--color-insis-table-row-even);
}

.action-filter:hover {
	border-color: var(--color-insis-primary);
}

.action-exclude:hover {
	border-color: var(--color-insis-warning);
}

.action-icon {
	font-size: 20px;
}

.action-text {
	font-size: 12px;
	color: #333;
	font-weight: 500;
}

/* Transitions */
.menu-fade-enter-active,
.menu-fade-leave-active {
	transition: opacity 0.2s ease;
}

.menu-fade-enter-from,
.menu-fade-leave-to {
	opacity: 0;
}

.menu-fade-enter-active .time-selection-menu,
.menu-fade-leave-active .time-selection-menu {
	transition: transform 0.2s ease;
}

.menu-fade-enter-from .time-selection-menu,
.menu-fade-leave-to .time-selection-menu {
	transform: scale(0.95) translateY(-10px);
}
</style>
