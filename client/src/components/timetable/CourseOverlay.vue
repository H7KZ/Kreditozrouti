<script setup lang="ts">
import { CourseWithRelations } from '@api/Database/types'
import { TIMETABLE_END_HOUR, TIMETABLE_START_HOUR } from '@client/stores/timetable.ts'
import InSISDay from '@scraper/Types/InSISDay.ts'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
	courses: CourseWithRelations[]
	selection: {
		days: InSISDay[]
		time_from: number
		time_to: number
	} | null
	visible: boolean
}>()

const emit = defineEmits<{
	(e: 'course-click', course: CourseWithRelations): void
	(e: 'close'): void
}>()

const { t } = useI18n()

// Calculate position based on selection
const overlayStyle = computed(() => {
	if (!props.selection) return {}

	const totalMinutes = (TIMETABLE_END_HOUR - TIMETABLE_START_HOUR) * 60
	const selectionEnd = props.selection.time_to

	// Position overlay after the selection end time
	const leftPercent = ((selectionEnd - TIMETABLE_START_HOUR * 60) / totalMinutes) * 100

	return {
		left: `${Math.min(leftPercent, 70)}%`,
	}
})

// Group courses by type for display
const groupedCourses = computed(() => {
	const groups: Record<string, CourseWithRelations[]> = {
		povinny: [],
		povinne_volitelny: [],
		volitelny: [],
		other: [],
	}

	props.courses.forEach((course) => {
		const key = 'other'
		if (groups[key]) {
			groups[key].push(course)
		}
	})

	return (
		Object.entries(groups)
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			.filter(([_, courses]) => courses.length > 0)
			.map(([category, courses]) => ({ category, courses }))
	)
})

const categoryLabels: Record<string, string> = {
	povinny: 'Povinné',
	povinne_volitelny: 'Povinně volitelné',
	volitelny: 'Volitelné',
	other: 'Ostatní',
}
</script>

<template>
	<Transition name="overlay-slide">
		<div v-if="visible && selection && courses.length > 0" class="courses-overlay" :style="overlayStyle">
			<div class="overlay-header">
				<span class="overlay-title">{{ t('timetable.possibleCourses') }}:</span>
				<button class="close-btn" @click="emit('close')">×</button>
			</div>

			<div class="overlay-content">
				<template v-for="group in groupedCourses" :key="group.category">
					<div class="course-group">
						<div class="group-label">{{ categoryLabels[group.category] }}</div>
						<ul class="course-list">
							<li v-for="course in group.courses.slice(0, 8)" :key="course.id" class="course-item" @click="emit('course-click', course)">
								<span class="course-name">{{ course.title }}</span>
								<span class="course-meta">
									<span class="course-ident">{{ course.ident }}</span>
									<span class="course-ects">{{ course.ects }} kr.</span>
								</span>
							</li>
						</ul>
						<div v-if="group.courses.length > 8" class="more-indicator">+{{ group.courses.length - 8 }} {{ t('common.more') }}</div>
					</div>
				</template>
			</div>

			<div class="overlay-footer">
				<span class="total-count">
					{{ t('timetable.totalMatching', { count: courses.length }) }}
				</span>
			</div>
		</div>
	</Transition>
</template>

<style scoped>
.courses-overlay {
	position: absolute;
	top: 0;
	bottom: 0;
	right: 0;
	width: 250px;
	background: rgba(255, 200, 200, 0.95);
	border-left: 2px solid var(--color-insis-error);
	display: flex;
	flex-direction: column;
	z-index: 50;
	box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
}

.overlay-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10px 12px;
	background: rgba(200, 100, 100, 0.3);
	border-bottom: 1px solid rgba(200, 100, 100, 0.3);
}

.overlay-title {
	font-weight: 500;
	font-size: 13px;
	color: #333;
}

.close-btn {
	background: transparent;
	border: none;
	font-size: 18px;
	color: #666;
	cursor: pointer;
	padding: 0 4px;
	line-height: 1;
}

.close-btn:hover {
	color: #333;
}

.overlay-content {
	flex: 1;
	overflow-y: auto;
	padding: 8px 12px;
}

.course-group {
	margin-bottom: 12px;
}

.course-group:last-child {
	margin-bottom: 0;
}

.group-label {
	font-size: 11px;
	font-weight: bold;
	text-transform: uppercase;
	color: #666;
	margin-bottom: 6px;
	padding-bottom: 4px;
	border-bottom: 1px dashed rgba(0, 0, 0, 0.2);
}

.course-list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.course-item {
	padding: 6px 8px;
	margin: 0 -8px;
	border-radius: 4px;
	cursor: pointer;
	transition: background-color 0.1s;
}

.course-item:hover {
	background: rgba(255, 255, 255, 0.5);
}

.course-name {
	display: block;
	font-size: 12px;
	color: #333;
	line-height: 1.3;
	margin-bottom: 2px;
}

.course-meta {
	display: flex;
	gap: 8px;
	font-size: 11px;
}

.course-ident {
	color: var(--color-insis-link);
	font-weight: 500;
}

.course-ects {
	color: #666;
}

.more-indicator {
	font-size: 11px;
	color: #666;
	font-style: italic;
	padding-left: 8px;
	margin-top: 4px;
}

.overlay-footer {
	padding: 8px 12px;
	background: rgba(200, 100, 100, 0.2);
	border-top: 1px solid rgba(200, 100, 100, 0.3);
}

.total-count {
	font-size: 12px;
	color: #555;
}

/* Transitions */
.overlay-slide-enter-active,
.overlay-slide-leave-active {
	transition:
		transform 0.25s ease,
		opacity 0.25s ease;
}

.overlay-slide-enter-from,
.overlay-slide-leave-to {
	transform: translateX(100%);
	opacity: 0;
}
</style>
