<script setup lang="ts">
import type { Course } from '@client/types/schedule'
import { ref } from 'vue'

const props = defineProps<{
	courses: Course[]
	loading: boolean
	hasMore: boolean
	totalCount: number
	scheduledCourseIds: Set<number>
}>()

const emit = defineEmits<{
	'load-more': []
	'add-to-schedule': [course: Course, timeSlotIndex: number]
	'highlight-course': [course: Course | null]
}>()

const expandedId = ref<number | null>(null)

function toggleExpand(id: number) {
	expandedId.value = expandedId.value === id ? null : id
}

function isScheduled(courseId: number): boolean {
	return props.scheduledCourseIds.has(courseId)
}
</script>

<template>
	<div class="insis-card flex flex-col">
		<!-- Header -->
		<div class="insis-card-header">
			<h2 class="insis-card-title text-gray-700">
				Nalezené předměty
				<span class="font-normal text-gray-500">({{ totalCount }})</span>
			</h2>
		</div>

		<!-- Loading -->
		<div v-if="loading && courses.length === 0" class="flex flex-col items-center justify-center py-12 text-gray-500">
			<div class="insis-spinner insis-spinner-lg mb-4" style="border-color: var(--insis-primary); border-top-color: transparent"></div>
			<p>Načítám předměty...</p>
		</div>

		<!-- Empty -->
		<div v-else-if="!loading && courses.length === 0" class="flex flex-col items-center justify-center py-12 text-gray-500">
			<p>Žádné předměty nebyly nalezeny.</p>
			<p class="text-sm">Zkuste upravit filtry vyhledávání.</p>
		</div>

		<!-- Table -->
		<div v-else class="flex-1 overflow-auto">
			<table class="insis-table insis-table-compact">
				<thead>
					<tr>
						<th class="w-8">Stav</th>
						<th class="w-20">Kód</th>
						<th>Předmět</th>
						<th class="w-12">Fak.</th>
						<th class="w-8">Kr.</th>
						<th class="w-10">Jaz.</th>
						<th class="w-32">Akce</th>
					</tr>
				</thead>
				<tbody>
					<template v-for="course in courses" :key="course.id">
						<!-- Main row -->
						<tr
							:class="isScheduled(course.id) ? 'bg-green-50' : ''"
							@mouseenter="emit('highlight-course', course)"
							@mouseleave="emit('highlight-course', null)"
						>
							<td class="text-center">
								<span :class="['insis-status', isScheduled(course.id) ? 'insis-status-success' : 'insis-status-pending']">
									{{ isScheduled(course.id) ? '✓' : '○' }}
								</span>
							</td>
							<td>
								<button @click="toggleExpand(course.id)" class="insis-link font-semibold font-mono">
									{{ course.ident }}
								</button>
							</td>
							<td class="max-w-[200px]">
								<button @click="toggleExpand(course.id)" class="insis-link text-left truncate block w-full">
									{{ course.title }}
								</button>
							</td>
							<td class="text-center text-xs">{{ course.faculty_id }}</td>
							<td class="text-center font-medium">{{ course.ects }}</td>
							<td class="text-center text-xs">{{ course.languages?.split('|').join(', ') ?? '-' }}</td>
							<td>
								<button
									@click="emit('add-to-schedule', course, 0)"
									class="insis-btn insis-btn-sm insis-btn-primary"
									:disabled="isScheduled(course.id)"
								>
									{{ isScheduled(course.id) ? 'V rozvrhu' : '+ Přidat' }}
								</button>
							</td>
						</tr>

						<!-- Expanded details -->
						<tr v-if="expandedId === course.id" class="bg-gray-50">
							<td colspan="7" class="p-4">
								<div class="grid grid-cols-2 gap-4 text-sm">
									<div>
										<span class="text-gray-500">Vyučující:</span>
										<span class="ml-2">{{ course.lecturers?.split('|').join(', ') ?? 'Nevypsáno' }}</span>
									</div>
									<div>
										<span class="text-gray-500">Úroveň:</span>
										<span class="ml-2">{{ course.level }}</span>
									</div>
									<div>
										<span class="text-gray-500">Semestr:</span>
										<span class="ml-2">{{ course.semester }} {{ course.year }}</span>
									</div>
									<div>
										<span class="text-gray-500">Zakončení:</span>
										<span class="ml-2">{{ course.mode_of_completion || '—' }}</span>
									</div>
								</div>

								<!-- Time slots would go here if available in Course type -->
								<div class="mt-4 pt-4 border-t border-gray-200">
									<p class="text-xs text-gray-500">Termíny výuky závisí na struktuře dat z API.</p>
								</div>
							</td>
						</tr>
					</template>
				</tbody>
			</table>

			<!-- Load more -->
			<div v-if="hasMore" class="p-4 border-t border-gray-200 text-center">
				<button @click="emit('load-more')" :disabled="loading" class="insis-btn insis-btn-secondary">
					<span v-if="loading" class="insis-spinner"></span>
					<span v-else>Načíst další předměty</span>
				</button>
			</div>
		</div>
	</div>
</template>
