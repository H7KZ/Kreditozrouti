<script setup lang="ts">
import type { CourseWithRelationsDTO } from '@shared/http/responses'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CourseInfo from '@client/components/courses/CourseInfo.vue'
import UnitSelector from '@client/components/courses/UnitSelector.vue'
import { useCourseLabels, useTimeUtils } from '@client/composables'
import { useCoursesStore, useFiltersStore, useTimetableStore, useUIStore } from '@client/stores'
import { fetchCourses } from '@client/services/courseService'
import type { SelectedCourseUnit } from '@client/types'
import IconLoader from '~icons/lucide/loader-2'
import IconMapPin from '~icons/lucide/map-pin'
import IconSearch from '~icons/lucide/search'
import IconTrash from '~icons/lucide/trash-2'
import IconUser from '~icons/lucide/user'
import IconX from '~icons/lucide/x'

const { t } = useI18n()
const coursesStore = useCoursesStore()
const filtersStore = useFiltersStore()
const timetableStore = useTimetableStore()
const uiStore = useUIStore()

interface Props {
	unit: SelectedCourseUnit
}

interface Emits {
	(e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// State

const loading = ref(true)
const error = ref<string | null>(null)
const course = ref<CourseWithRelationsDTO | null>(null)

// Composables

const { getDayLabel, getUnitCourseTitle } = useCourseLabels()
const { formatTimeRange } = useTimeUtils()

// Computed

const dayLabel = computed(() => (props.unit.day ? getDayLabel(props.unit.day) : '-'))
const timeRange = computed(() => formatTimeRange(props.unit.timeFrom, props.unit.timeTo))

// API

async function fetchCourse() {
	loading.value = true
	error.value = null

	try {
		const result = await fetchCourses({ ids: [props.unit.courseId], limit: 1 })

		if (result.data.length > 0) {
			course.value = result.data[0] ?? null
		} else {
			error.value = t('components.timetable.TimetableCoursePanel.courseNotFound')
		}
	} catch (e) {
		error.value = t('components.timetable.TimetableCoursePanel.loadError')
		console.error('TimetableCoursePanel: Failed to fetch course', e)
	} finally {
		loading.value = false
	}
}

watch(() => props.unit.courseId, fetchCourse, { immediate: true })

// Actions

function handleSearchInTimeslot() {
	if (!props.unit.day) return
	filtersStore.filters.include_times = [{ day: props.unit.day, time_from: props.unit.timeFrom, time_to: props.unit.timeTo }]
	filtersStore.filters.offset = 0
	uiStore.switchToListView()
	coursesStore.fetchCourses()
	emit('close')
}

function handleRemoveCourseAndClose() {
	if (course.value) timetableStore.removeCourse(course.value.id)
	emit('close')
}

// Keyboard

function handleKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape') emit('close')
}

onMounted(() => document.addEventListener('keydown', handleKeydown))
onUnmounted(() => document.removeEventListener('keydown', handleKeydown))
</script>

<template>
	<Teleport to="body">
		<!-- Backdrop (click to close, no visual on desktop so timetable stays readable) -->
		<div class="fixed inset-0 z-40 sm:bg-black/20" aria-hidden="true" @click="emit('close')" />

		<!-- Panel -->
		<div
			class="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-(--insis-surface) shadow-xl sm:w-160 sm:border-l sm:border-(--insis-border)"
			role="dialog"
			aria-modal="true"
			:aria-label="getUnitCourseTitle(unit)"
		>
			<!-- Header -->
			<div class="flex shrink-0 items-center justify-between border-b border-(--insis-border) bg-(--insis-header-bg) px-4 py-3">
				<div class="flex min-w-0 items-center gap-2">
					<span class="insis-course-code shrink-0 font-medium">{{ unit.courseIdent }}</span>
					<span class="truncate text-(--insis-gray-600)">{{ getUnitCourseTitle(unit) }}</span>
				</div>
				<button type="button" class="insis-btn-text ml-2 shrink-0" :aria-label="$t('common.close')" @click="emit('close')">
					<IconX class="h-5 w-5" />
				</button>
			</div>

			<!-- Slot strip -->
			<div class="shrink-0 border-b border-(--insis-border) bg-(--insis-gray-50) px-4 py-2">
				<div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-(--insis-gray-700)">
					<span class="font-medium">{{ dayLabel }} · {{ timeRange }}</span>
					<span v-if="unit.location" class="flex items-center gap-1 text-(--insis-gray-500)">
						<IconMapPin class="h-3 w-3 shrink-0" aria-hidden="true" />
						{{ unit.location }}
					</span>
					<span v-if="unit.lecturer" class="flex items-center gap-1 text-(--insis-gray-500)">
						<IconUser class="h-3 w-3 shrink-0" aria-hidden="true" />
						{{ unit.lecturer }}
					</span>
				</div>
			</div>

			<!-- Loading -->
			<div v-if="loading" class="flex flex-1 items-center justify-center p-8">
				<IconLoader class="h-8 w-8 animate-spin text-(--insis-blue)" />
			</div>

			<!-- Error -->
			<div v-else-if="error" class="flex-1 overflow-y-auto p-4">
				<div class="insis-panel insis-panel-danger">
					<p>{{ error }}</p>
				</div>
			</div>

			<!-- Content -->
			<div v-else-if="course" class="min-h-0 flex-1 overflow-y-auto p-4">
				<div class="space-y-6">
					<CourseInfo :course="course" />
					<UnitSelector :course="course" />
				</div>
			</div>

			<!-- Footer actions -->
			<div
				class="flex shrink-0 flex-wrap-reverse items-center gap-2 gap-y-4 border-t border-(--insis-border) bg-(--insis-gray-50) px-4 py-3 sm:justify-between"
			>
				<button type="button" class="insis-btn-text flex items-center gap-1 text-sm text-(--insis-danger)" @click="handleRemoveCourseAndClose">
					<IconTrash class="h-4 w-4" />
					{{ $t('components.timetable.TimetableCoursePanel.removeFromTimetable') }}
				</button>

				<div class="flex items-center gap-2">
					<button type="button" class="insis-btn insis-btn-secondary text-sm" @click="emit('close')">
						{{ $t('common.close') }}
					</button>
					<button
						type="button"
						class="insis-btn insis-btn-primary flex items-center gap-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
						:disabled="!unit.day"
						@click="handleSearchInTimeslot"
					>
						<IconSearch class="h-4 w-4" />
						{{ $t('components.timetable.TimetableCoursePanel.searchInTimeslot') }}
					</button>
				</div>
			</div>
		</div>
	</Teleport>
</template>
