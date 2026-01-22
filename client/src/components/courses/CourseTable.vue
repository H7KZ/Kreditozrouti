<script setup lang="ts">
import type { Course } from '@client/types/courses'
import { GROUP_LABELS, minutesToTime } from '@client/types/courses'

defineProps<{
	courses: Course[]
	loading?: boolean
}>()

const emit = defineEmits<{
	select: [course: Course]
}>()

function getCourseTypeClass(group: string): string {
	switch (group) {
		case 'c':
			return 'insis-badge-compulsory'
		case 'cv':
			return 'insis-badge-elective'
		case 'v':
			return 'insis-badge-optional'
		default:
			return ''
	}
}

function formatSchedule(course: Course): string {
	if (!course.units?.length) return '-'

	const schedules: string[] = []
	for (const unit of course.units) {
		if (!unit.slots?.length) continue
		for (const slot of unit.slots) {
			if (slot.day && slot.time_from !== null && slot.time_to !== null) {
				const type = slot.type?.substring(0, 2) ?? ''
				schedules.push(`${type} ${slot.day} ${minutesToTime(slot.time_from)}-${minutesToTime(slot.time_to)}`)
			}
		}
	}

	return schedules.slice(0, 2).join(', ') + (schedules.length > 2 ? '...' : '')
}

function getGroupFromCourse(course: Course): string {
	if (!course.study_plans?.length) return ''
	return course.study_plans[0].group ?? ''
}
</script>

<template>
	<div class="course-table-wrapper">
		<div v-if="loading" class="insis-loading">
			<div class="insis-spinner"></div>
			<span class="ml-2">Načítání předmětů...</span>
		</div>

		<div v-else-if="courses.length === 0" class="text-center py-8 text-[var(--insis-gray-600)]">
			Nebyly nalezeny žádné předměty odpovídající vašim kritériím.
		</div>

		<table v-else class="insis-table insis-table-dense">
			<thead>
				<tr>
					<th class="sortable">Kód</th>
					<th class="sortable">Název</th>
					<th class="sortable cell-center">Fak.</th>
					<th class="cell-center">Pov.</th>
					<th class="sortable cell-center">Kr.</th>
					<th class="sortable cell-center">Uk.</th>
					<th class="cell-center">Jaz.</th>
					<th>Rozvrh</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="course in courses" :key="course.id" class="cursor-pointer" @click="emit('select', course)">
					<td class="insis-course-code cell-nowrap">{{ course.ident }}</td>
					<td>
						<a :href="course.url" target="_blank" class="hover:underline" @click.stop>
							{{ course.title || course.czech_title }}
						</a>
					</td>
					<td class="cell-center">{{ course.faculty_id }}</td>
					<td class="cell-center">
						<span
							v-if="getGroupFromCourse(course)"
							class="insis-badge"
							:class="getCourseTypeClass(getGroupFromCourse(course))"
							:title="GROUP_LABELS[getGroupFromCourse(course) as keyof typeof GROUP_LABELS]"
						>
							{{ getGroupFromCourse(course) }}
						</span>
					</td>
					<td class="cell-center">{{ course.ects ?? '-' }}</td>
					<td class="cell-center cell-nowrap">{{ course.mode_of_completion ?? '-' }}</td>
					<td class="cell-center">{{ course.languages ?? '-' }}</td>
					<td class="cell-nowrap text-xs">{{ formatSchedule(course) }}</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<style scoped>
.course-table-wrapper {
	overflow-x: auto;
}
</style>
