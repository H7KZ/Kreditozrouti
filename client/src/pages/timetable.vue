<script setup lang="ts">
import { Course, CourseUnit, CourseUnitSlot } from '@api/Database/types'
import SlotPopover from '@client/components/timetable/SlotPopover.vue'
import TimetableGrid from '@client/components/timetable/TimetableGrid.vue'
import { useTimetableStore } from '@client/stores/timetable'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

interface SlotWithCourse extends CourseUnitSlot {
	course: Course
	unit: CourseUnit
}

const { t } = useI18n()
const router = useRouter()
const timetable = useTimetableStore()

// Popover state
const selectedSlot = ref<SlotWithCourse | null>(null)
const popoverPosition = ref({ x: 0, y: 0 })
const showPopover = ref(false)

function handleSlotClick(slot: SlotWithCourse, event: MouseEvent) {
	selectedSlot.value = slot

	// Position popover near click, but keep it in viewport
	popoverPosition.value = {
		x: Math.min(event.clientX, window.innerWidth - 340),
		y: Math.min(event.clientY + 10, window.innerHeight - 300),
	}

	showPopover.value = true
}

function handleClearAll() {
	if (confirm(t('timetable.confirmClear'))) {
		timetable.clearAll()
	}
}

function handleExport() {
	// TODO: Implement export (iCal, PDF, etc.)
	alert(t('timetable.exportSoon'))
}

function goToCourses() {
	router.push('/courses')
}
</script>

<template>
	<div class="timetable-page min-h-screen bg-[#f9fafb]">
		<div class="max-w-7xl mx-auto p-6">
			<!-- Header -->
			<div class="flex items-center justify-between mb-6">
				<div>
					<h1 class="text-2xl font-semibold text-[#1f2937]">{{ t('timetable.title') }}</h1>
					<p v-if="!timetable.isEmpty" class="text-sm text-[#6b7280] mt-1">
						{{ timetable.allEntries.length }}
						{{ timetable.allEntries.length === 1 ? t('courses.unitSingular') : t('courses.unitPlural') }}
						• {{ timetable.totalCredits }} {{ t('courseTable.columns.credits').toLowerCase() }}
					</p>
				</div>

				<div class="flex gap-2">
					<button v-if="!timetable.isEmpty" class="insis-btn cursor-pointer" @click="handleClearAll">
						{{ t('timetable.clear') }}
					</button>
					<button v-if="!timetable.isEmpty" class="insis-btn cursor-pointer" @click="handleExport">
						{{ t('timetable.export') }}
					</button>
					<button class="insis-btn insis-btn-primary cursor-pointer" @click="goToCourses">+ {{ t('timetable.addCourses') }}</button>
				</div>
			</div>

			<!-- Timetable Grid -->
			<TimetableGrid mode="view" @slot-click="handleSlotClick" />

			<!-- Slot Popover -->
			<SlotPopover v-if="selectedSlot" :unitSlot="selectedSlot" v-model:open="showPopover" :position="popoverPosition" />
		</div>
	</div>
</template>
