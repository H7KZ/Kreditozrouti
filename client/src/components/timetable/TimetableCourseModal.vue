<script setup lang="ts">
import { Course, CourseAssessment, CourseUnit, CourseUnitSlot, Faculty, StudyPlanCourse } from '@api/Database/types'
import api from '@client/api'
import { useTimeUtils } from '@client/composables'
import { useAlertsStore, useCoursesStore, useTimetableStore, useUIStore } from '@client/stores'
import { CourseUnitType, SelectedCourseUnit } from '@client/types'
import InSISDay from '@scraper/Types/InSISDay.ts'
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

/*
 * TimetableCourseModal
 * Modal displayed when clicking a course block in the timetable.
 * Shows course details and allows managing slots or searching for alternatives.
 */

type CourseWithRelations = Course<Faculty, CourseUnit<void, CourseUnitSlot>, CourseAssessment, StudyPlanCourse>

const { t, te } = useI18n({ useScope: 'global' })
const timetableStore = useTimetableStore()
const coursesStore = useCoursesStore()
const uiStore = useUIStore()
const alertsStore = useAlertsStore()
const { formatTimeRange, minutesToTime, getDayFromDate } = useTimeUtils()

interface Props {
	unit: SelectedCourseUnit
}

interface Emits {
	(e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const modalRef = ref<HTMLElement | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const course = ref<CourseWithRelations | null>(null)

/** Fetch full course data */
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

/** Get the day for this unit (from day or date) */
const unitDay = computed((): InSISDay | null => {
	if (props.unit.day) return props.unit.day
	if (props.unit.date) return getDayFromDate(props.unit.date) ?? null
	return null
})

/** Day label translated */
const dayLabel = computed(() => {
	if (!unitDay.value) return '-'
	const key = `days.${unitDay.value}`
	return te(key) ? t(key) : unitDay.value
})

/** Formatted time range */
const timeRange = computed(() => formatTimeRange(props.unit.timeFrom, props.unit.timeTo))

/**
 * Helper: Get unique sorted types present in a unit's slots
 */
function getUnitTypes(unit: CourseUnit<void, CourseUnitSlot>): CourseUnitType[] {
	const types = new Set<CourseUnitType>()
	for (const slot of unit.slots || []) {
		types.add(timetableStore.getSlotType(slot))
	}
	return Array.from(types).sort()
}

/**
 * Group units by their type composition.
 */
const unitsByGroup = computed(() => {
	if (!course.value) return new Map()

	const groups = new Map<string, { types: CourseUnitType[]; units: Array<CourseUnit<void, CourseUnitSlot>> }>()

	for (const unit of course.value.units || []) {
		if (!unit.slots?.length) continue

		const types = getUnitTypes(unit)
		const key = types.join('|')

		if (!groups.has(key)) {
			groups.set(key, { types, units: [] })
		}
		groups.get(key)!.units.push(unit)
	}

	// Sort groups so single types come first, then mixed
	return new Map([...groups.entries()].sort((a, b) => a[0].length - b[0].length))
})

// Get currently selected units (from store)
const selectedUnitsStore = computed(() => timetableStore.getUnitsForCourse(props.unit.courseId))

// Check what unit types need to be selected
const requiredUnitTypes = computed(() => {
	if (!course.value) return new Set<CourseUnitType>()

	const types = new Set<CourseUnitType>()
	for (const unit of course.value.units || []) {
		for (const slot of unit.slots || []) {
			types.add(timetableStore.getSlotType(slot))
		}
	}
	return types
})

// Check which types are currently selected in the store
const selectedUnitTypes = computed(() => new Set(selectedUnitsStore.value.map((u) => u.unitType)))

// Check if course selection is complete
const isSelectionComplete = computed(() => {
	if (requiredUnitTypes.value.size === 0) return false
	for (const type of requiredUnitTypes.value) {
		if (!selectedUnitTypes.value.has(type)) {
			return false
		}
	}
	return true
})

// Check if a specific unit is fully selected
function isUnitSelected(unitId: number): boolean {
	return selectedUnitsStore.value.some((u) => u.unitId === unitId)
}

// Check if a specific group of types is fully satisfied
function isGroupSatisfied(types: CourseUnitType[]): boolean {
	return types.every((t) => selectedUnitTypes.value.has(t))
}

// Generate a label for a group of types
function getGroupLabel(types: CourseUnitType[]): string {
	return types.map((type) => (te(`unitTypes.${type}`) ? t(`unitTypes.${type}`) : type)).join(' & ')
}

// Get short type label
function getShortTypeLabel(type: CourseUnitType): string {
	const key = `unitTypesShort.${type}`
	return te(key) ? t(key) : type
}

// Get category label
function getCategoryLabel(category: string): string {
	const key = `courseCategories.${category}`
	return te(key) ? t(key) : category
}

// Get slot display info
function formatSlotInfo(slot: CourseUnitSlot): string {
	let info = ''

	const day: InSISDay | '-' | null | undefined = slot.day
	if (day) info += t(`daysShort.${day}`)

	if (slot.date) {
		const slotDate = new Date(slot.date.split('.').reverse().join('-'))
		const dateDay = getDayFromDate(slot.date)
		const date = slotDate.toLocaleDateString()

		info += ' '
		info += t(`daysShort.${dateDay}`)
		info += ` ${date}`
	}

	const time = formatTimeRange(slot.time_from, slot.time_to)
	info += ` ${time}`

	return info.trim()
}

/**
 * Actions
 */

// Add all slots from a unit
function handleAddUnit(unit: CourseUnit<void, CourseUnitSlot>) {
	if (!unit.slots || !course.value) return

	const typesInUnit = getUnitTypes(unit)
	const unitsToRemove: number[] = []

	for (const type of typesInUnit) {
		const existing = selectedUnitsStore.value.find((u) => u.unitType === type)
		if (existing) {
			unitsToRemove.push(existing.unitId)
		}
	}

	unitsToRemove.forEach((id) => timetableStore.removeUnit(id))

	for (const slot of unit.slots) {
		const success = timetableStore.addUnit(course.value, unit, slot)
		if (!success) {
			timetableStore.removeUnit(slot.unit_id)
		}
	}
}

// Remove all slots for a unit
function handleRemoveUnit(unit: CourseUnit<void, CourseUnitSlot>) {
	if (!unit.slots) return
	for (const slot of unit.slots) {
		timetableStore.removeUnit(slot.unit_id)
	}
}

// Remove entire course
function handleRemoveCourse() {
	timetableStore.removeCourse(props.unit.courseId)
	emit('close')
}

// Search for courses in this timeslot
function handleSearchInTimeslot() {
	if (!unitDay.value) return

	// Apply the time filter for this course's time slot
	coursesStore.setTimeFilterFromDrag(unitDay.value, props.unit.timeFrom, props.unit.timeTo)

	// Switch to list view
	uiStore.switchToListView()

	// Fetch courses
	coursesStore.fetchCourses()

	// Show info alert
	alertsStore.addAlert({
		type: 'info',
		title: t('components.timetable.TimetableCourseModal.filterApplied'),
		description: t('components.timetable.TimetableCourseModal.filterDescription', {
			from: minutesToTime(props.unit.timeFrom),
			to: minutesToTime(props.unit.timeTo),
			day: dayLabel.value,
		}),
		timeout: 5000,
	})

	emit('close')
}

/** Handle click outside to close */
function handleClickOutside(event: MouseEvent) {
	if (modalRef.value && !modalRef.value.contains(event.target as Node)) {
		emit('close')
	}
}

/** Handle escape key to close */
function handleKeyDown(event: KeyboardEvent) {
	if (event.key === 'Escape') {
		emit('close')
	}
}

onMounted(() => {
	// Slight delay to prevent immediate close from the click that opened the modal
	setTimeout(() => {
		document.addEventListener('click', handleClickOutside)
		document.addEventListener('keydown', handleKeyDown)
	}, 0)
	// Prevent body scroll when modal is open
	document.body.style.overflow = 'hidden'
})

onUnmounted(() => {
	document.removeEventListener('click', handleClickOutside)
	document.removeEventListener('keydown', handleKeyDown)
	document.body.style.overflow = ''
})
</script>

<template>
	<Teleport to="body">
		<!-- Backdrop -->
		<div class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />

		<!-- Modal -->
		<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div ref="modalRef" class="modal max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-lg border border-[var(--insis-border)] bg-white shadow-xl">
				<!-- Header -->
				<div class="flex items-center justify-between border-b border-[var(--insis-border)] bg-[var(--insis-header-bg)] px-4 py-3">
					<div class="flex items-center gap-3">
						<div>
							<h2 class="text-lg font-semibold text-[var(--insis-text)]">
								{{ unit.courseIdent }}
							</h2>
							<p class="text-sm text-[var(--insis-gray-600)]">{{ unit.courseTitle }}</p>
						</div>
					</div>
					<button
						type="button"
						class="rounded p-1 text-[var(--insis-gray-500)] hover:bg-[var(--insis-gray-100)] hover:text-[var(--insis-gray-700)]"
						@click="emit('close')"
					>
						<IconX class="h-5 w-5" />
					</button>
				</div>

				<!-- Content -->
				<div class="max-h-[calc(90vh-140px)] overflow-y-auto p-4">
					<!-- Loading State -->
					<div v-if="loading" class="flex items-center justify-center py-12">
						<IconLoader class="h-8 w-8 animate-spin text-[var(--insis-blue)]" />
					</div>

					<!-- Error State -->
					<div v-else-if="error" class="rounded border border-[var(--insis-danger)] bg-red-50 p-4 text-center">
						<p class="text-[var(--insis-danger)]">{{ error }}</p>
						<button type="button" class="insis-btn insis-btn-secondary mt-3 text-sm" @click="fetchCourse">
							{{ $t('common.retry') }}
						</button>
					</div>

					<!-- Course Content -->
					<div v-else-if="course" class="grid gap-6 lg:grid-cols-2">
						<!-- Course Info -->
						<div>
							<h3 class="mb-3 flex items-center gap-1.5 font-medium text-[var(--insis-gray-900)]">
								{{ $t('components.timetable.TimetableCourseModal.courseInfo') }}
								<a
									v-if="course.url"
									:href="course.url"
									target="_blank"
									rel="noopener noreferrer"
									class="text-[var(--insis-blue)] hover:text-[var(--insis-blue-dark)]"
									:title="$t('common.openInInsis')"
								>
									<IconExternalLink class="h-3 w-3" />
								</a>
							</h3>

							<dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
								<dt class="text-[var(--insis-gray-500)]">{{ $t('components.courses.CourseRowExpanded.faculty') }}</dt>
								<dd>{{ course.faculty?.title || course.faculty_id || '-' }}</dd>

								<dt class="text-[var(--insis-gray-500)]">{{ $t('components.courses.CourseRowExpanded.ectsCredits') }}</dt>
								<dd class="font-medium">{{ course.ects ?? '-' }}</dd>

								<dt class="text-[var(--insis-gray-500)]">{{ $t('components.courses.CourseRowExpanded.completion') }}</dt>
								<dd>{{ course.mode_of_completion || '-' }}</dd>

								<dt class="text-[var(--insis-gray-500)]">{{ $t('components.courses.CourseRowExpanded.language') }}</dt>
								<dd>{{ course.languages?.split('|').join(', ') || '-' }}</dd>

								<template v-if="course.study_plans?.length">
									<dt class="text-[var(--insis-gray-500)]">{{ $t('components.courses.CourseRowExpanded.category') }}</dt>
									<dd>
										<span
											v-for="spc in course.study_plans"
											:key="spc.id"
											class="insis-badge mr-1"
											:class="{
												'insis-badge-compulsory': spc.category === 'compulsory',
												'insis-badge-elective': spc.category === 'elective',
												'insis-badge-other': spc.category !== 'compulsory' && spc.category !== 'elective',
											}"
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
									<div v-if="unit.lecturer" class="flex items-center justify-between">
										<span class="text-[var(--insis-gray-500)]">{{ $t('common.lecturer') }}:</span>
										<span>{{ unit.lecturer }}</span>
									</div>
								</div>
							</div>

							<!-- Assessments -->
							<div v-if="course.assessments?.length" class="mt-4">
								<h4 class="mb-2 text-sm font-medium text-[var(--insis-gray-700)]">
									{{ $t('components.courses.CourseRowExpanded.assessments') }}
								</h4>
								<ul class="space-y-1 text-sm">
									<li v-for="assessment in course.assessments" :key="assessment.id">{{ assessment.method }}: {{ assessment.weight }}%</li>
								</ul>
							</div>
						</div>

						<!-- Unit Selection -->
						<div>
							<div class="mb-3 flex items-center justify-between">
								<h4 class="font-medium text-[var(--insis-gray-900)]">
									{{ $t('components.courses.CourseRowExpanded.unitSelection') }}
								</h4>
								<div class="flex items-center gap-2">
									<span v-if="isSelectionComplete" class="insis-badge insis-badge-success">
										<IconCheck class="mr-1 inline h-3 w-3" />
										{{ $t('components.courses.CourseRowExpanded.complete') }}
									</span>
								</div>
							</div>

							<!-- Unit type groups -->
							<div class="space-y-4 h-full">
								<div class="h-full" v-for="[key, group] in unitsByGroup" :key="key">
									<div class="mb-2 flex items-center gap-2">
										<span class="text-sm font-medium text-[var(--insis-gray-700)]">
											{{ getGroupLabel(group.types) }}
										</span>
										<span v-if="isGroupSatisfied(group.types)" class="insis-badge insis-badge-success text-xs">
											{{ $t('components.courses.CourseRowExpanded.selected') }}
										</span>
										<span v-else class="text-xs text-[var(--insis-gray-500)]">
											({{
												group.units.length === 1
													? $t('components.courses.CourseRowExpanded.selectAction')
													: $t('components.courses.CourseRowExpanded.selectOne')
											}}
											{{ group.units.length }})
										</span>
									</div>

									<!-- Units in group -->
									<div class="h-full space-y-2 overflow-y-auto">
										<div
											v-for="courseUnit in group.units"
											:key="courseUnit.id"
											:class="[
												'rounded border text-sm transition-colors',
												isUnitSelected(courseUnit.id)
													? 'border-[var(--insis-success)] bg-[var(--insis-success-light)]'
													: 'border-[var(--insis-border)] bg-white hover:border-[var(--insis-blue)]',
											]"
										>
											<div class="flex items-center justify-between p-2">
												<div class="flex w-full flex-col gap-1">
													<div v-for="slot in courseUnit.slots" :key="slot.id" class="flex items-center gap-3">
														<span
															class="w-8 shrink-0 rounded bg-[var(--insis-gray-200)] px-1 py-0.5 text-center text-xs text-[var(--insis-gray-700)]"
														>
															{{ getShortTypeLabel(timetableStore.getSlotType(slot)) }}
														</span>
														<span class="shrink-0 whitespace-nowrap font-medium">
															{{ formatSlotInfo(slot) }}
														</span>
														<span class="shrink-0 truncate text-[var(--insis-gray-600)]" :title="slot.location || ''">
															{{ slot.location || '-' }}
														</span>
													</div>

													<div
														v-if="courseUnit.capacity !== undefined || courseUnit.note"
														class="mt-1 flex items-center gap-2 pl-[44px]"
													>
														<span
															v-if="courseUnit.capacity !== undefined"
															:class="[
																'text-xs',
																courseUnit.capacity && courseUnit.capacity > 0
																	? 'text-[var(--insis-success)]'
																	: 'text-[var(--insis-danger)]',
															]"
														>
															{{ courseUnit.capacity }} {{ $t('common.seats') }}
														</span>
														<span v-if="courseUnit.note" class="text-xs italic text-[var(--insis-gray-400)]">
															{{ courseUnit.note }}
														</span>
													</div>
												</div>

												<!-- Add/Remove Button -->
												<div class="ml-4 shrink-0">
													<template v-if="isUnitSelected(courseUnit.id)">
														<button
															type="button"
															class="insis-btn bg-white px-3 py-1.5 text-xs hover:border-[var(--insis-danger)] hover:bg-red-50 hover:text-[var(--insis-danger)]"
															:title="$t('common.remove')"
															@click.stop="handleRemoveUnit(courseUnit)"
														>
															<IconMinus class="h-4 w-4" />
														</button>
													</template>
													<template v-else>
														<button
															type="button"
															class="flex items-center gap-1 px-3 py-1.5 text-xs"
															:class="{
																'insis-btn-primary': !isGroupSatisfied(group.types),
																'insis-btn-secondary': isGroupSatisfied(group.types),
																'opacity-90': isGroupSatisfied(group.types),
															}"
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

							<div v-if="!course.units?.length" class="insis-panel insis-panel-warning mt-4">
								<p class="text-sm">{{ $t('components.courses.CourseRowExpanded.noUnitsAvailable') }}</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Footer -->
				<div class="flex items-center justify-between border-t border-[var(--insis-border)] bg-[var(--insis-gray-50)] px-4 py-3">
					<button type="button" class="insis-btn-text flex items-center gap-1 text-sm text-[var(--insis-danger)]" @click="handleRemoveCourse">
						<IconTrash class="h-4 w-4" />
						{{ $t('components.timetable.TimetableCourseModal.removeFromTimetable') }}
					</button>

					<div class="flex items-center gap-2">
						<button type="button" class="insis-btn insis-btn-secondary text-sm" @click="emit('close')">
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
