<script setup lang="ts">
import { Course, CourseUnit, CourseUnitSlot } from '@api/Database/types'
import { minutesToTime } from '@client/lib/utils.ts'
import { useTimetableStore } from '@client/stores/timetable'
import { useI18n } from 'vue-i18n'
declare const window: Window

interface UnitSlotWithCourse extends CourseUnitSlot {
	course: Course
	unit: CourseUnit
}

interface Props {
	unitSlot: UnitSlotWithCourse
	open: boolean
	position: { x: number; y: number }
}

const props = defineProps<Props>()

const emit = defineEmits<{
	'update:open': [value: boolean]
	remove: []
}>()

const { t, locale } = useI18n()
const timetable = useTimetableStore()

function getCourseName(): string {
	if (locale.value === 'cs' && props.unitSlot.course.czech_title) {
		return props.unitSlot.course.czech_title
	}
	return props.unitSlot.course.title || props.unitSlot.course.ident
}

function handleRemove() {
	timetable.removeUnit(props.unitSlot.unit.id)
	emit('update:open', false)
	emit('remove')
}

function handleClose() {
	emit('update:open', false)
}
</script>

<template>
	<Teleport to="body">
		<!-- Backdrop -->
		<div v-if="open" class="fixed inset-0 z-40" @click="handleClose" />

		<!-- Popover -->
		<div
			v-if="open"
			class="fixed z-50 bg-white rounded-lg shadow-xl border border-[#d1d5db] w-80 p-4"
			:style="{ left: `${Math.min(position.x, window.innerWidth - 340)}px`, top: `${Math.min(position.y, window.innerHeight - 300)}px` }"
		>
			<!-- Header -->
			<div class="flex items-start justify-between mb-3">
				<div class="flex-1 pr-2">
					<h3 class="font-semibold text-[#1f2937]">{{ unitSlot.course.ident }}</h3>
					<p class="text-sm text-[#6b7280] mt-0.5">{{ getCourseName() }}</p>
				</div>
				<button class="text-[#9ca3af] hover:text-[#6b7280] cursor-pointer transition-colors flex-shrink-0" @click="handleClose">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Details -->
			<div class="space-y-2 text-sm">
				<!-- Time -->
				<div class="flex items-center gap-2">
					<svg class="w-4 h-4 text-[#9ca3af] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<span class="text-[#374151]"> {{ unitSlot.day }} {{ minutesToTime(unitSlot.time_from!) }} - {{ minutesToTime(unitSlot.time_to!) }} </span>
				</div>

				<!-- Location -->
				<div v-if="unitSlot.location" class="flex items-center gap-2">
					<svg class="w-4 h-4 text-[#9ca3af] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
						/>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
					</svg>
					<span class="text-[#374151]">{{ unitSlot.location }}</span>
				</div>

				<!-- Lecturer -->
				<div v-if="unitSlot.unit.lecturer" class="flex items-center gap-2">
					<svg class="w-4 h-4 text-[#9ca3af] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
						/>
					</svg>
					<span class="text-[#374151]">{{ unitSlot.unit.lecturer }}</span>
				</div>

				<!-- Frequency -->
				<div v-if="unitSlot.frequency" class="flex items-center gap-2">
					<svg class="w-4 h-4 text-[#9ca3af] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
						/>
					</svg>
					<span class="text-[#374151]">{{ t(`courses.detail.frequency`) }}: {{ unitSlot.frequency }}</span>
				</div>

				<!-- Capacity -->
				<div v-if="unitSlot.unit.capacity" class="flex items-center gap-2">
					<svg class="w-4 h-4 text-[#9ca3af] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
						/>
					</svg>
					<span class="text-[#374151]">{{ t('courses.detail.capacity') }}: {{ unitSlot.unit.capacity }}</span>
				</div>

				<!-- Note -->
				<div v-if="unitSlot.unit.note" class="mt-3 pt-3 border-t border-[#e5e7eb]">
					<p class="text-xs text-[#6b7280]">{{ unitSlot.unit.note }}</p>
				</div>
			</div>

			<!-- Actions -->
			<div class="mt-4 pt-3 border-t border-[#e5e7eb]">
				<button
					class="w-full cursor-pointer px-3 py-2 text-sm font-medium rounded border bg-red-50 border-red-300 text-red-700 hover:bg-red-100 transition-colors"
					@click="handleRemove"
				>
					{{ t('courses.detail.removeFromTimetable') }}
				</button>
			</div>
		</div>
	</Teleport>
</template>
