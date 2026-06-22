<script setup lang="ts">
import type { CourseWithRelationsDTO } from '@shared/http/responses'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@client/api.ts'
import CourseInfo from '@client/components/courses/CourseInfo.vue'
import UnitSelector from '@client/components/courses/UnitSelector.vue'
import { useCourseLabels, useTimeUtils } from '@client/composables'
import { useCoursesStore, useFiltersStore, useTimetableStore, useUIStore } from '@client/stores'
import { SelectedCourseUnit } from '@client/types'
import IconLoader from '~icons/lucide/loader-2'
import IconSearch from '~icons/lucide/search'
import IconTrash from '~icons/lucide/trash-2'
import IconX from '~icons/lucide/x'

const { t } = useI18n()
const coursesStore = useCoursesStore()
const filtersStore = useFiltersStore()
const timetableStore = useTimetableStore()
const uiStore = useUIStore()

// ============================================================================
// Props & Emits
// ============================================================================

interface Props {
	unit: SelectedCourseUnit
}

interface Emits {
	(e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// ============================================================================
// State
// ============================================================================

const modalRef = ref<HTMLElement | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const course = ref<CourseWithRelationsDTO | null>(null)

// ============================================================================
// Composables
// ============================================================================

const { getDayLabel, getUnitCourseTitle } = useCourseLabels()
const { formatTimeRange } = useTimeUtils()

// ============================================================================
// Computed
// ============================================================================

const dayLabel = computed(() => (props.unit.day ? getDayLabel(props.unit.day) : '-'))
const timeRange = computed(() => formatTimeRange(props.unit.timeFrom, props.unit.timeTo))

// ============================================================================
// API
// ============================================================================

async function fetchCourse() {
	loading.value = true
	error.value = null

	try {
		const response = await api.post<{ data: CourseWithRelationsDTO[] }>('/courses', {
			ids: [props.unit.courseId],
			limit: 1
		})

		if (response.data.data.length > 0) {
			course.value = response.data.data[0] ?? null
		} else {
			error.value = t('components.timetable.TimetableCourseModal.courseNotFound')
		}
	} catch (e) {
		error.value = t('components.timetable.TimetableCourseModal.loadError')
		console.error('TimetableCourseModal: Failed to fetch course', e)
	} finally {
		loading.value = false
	}
}

watch(() => props.unit.courseId, fetchCourse, { immediate: true })

// ============================================================================
// Actions
// ============================================================================

function handleSearchInTimeslot() {
	filtersStore.filters.include_times = [{ day: props.unit.day ?? 'Pondělí', time_from: props.unit.timeFrom, time_to: props.unit.timeTo }]
	filtersStore.filters.offset = 0
	uiStore.switchToListView()
	coursesStore.fetchCourses()
	emit('close')
}

function handleClose() {
	emit('close')
}

function handleRemoveCourseAndClose() {
	if (course.value) timetableStore.removeCourse(course.value.id)
	emit('close')
}

// ============================================================================
// Keyboard & Click Outside
// ============================================================================

function handleKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape') emit('close')
}

function handleBackdropClick(event: MouseEvent) {
	if (event.target === event.currentTarget) emit('close')
}

onMounted(() => document.addEventListener('keydown', handleKeydown))
onUnmounted(() => document.removeEventListener('keydown', handleKeydown))
</script>

<template>
	<Teleport to="body">
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click="handleBackdropClick">
			<div ref="modalRef" class="modal flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-(--insis-surface) shadow-xl">
				<!-- Header -->
				<div class="flex items-center justify-between border-b border-(--insis-border) bg-(--insis-header-bg) px-4 py-3">
					<div class="flex items-center gap-2">
						<span class="insis-course-code font-medium">{{ unit.courseIdent }}</span>
						<span class="text-(--insis-gray-600)">{{ getUnitCourseTitle(unit) }}</span>
					</div>
					<button type="button" class="insis-btn-text" @click="handleClose">
						<IconX class="h-5 w-5" />
					</button>
				</div>

				<!-- Loading State -->
				<div v-if="loading" class="flex flex-1 items-center justify-center p-8">
					<IconLoader class="h-8 w-8 animate-spin text-(--insis-blue)" />
				</div>

				<!-- Error State -->
				<div v-else-if="error" class="flex-1 p-4">
					<div class="insis-panel insis-panel-danger">
						<p>{{ error }}</p>
					</div>
				</div>

				<!-- Content -->
				<div v-else-if="course" class="min-h-0 flex-1 overflow-y-auto p-4">
					<div class="grid gap-6 lg:grid-cols-2">
						<!-- Course Info -->
						<div>
							<CourseInfo :course="course" />

							<!-- Selected Slot (modal-specific) -->
							<div class="mt-4 rounded border border-(--insis-border) bg-(--insis-gray-50) p-3">
								<h4 class="mb-2 text-sm font-medium text-(--insis-gray-700)">
									{{ $t('components.timetable.TimetableCourseModal.selectedSlot') }}
								</h4>
								<div class="space-y-1 text-sm">
									<div class="flex flex-wrap items-baseline justify-between gap-x-2">
										<span class="shrink-0 text-(--insis-gray-500)">{{ $t('common.day') }}:</span>
										<span class="font-medium">{{ dayLabel }}</span>
									</div>
									<div class="flex flex-wrap items-baseline justify-between gap-x-2">
										<span class="shrink-0 text-(--insis-gray-500)">{{ $t('common.time') }}:</span>
										<span class="font-medium">{{ timeRange }}</span>
									</div>
									<div v-if="unit.location" class="flex flex-wrap items-baseline justify-between gap-x-2">
										<span class="shrink-0 text-(--insis-gray-500)">{{ $t('common.location') }}:</span>
										<span>{{ unit.location }}</span>
									</div>
									<div v-if="unit.lecturer" class="flex flex-wrap items-baseline justify-between gap-x-2">
										<span class="shrink-0 text-(--insis-gray-500)">{{ $t('components.timetable.TimetableCourseModal.lecturer') }}:</span>
										<span class="text-right font-medium">{{ unit.lecturer }}</span>
									</div>
								</div>
							</div>
						</div>

						<!-- Unit Selector -->
						<UnitSelector :course="course" />
					</div>
				</div>

				<!-- Footer -->
				<div
					class="flex flex-wrap-reverse items-center gap-2 gap-y-4 border-t border-(--insis-border) bg-(--insis-gray-50) px-4 py-3 sm:justify-between"
				>
					<button type="button" class="insis-btn-text flex items-center gap-1 text-sm text-(--insis-danger)" @click="handleRemoveCourseAndClose">
						<IconTrash class="h-4 w-4" />
						{{ $t('components.timetable.TimetableCourseModal.removeFromTimetable') }}
					</button>

					<div class="flex items-center gap-2">
						<button type="button" class="insis-btn insis-btn-secondary text-sm" @click="handleClose">
							{{ $t('common.close') }}
						</button>
						<button type="button" class="insis-btn insis-btn-primary flex items-center gap-1.5 text-sm" @click="handleSearchInTimeslot">
							<IconSearch class="h-4 w-4" />
							{{ $t('components.timetable.TimetableCourseModal.searchInTimeslot') }}
						</button>
					</div>
				</div>
			</div>
		</div>
	</Teleport>
</template>

<style scoped>
.modal {
	animation: modal-in 0.2s ease-out;
}

@keyframes modal-in {
	from {
		opacity: 0;
		transform: scale(0.95) translateY(-10px);
	}
	to {
		opacity: 1;
		transform: scale(1) translateY(0);
	}
}
</style>
