<script setup lang="ts">
import { useTimetableStore } from '@client/stores/timetable'
import type { Course, CourseUnit, CourseUnitSlot } from '@client/types/courses'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

interface Props {
	course: Course
	expanded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	expanded: false,
})

const emit = defineEmits<{
	toggle: []
}>()

const { t, locale } = useI18n()
const timetable = useTimetableStore()

const isExpanded = ref(props.expanded)

const courseName = computed(() => {
	if (locale.value === 'cs' && props.course.czech_title) return props.course.czech_title
	return props.course.title || props.course.ident
})

function getUnitTypeLabel(unit: CourseUnit): string {
	// Try to determine unit type from available data
	if (unit.lecturer) {
		// Could be any type, default to cvičení
		return t('courses.unitType.seminar')
	}
	return t('courses.unitType.unknown')
}

function formatSlot(slot: CourseUnitSlot): string {
	const formatTime = (mins: number | null) => {
		if (mins === null) return '??:??'
		const h = Math.floor(mins / 60)
		const m = mins % 60
		return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
	}
	return `${slot.day || '?'} ${formatTime(slot.time_from)}-${formatTime(slot.time_to)}`
}

function isUnitInTimetable(unit: CourseUnit): boolean {
	return timetable.hasUnit(unit.id)
}

function addUnitToTimetable(unit: CourseUnit) {
	timetable.addUnit(props.course, unit)
}

function removeUnitFromTimetable(unit: CourseUnit) {
	timetable.removeUnit(unit.id)
}

function toggleExpand() {
	isExpanded.value = !isExpanded.value
	emit('toggle')
}
</script>

<template>
	<tbody class="course-row-group">
		<!-- Main row -->
		<tr class="cursor-pointer transition-colors" :class="isExpanded ? 'bg-[#f0f7ff]' : 'bg-white hover:bg-[#f9fafb]'" @click="toggleExpand">
			<td class="px-3 py-2.5 w-10">
				<svg
					class="w-4 h-4 text-[#6b7280] transition-transform"
					:class="{ 'rotate-90': isExpanded }"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
			</td>
			<td class="px-3 py-2.5 text-sm">
				<span class="insis-course-code">{{ course.ident }}</span>
			</td>
			<td class="px-3 py-2.5 text-sm text-[#1f2937]">{{ courseName }}</td>
			<td class="px-3 py-2.5 text-sm text-center text-[#6b7280]">{{ course.ects }}</td>
			<td class="px-3 py-2.5 text-sm text-[#6b7280]">{{ course.faculty_id }}</td>
			<td class="px-3 py-2.5 text-sm text-center">
				<span v-if="course.units?.length" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#e5e7eb] text-[#374151]">
					{{ course.units.length }} {{ course.units.length === 1 ? t('courses.unitSingular') : t('courses.unitPlural') }}
				</span>
				<span v-else class="text-[#9ca3af]">-</span>
			</td>
			<td class="px-3 py-2.5 text-right" @click.stop>
				<button
					v-if="course.units?.length === 1"
					class="insis-btn text-xs cursor-pointer"
					:class="isUnitInTimetable(course.units[0]) ? 'bg-red-50 border-red-300 text-red-700' : ''"
					@click="isUnitInTimetable(course.units[0]) ? removeUnitFromTimetable(course.units[0]) : addUnitToTimetable(course.units[0])"
				>
					{{ isUnitInTimetable(course.units[0]) ? '−' : '+' }}
				</button>
			</td>
		</tr>

		<!-- Expanded detail row -->
		<tr v-if="isExpanded">
			<td colspan="7" class="bg-[#fafbfc] border-t border-b border-[#e5e7eb]">
				<div class="px-6 py-4">
					<!-- Course Description -->
					<div v-if="course.aims_of_the_course || course.course_contents" class="mb-4">
						<h4 class="text-xs font-semibold text-[#6b7280] uppercase mb-2">{{ t('courses.detail.description') }}</h4>
						<div class="text-sm text-[#374151] space-y-2">
							<p v-if="course.aims_of_the_course">{{ course.aims_of_the_course }}</p>
							<p v-if="course.course_contents">{{ course.course_contents }}</p>
						</div>
					</div>

					<!-- Course Units -->
					<div v-if="course.units?.length">
						<h4 class="text-xs font-semibold text-[#6b7280] uppercase mb-3">{{ t('courses.detail.units') }}</h4>

						<div class="space-y-3">
							<div v-for="unit in course.units" :key="unit.id" class="bg-white border border-[#e5e7eb] rounded-lg p-3">
								<div class="flex items-center justify-between mb-2">
									<div class="flex items-center gap-2">
										<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
											{{ getUnitTypeLabel(unit) }}
										</span>
										<span v-if="unit.lecturer" class="text-sm text-[#6b7280]">{{ unit.lecturer }}</span>
										<span v-if="unit.capacity" class="text-xs text-[#9ca3af]"
											>({{ t('courses.detail.capacity') }}: {{ unit.capacity }})</span
										>
									</div>

									<button
										class="cursor-pointer px-3 py-1 text-sm font-medium rounded border transition-all"
										:class="
											isUnitInTimetable(unit)
												? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100'
												: 'bg-[#4a7eb8] border-[#4a7eb8] text-white hover:bg-[#3a6ea8]'
										"
										@click="isUnitInTimetable(unit) ? removeUnitFromTimetable(unit) : addUnitToTimetable(unit)"
									>
										{{ isUnitInTimetable(unit) ? t('courses.detail.removeFromTimetable') : t('courses.detail.addToTimetable') }}
									</button>
								</div>

								<!-- Note -->
								<p v-if="unit.note" class="text-sm text-[#6b7280] mb-2">{{ unit.note }}</p>

								<!-- Time Slots -->
								<div v-if="unit.slots?.length" class="overflow-x-auto">
									<table class="w-full text-sm">
										<thead>
											<tr class="text-xs text-[#6b7280] border-b border-[#e5e7eb]">
												<th class="px-2 py-1 text-left font-medium">{{ t('courses.detail.dayTime') }}</th>
												<th class="px-2 py-1 text-left font-medium">{{ t('courses.detail.location') }}</th>
												<th class="px-2 py-1 text-left font-medium">{{ t('courses.detail.frequency') }}</th>
											</tr>
										</thead>
										<tbody>
											<tr v-for="slot in unit.slots" :key="slot.id" class="border-b border-[#f3f4f6] last:border-0">
												<td class="px-2 py-1.5 font-medium text-[#1f2937]">{{ formatSlot(slot) }}</td>
												<td class="px-2 py-1.5 text-[#6b7280]">{{ slot.location || '-' }}</td>
												<td class="px-2 py-1.5 text-[#6b7280]">{{ slot.frequency || '-' }}</td>
											</tr>
										</tbody>
									</table>
								</div>
								<p v-else class="text-sm text-[#9ca3af] italic">{{ t('courses.detail.noSlots') }}</p>
							</div>
						</div>
					</div>
					<div v-else class="text-center py-4 text-[#9ca3af]">{{ t('courses.detail.noUnits') }}</div>
				</div>
			</td>
		</tr>
	</tbody>
</template>
