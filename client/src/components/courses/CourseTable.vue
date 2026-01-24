<script setup lang="ts">
import type { Course } from '@client/types/courses'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CourseRow from './CourseRow.vue'

interface Props {
	courses: Course[]
	loading?: boolean
}

withDefaults(defineProps<Props>(), {
	loading: false,
})

const emit = defineEmits<{
	select: [course: Course]
}>()

const { t } = useI18n()
const expandedIds = ref<Set<number>>(new Set())

function toggleRow(courseId: number) {
	if (expandedIds.value.has(courseId)) {
		expandedIds.value.delete(courseId)
	} else {
		expandedIds.value.add(courseId)
	}
}

function handleSelect(course: Course) {
	toggleRow(course.id)
	emit('select', course)
}
</script>

<template>
	<div class="course-table">
		<!-- Loading State -->
		<div v-if="loading" class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4a7eb8]"></div>
			<span class="ml-3 text-[#6b7280]">{{ t('courseTable.loading') }}</span>
		</div>

		<!-- Empty State -->
		<div v-else-if="courses.length === 0" class="text-center py-12 text-[#6b7280]">
			<svg class="w-12 h-12 mx-auto mb-4 text-[#d1d5db]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="1.5"
					d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
				/>
			</svg>
			<p class="text-lg font-medium mb-2">{{ t('courseTable.empty') }}</p>
		</div>

		<!-- Table -->
		<div v-else class="overflow-x-auto border border-[#d1d5db] rounded-lg">
			<table class="w-full">
				<thead>
					<tr class="bg-[#e8eef5]">
						<th class="px-3 py-2 text-left text-xs font-semibold uppercase border-b border-[#c0cfe0] w-10"></th>
						<th class="px-3 py-2 text-left text-xs font-semibold uppercase border-b border-[#c0cfe0]">{{ t('courseTable.columns.code') }}</th>
						<th class="px-3 py-2 text-left text-xs font-semibold uppercase border-b border-[#c0cfe0]">{{ t('courseTable.columns.title') }}</th>
						<th class="px-3 py-2 text-center text-xs font-semibold uppercase border-b border-[#c0cfe0] w-20">
							{{ t('courseTable.columns.credits') }}
						</th>
						<th class="px-3 py-2 text-left text-xs font-semibold uppercase border-b border-[#c0cfe0] w-24">
							{{ t('courseTable.columns.faculty') }}
						</th>
						<th class="px-3 py-2 text-center text-xs font-semibold uppercase border-b border-[#c0cfe0] w-28">
							{{ t('courses.detail.units') }}
						</th>
						<th class="px-3 py-2 border-b border-[#c0cfe0] w-16"></th>
					</tr>
				</thead>
				<CourseRow v-for="course in courses" :key="course.id" :course="course" :expanded="expandedIds.has(course.id)" @toggle="handleSelect(course)" />
			</table>
		</div>
	</div>
</template>
