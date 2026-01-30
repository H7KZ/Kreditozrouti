<script setup lang="ts">
/**
 * TimetableCourseModal
 *
 * Modal displayed when clicking a course block in the timetable.
 * Shows course details and allows managing slots or searching for alternatives.
 *
 * REFACTORED: Uses shared composables - notice how this component now
 * shares the same logic as CourseRowExpanded through composables.
 */

import { CourseWithRelations } from '@api/Database/types'
import api from '@client/api.ts'
import { useCourseLabels, useCourseUnitSelection, useSlotFormatting, useTimeUtils } from '@client/composables'
import { useCoursesStore, useUIStore } from '@client/stores'
import { SelectedCourseUnit } from '@client/types'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import IconCheck from '~icons/lucide/check'
import IconExternalLink from '~icons/lucide/external-link'
import IconLoader from '~icons/lucide/loader-2'
import IconMinus from '~icons/lucide/minus'
import IconPlus from '~icons/lucide/plus'
import IconSearch from '~icons/lucide/search'
import IconTrash from '~icons/lucide/trash-2'
import IconX from '~icons/lucide/x'

const { t } = useI18n({ useScope: 'global' })
const coursesStore = useCoursesStore()
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
const course = ref<CourseWithRelations | null>(null)

// ============================================================================
// Composables
// ============================================================================

// Shared course labels (same as CourseRowExpanded!)
const { getCompletionLabel, getCategoryLabel, getUnitTypesGroupLabel, getShortUnitTypeLabel, getSlotType, getDayLabel, getCategoryBadgeClass } =
	useCourseLabels()

// Shared unit selection logic (same as CourseRowExpanded!)
const { unitsByGroup, isSelectionComplete, isUnitSelected, isGroupSatisfied, handleAddUnit, handleRemoveUnit, handleRemoveCourse } = useCourseUnitSelection({
	course,
})

// Shared slot formatting (same as CourseRowExpanded!)
const { formatSlotInfo, formatCapacity, getCapacityClass } = useSlotFormatting()

// Time utilities
const { formatTimeRange } = useTimeUtils()

// ============================================================================
// Computed
// ============================================================================

/** Day label for the current unit */
const dayLabel = computed(() => {
	if (props.unit.day) return getDayLabel(props.unit.day)
	return '-'
})

/** Time range for the current unit */
const timeRange = computed(() => {
	return formatTimeRange(props.unit.timeFrom, props.unit.timeTo)
})

// ============================================================================
// API
// ============================================================================

async function fetchCourse() {
	loading.value = true
	error.value = null

	try {
		const response = await api.post<{ data: CourseWithRelations[] }>('/courses', {
			ids: [props.unit.courseId],
			limit: 1,
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

// Fetch course on mount and when unit changes
watch(() => props.unit.courseId, fetchCourse, { immediate: true })

// ============================================================================
// Actions
// ============================================================================

function handleSearchInTimeslot() {
	// Apply time filter for this slot
	coursesStore.setTimeFilterFromDrag(props.unit.day ?? 'Pondělí', props.unit.timeFrom, props.unit.timeTo)

	// Switch to list view
	uiStore.switchToListView()

	// Fetch courses
	coursesStore.fetchCourses()

	// Close modal
	emit('close')
}

function handleClose() {
	emit('close')
}

function handleRemoveCourseAndClose() {
	handleRemoveCourse()
	emit('close')
}

// ============================================================================
// Keyboard & Click Outside
// ============================================================================

function handleKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape') {
		emit('close')
	}
}

function handleBackdropClick(event: MouseEvent) {
	if (event.target === event.currentTarget) {
		emit('close')
	}
}

onMounted(() => {
	document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
	document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
	<Teleport to="body">
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click="handleBackdropClick">
			<div ref="modalRef" class="modal w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-lg bg-white shadow-xl">
				<!-- Header -->
				<div class="flex items-center justify-between border-b border-[var(--insis-border)] bg-[var(--insis-header-bg)] px-4 py-3">
					<div class="flex items-center gap-2">
						<span class="insis-course-code font-medium">{{ unit.courseIdent }}</span>
						<span class="text-[var(--insis-gray-600)]">{{ unit.courseTitle }}</span>
					</div>
					<button type="button" class="insis-btn-text" @click="handleClose">
						<IconX class="h-5 w-5" />
					</button>
				</div>

				<!-- Loading State -->
				<div v-if="loading" class="flex items-center justify-center p-8">
					<IconLoader class="h-8 w-8 animate-spin text-[var(--insis-blue)]" />
				</div>

				<!-- Error State -->
				<div v-else-if="error" class="p-4">
					<div class="insis-panel insis-panel-danger">
						<p>{{ error }}</p>
					</div>
				</div>

				<!-- Content -->
				<div v-else-if="course" class="max-h-[60vh] overflow-y-auto p-4">
					<div class="grid gap-6 lg:grid-cols-2">
						<!-- Course Info (uses same label helpers as CourseRowExpanded!) -->
						<div>
							<h3 class="mb-3 flex items-center gap-1.5 font-medium text-[var(--insis-gray-900)]">
								{{ course.ident }} - {{ course.title }}
								<a
									v-if="course.url"
									:href="course.url"
									target="_blank"
									rel="noopener noreferrer"
									class="text-[var(--insis-blue)] hover:text-[var(--insis-blue-dark)]"
								>
									<IconExternalLink class="h-3 w-3" />
								</a>
							</h3>

							<dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
								<dt class="text-[var(--insis-gray-500)]">{{ $t('components.courses.CourseRowExpanded.ectsCredits') }}</dt>
								<dd class="font-medium">{{ course.ects ?? '-' }}</dd>

								<dt class="text-[var(--insis-gray-500)]">{{ $t('components.courses.CourseRowExpanded.completion') }}</dt>
								<dd>{{ course.mode_of_completion ? getCompletionLabel(course.mode_of_completion) : '-' }}</dd>

								<template v-if="course.study_plans?.length">
									<dt class="text-[var(--insis-gray-500)]">{{ $t('components.courses.CourseRowExpanded.category') }}</dt>
									<dd>
										<span
											v-for="spc in course.study_plans"
											:key="spc.id"
											class="insis-badge mr-1"
											:class="getCategoryBadgeClass(spc.category || '')"
										>
											{{ getCategoryLabel(spc.category || '') }}
										</span>
									</dd>
								</template>
							</dl>

							<!-- Current Selection Info -->
							<div class="mt-4 rounded border border-[var(--insis-border)] bg-[var(--insis-gray-50)] p-3">
								<h4 class="mb-2 text-sm font-medium text-[var(--insis-gray-700)]">
									{{ $t('components.timetable.TimetableCourseModal.selectedSlot') }}
								</h4>
								<div class="space-y-1 text-sm">
									<div class="flex items-center justify-between">
										<span class="text-[var(--insis-gray-500)]">{{ $t('common.day') }}:</span>
										<span class="font-medium">{{ dayLabel }}</span>
									</div>
									<div class="flex items-center justify-between">
										<span class="text-[var(--insis-gray-500)]">{{ $t('common.time') }}:</span>
										<span class="font-medium">{{ timeRange }}</span>
									</div>
									<div v-if="unit.location" class="flex items-center justify-between">
										<span class="text-[var(--insis-gray-500)]">{{ $t('common.location') }}:</span>
										<span>{{ unit.location }}</span>
									</div>
								</div>
							</div>
						</div>

						<!-- Unit Selection (uses same selection logic as CourseRowExpanded!) -->
						<div>
							<div class="mb-3 flex items-center justify-between">
								<h4 class="font-medium text-[var(--insis-gray-900)]">
									{{ $t('components.courses.CourseRowExpanded.unitSelection') }}
								</h4>
								<span v-if="isSelectionComplete" class="insis-badge insis-badge-success">
									<IconCheck class="mr-1 inline h-3 w-3" />
									{{ $t('components.courses.CourseRowExpanded.complete') }}
								</span>
							</div>

							<!-- Unit groups (same structure as CourseRowExpanded!) -->
							<div class="space-y-4">
								<div v-for="[key, group] in unitsByGroup" :key="key">
									<div class="mb-2 flex items-center gap-2">
										<span class="text-sm font-medium text-[var(--insis-gray-700)]">
											{{ getUnitTypesGroupLabel(group.types) }}
										</span>
										<span v-if="isGroupSatisfied(group.types)" class="insis-badge insis-badge-success text-xs">
											{{ $t('components.courses.CourseRowExpanded.selected') }}
										</span>
									</div>

									<div class="space-y-2">
										<div
											v-for="courseUnit in group.units"
											:key="courseUnit.id"
											class="rounded border text-sm transition-colors"
											:class="
												isUnitSelected(courseUnit.id)
													? 'border-[var(--insis-success)] bg-[var(--insis-success-light)]'
													: 'border-[var(--insis-border)] bg-white hover:border-[var(--insis-blue)]'
											"
										>
											<div class="flex items-center justify-between p-2">
												<div class="flex w-full flex-col gap-1">
													<div v-for="slot in courseUnit.slots" :key="slot.id" class="flex items-center gap-3">
														<span class="w-8 shrink-0 rounded bg-[var(--insis-gray-200)] px-1 py-0.5 text-center text-xs">
															{{ getShortUnitTypeLabel(getSlotType(slot)) }}
														</span>
														<span class="font-medium">{{ formatSlotInfo(slot) }}</span>
														<span class="truncate text-[var(--insis-gray-600)]">{{ slot.location || '-' }}</span>
													</div>

													<div v-if="courseUnit.capacity !== undefined" class="mt-1 pl-[44px]">
														<span :class="['text-xs', getCapacityClass(courseUnit.capacity)]">
															{{ formatCapacity(courseUnit.capacity) }}
														</span>
													</div>
												</div>

												<!-- Action button -->
												<div class="ml-4 shrink-0">
													<template v-if="isUnitSelected(courseUnit.id)">
														<button
															type="button"
															class="insis-btn bg-white px-3 py-1.5 text-xs hover:border-[var(--insis-danger)]"
															@click.stop="handleRemoveUnit(courseUnit)"
														>
															<IconMinus class="h-4 w-4" />
														</button>
													</template>
													<template v-else>
														<button
															type="button"
															class="flex items-center gap-1 px-3 py-1.5 text-xs"
															:class="isGroupSatisfied(group.types) ? 'insis-btn-secondary' : 'insis-btn-primary'"
															@click.stop="handleAddUnit(courseUnit)"
														>
															<IconPlus v-if="!isGroupSatisfied(group.types)" class="h-3 w-3" />
															{{ isGroupSatisfied(group.types) ? $t('common.change') : $t('common.add') }}
														</button>
													</template>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Footer -->
				<div class="flex items-center justify-between border-t border-[var(--insis-border)] bg-[var(--insis-gray-50)] px-4 py-3">
					<button type="button" class="insis-btn-text flex items-center gap-1 text-sm text-[var(--insis-danger)]" @click="handleRemoveCourseAndClose">
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
