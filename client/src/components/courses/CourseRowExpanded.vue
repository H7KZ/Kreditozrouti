<script setup lang="ts">
import { Course, CourseAssessment, CourseUnit, CourseUnitSlot, Faculty, StudyPlanCourse } from '@api/Database/types'
import { DAYS_ORDER, useTimeUtils } from '@client/composables'
import { useCoursesStore, useTimetableStore } from '@client/stores'
import { CourseUnitType } from '@client/types'
import InSISDay from '@scraper/Types/InSISDay.ts'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import IconAlertTriangle from '~icons/lucide/alert-triangle'
import IconCheck from '~icons/lucide/check'
import IconExternalLink from '~icons/lucide/external-link'
import IconMinus from '~icons/lucide/minus'
import IconPlus from '~icons/lucide/plus'
import IconTrash from '~icons/lucide/trash-2'

/*
 * CourseRowExpanded
 * Expanded view for a course row showing full details and unit selection.
 * Handles grouping slots by unit and selecting entire units.
 */

const { t, te, locale } = useI18n({ useScope: 'global' })
const timetableStore = useTimetableStore()
const coursesStore = useCoursesStore()
const { formatTimeRange, getDayFromDate } = useTimeUtils()

type CourseWithRelations = Course<Faculty, CourseUnit<void, CourseUnitSlot>, CourseAssessment, StudyPlanCourse>

interface Props {
	course: CourseWithRelations
}

const props = defineProps<Props>()

/**
 * Helper: Get day index for sorting (Monday = 0, Sunday = 6)
 */
function getDayIndex(day: InSISDay | null | undefined): number {
	if (!day) return 999 // Put items without day at the end
	const index = DAYS_ORDER.indexOf(day)
	return index === -1 ? 999 : index
}

function sortUnits(units: CourseUnit<void, CourseUnitSlot>[]): CourseUnit<void, CourseUnitSlot>[] {
	return [...units].sort((a, b) => {
		const firstSlotA = sortSlots(a.slots || [])[0]
		const firstSlotB = sortSlots(b.slots || [])[0]

		if (!firstSlotA && !firstSlotB) return 0
		if (!firstSlotA) return 1
		if (!firstSlotB) return -1

		const dayA = firstSlotA.day ?? (firstSlotA.date ? getDayFromDate(firstSlotA.date) : null)
		const dayB = firstSlotB.day ?? (firstSlotB.date ? getDayFromDate(firstSlotB.date) : null)

		const dayIndexA = getDayIndex(dayA)
		const dayIndexB = getDayIndex(dayB)

		if (dayIndexA !== dayIndexB) {
			return dayIndexA - dayIndexB
		}

		const timeA = firstSlotA.time_from ?? 0
		const timeB = firstSlotB.time_from ?? 0
		return timeA - timeB
	})
}

/**
 * Helper: Sort slots by day and time
 */
function sortSlots(slots: CourseUnitSlot[]): CourseUnitSlot[] {
	return [...slots].sort((a, b) => {
		// First, determine the day for each slot
		const dayA = a.day ?? (a.date ? getDayFromDate(a.date) : null)
		const dayB = b.day ?? (b.date ? getDayFromDate(b.date) : null)

		// Compare days
		const dayIndexA = getDayIndex(dayA)
		const dayIndexB = getDayIndex(dayB)

		if (dayIndexA !== dayIndexB) {
			return dayIndexA - dayIndexB
		}

		// If same day, sort by date (for block courses)
		if (a.date && b.date) {
			const dateA = new Date(a.date.split('.').reverse().join('-'))
			const dateB = new Date(b.date.split('.').reverse().join('-'))
			if (dateA.getTime() !== dateB.getTime()) {
				return dateA.getTime() - dateB.getTime()
			}
		}

		// If same day/date, sort by time
		const timeA = a.time_from ?? 0
		const timeB = b.time_from ?? 0
		return timeA - timeB
	})
}

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
 * Example:
 * - Key "lecture": [Unit1, Unit2] (Units containing only lectures)
 * - Key "exercise": [Unit3] (Units containing only exercises)
 * - Key "lecture|exercise": [Unit4] (Units containing both)
 */
const unitsByGroup = computed(() => {
	const groups = new Map<string, { types: CourseUnitType[]; units: Array<CourseUnit<void, CourseUnitSlot>> }>()

	for (const unit of props.course.units || []) {
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
const selectedUnitsStore = computed(() => timetableStore.getUnitsForCourse(props.course.id))

// Check what unit types need to be selected
const requiredUnitTypes = computed(() => {
	const types = new Set<CourseUnitType>()
	for (const unit of props.course.units || []) {
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

// Check if course has some units selected but not all required types
const hasIncompleteSelection = computed(() => {
	if (selectedUnitsStore.value.length === 0) return false
	return !isSelectionComplete.value
})

// Get missing unit types for display
const missingUnitTypes = computed(() => {
	const missing: CourseUnitType[] = []
	for (const type of requiredUnitTypes.value) {
		if (!selectedUnitTypes.value.has(type)) {
			missing.push(type)
		}
	}
	return missing
})

// Check if there's an active time filter
const hasActiveTimeFilter = computed(() => {
	return (coursesStore.filters.include_times?.length ?? 0) > 0
})

// Get active time filters for highlighting
const activeTimeFilters = computed(() => {
	return coursesStore.filters.include_times || []
})

function unitMatchesTimeFilter(unit: CourseUnit<void, CourseUnitSlot>): boolean {
	if (!hasActiveTimeFilter.value) return false

	for (const slot of unit.slots || []) {
		if (slotMatchesTimeFilter(slot)) {
			return true
		}
	}

	return false
}

/**
 * Check if a slot matches any of the active time filters
 */
function slotMatchesTimeFilter(slot: CourseUnitSlot): boolean {
	if (!hasActiveTimeFilter.value) return false

	const slotDay = slot.day ?? (slot.date ? getDayFromDate(slot.date) : null)
	const slotFrom = slot.time_from
	const slotTo = slot.time_to

	if (!slotDay || slotFrom === null || slotTo === null) return false

	return activeTimeFilters.value.some((filter) => {
		// Check if day matches
		if (filter.day !== slotDay) return false

		// Check if time ranges overlap
		const filterFrom = filter.time_from ?? 0
		const filterTo = filter.time_to ?? 1440

		return slotFrom < filterTo && filterFrom < slotTo
	})
}

// Check if a specific unit is fully selected (all its slots are in store)
function isUnitSelected(unitId: number): boolean {
	// We check if we have any slots for this unit selected.
	// Since we add/remove by unit, checking existence is usually enough,
	// but we can be specific:
	return selectedUnitsStore.value.some((u) => u.unitId === unitId)
}

// Check if a specific group of types is fully satisfied
function isGroupSatisfied(types: CourseUnitType[]): boolean {
	return types.every((t) => selectedUnitTypes.value.has(t))
}

// Get mode of completion display
function getCompletionLabel(value: string): string {
	const key = `courseModesOfCompletion.${value}`
	return te(key) ? t(key) : value
}

function getFacultyName(value: string): string {
	const key = `faculties.${value}`
	return te(key) ? t(key) : value
}

function getLanugageName(value: string): string {
	const key = `courseLanguages.${value}`
	return te(key) ? t(key) : value
}

// Generate a label for a group of types (e.g. "Lecture & Exercise")
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

// Get category label
function getCourseTitle(course: CourseWithRelations): string {
	switch (locale.value) {
		case 'cs':
			return course.title_cs ?? course.title ?? ''
		case 'en':
			return course.title_en ?? course.title ?? ''
		default:
			return course.title ?? ''
	}
}

// Get slot display info
function formatSlotInfo(slot: CourseUnitSlot): string {
	let info = ''

	// For recurring slots with day
	const day: InSISDay | null | undefined = slot.day
	if (day) {
		info += t(`daysShort.${day}`)
	}

	// For block/single-occurrence slots with date
	if (slot.date) {
		const slotDate = new Date(slot.date.split('.').reverse().join('-')) // Convert DD.MM.YYYY to YYYY-MM-DD
		const dateDay = getDayFromDate(slot.date)
		const date = slotDate.toLocaleDateString()

		// Add day short name if we don't have recurring day
		if (!day && dateDay) {
			info += t(`daysShort.${dateDay}`)
		}

		info += ` ${date}`
	}

	const time = formatTimeRange(slot.time_from, slot.time_to)
	info += ` ${time}`

	return info.trim()
}

// Add all slots from a unit
function handleAddUnit(unit: CourseUnit<void, CourseUnitSlot>) {
	if (!unit.slots) return

	// 1. Identify conflicts/swaps
	// If we are adding a unit that contains "Lecture", and we already have a "Lecture" selected,
	// we need to remove the old one first.
	const typesInUnit = getUnitTypes(unit)
	const unitsToRemove: number[] = []

	// Find existing selected units that clash with the new unit's types
	for (const type of typesInUnit) {
		const existing = selectedUnitsStore.value.find((u) => u.unitType === type)
		if (existing) {
			unitsToRemove.push(existing.unitId)
		}
	}

	// Remove conflicting units
	unitsToRemove.forEach((id) => timetableStore.removeUnit(id))

	for (const slot of unit.slots) {
		const success = timetableStore.addUnit(props.course, unit, slot)

		if (success) continue

		// Rollback if one slot fails (e.g. time conflict with another course)
		timetableStore.removeUnit(slot.unit_id)

		// TODO: Show user feedback about failure
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
	timetableStore.removeCourse(props.course.id)
}
</script>

<template>
	<div class="p-4">
		<div class="grid gap-6 lg:grid-cols-2">
			<!-- Course Info -->
			<div>
				<h3 class="mb-3 font-medium text-[var(--insis-gray-900)] flex items-center gap-1.5">
					{{ course.ident }} - {{ getCourseTitle(course) }}
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
					<dd>{{ course.faculty_id ? getFacultyName(course.faculty_id) : '-' }}</dd>

					<dt class="text-[var(--insis-gray-500)]">{{ $t('components.courses.CourseRowExpanded.ectsCredits') }}</dt>
					<dd class="font-medium">{{ course.ects ?? '-' }}</dd>

					<dt class="text-[var(--insis-gray-500)]">{{ $t('components.courses.CourseRowExpanded.completion') }}</dt>
					<dd>{{ course.mode_of_completion ? getCompletionLabel(course.mode_of_completion) : '-' }}</dd>

					<dt class="text-[var(--insis-gray-500)]">{{ $t('components.courses.CourseRowExpanded.language') }}</dt>
					<dd>
						{{
							course.languages
								?.split('|')
								.map((lang) => getLanugageName(lang))
								.join(', ') || '-'
						}}
					</dd>

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
					<h4 class="font-medium text-[var(--insis-gray-900)]">{{ $t('components.courses.CourseRowExpanded.unitSelection') }}</h4>
					<div class="flex items-center gap-2">
						<span v-if="isSelectionComplete" class="insis-badge insis-badge-success">
							<IconCheck class="mr-1 inline h-3 w-3" />
							{{ $t('components.courses.CourseRowExpanded.complete') }}
						</span>
						<button
							v-if="selectedUnitsStore.length > 0"
							type="button"
							class="insis-btn-text text-xs text-[var(--insis-danger)]"
							@click="handleRemoveCourse"
						>
							<IconTrash class="mr-1 inline h-3 w-3" />
							{{ $t('components.courses.CourseRowExpanded.removeAll') }}
						</button>
					</div>
				</div>

				<!-- Incomplete selection warning -->
				<div
					v-if="hasIncompleteSelection"
					class="mb-4 flex items-start gap-2 rounded border border-[var(--insis-warning)] bg-[var(--insis-warning-light)] p-3 text-sm"
				>
					<IconAlertTriangle class="h-4 w-4 shrink-0 text-[var(--insis-warning-dark)] mt-0.5" />
					<div>
						<p class="font-medium text-[var(--insis-warning-dark)]">
							{{ $t('components.courses.CourseRowExpanded.incompleteSelectionTitle') }}
						</p>
						<p class="text-[var(--insis-gray-700)]">
							{{
								$t('components.courses.CourseRowExpanded.incompleteSelectionDescription', {
									types: missingUnitTypes.map((type) => (te(`unitTypes.${type}`) ? t(`unitTypes.${type}`) : type)).join(', '),
								})
							}}
						</p>
					</div>
				</div>

				<!-- Unit type groups -->
				<div class="space-y-5">
					<div v-for="[key, group] in unitsByGroup" :key="key">
						<div class="mb-2 flex items-center gap-2">
							<span class="text-sm font-medium text-[var(--insis-gray-700)]">
								{{ getGroupLabel(group.types) }}
							</span>
							<span v-if="isGroupSatisfied(group.types)" class="insis-badge insis-badge-success">
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
						<div class="space-y-2">
							<div
								v-for="unit in sortUnits(group.units)"
								:key="unit.id"
								class="rounded border text-sm transition-colors"
								:class="{
									'border-[var(--insis-success)] bg-[var(--insis-success-light)]': isUnitSelected(unit.id),
									'border-[var(--insis-border)] bg-white hover:border-[var(--insis-blue)]':
										!isUnitSelected(unit.id) && !unitMatchesTimeFilter(unit),
									'bg-[var(--insis-blue-light)] ring-1 ring-[var(--insis-blue)]': !isUnitSelected(unit.id) && unitMatchesTimeFilter(unit),
								}"
							>
								<div class="flex items-center justify-between p-2">
									<div class="flex flex-col gap-1 w-full">
										<div v-for="slot in sortSlots(unit.slots)" :key="slot.id" class="flex items-center gap-3 rounded px-1 -mx-1">
											<span
												class="w-8 shrink-0 rounded bg-[var(--insis-gray-200)] px-1 py-0.5 text-center text-xs text-[var(--insis-gray-700)]"
												:class="{
													'bg-[var(--insis-block-exercise)]!':
														slotMatchesTimeFilter(slot) && timetableStore.getSlotType(slot) === 'exercise',
													'bg-[var(--insis-block-lecture)]!':
														slotMatchesTimeFilter(slot) && timetableStore.getSlotType(slot) === 'lecture',
													'bg-[var(--insis-block-seminar)]!':
														slotMatchesTimeFilter(slot) && timetableStore.getSlotType(slot) === 'seminar',
												}"
											>
												{{ getShortTypeLabel(timetableStore.getSlotType(slot)) }}
											</span>

											<span class="shrink-0 font-medium whitespace-nowrap">
												{{ formatSlotInfo(slot) }}
											</span>

											<span class="shrink-0 truncate text-[var(--insis-gray-600)]" :title="slot.location || ''">
												{{ slot.location || '-' }}
											</span>

											<span class="hidden sm:block truncate text-xs text-[var(--insis-gray-500)]">
												{{ unit.lecturer }}
											</span>
										</div>

										<div class="mt-1 flex items-center gap-2 pl-[44px]">
											<span
												v-if="unit.capacity !== undefined"
												:class="[
													'text-xs',
													unit.capacity && unit.capacity > 0 ? 'text-[var(--insis-success)]' : 'text-[var(--insis-danger)]',
												]"
											>
												{{ unit.capacity }} {{ $t('common.seats') }}
											</span>
											<span v-if="unit.note" class="text-xs text-[var(--insis-gray-400)] italic">
												{{ unit.note }}
											</span>
										</div>
									</div>

									<!-- Add/Remove Button -->
									<div class="ml-4 shrink-0">
										<template v-if="isUnitSelected(unit.id)">
											<button
												type="button"
												class="insis-btn px-3 py-1.5 text-xs bg-white hover:bg-red-50 hover:text-[var(--insis-danger)] hover:border-[var(--insis-danger)]"
												@click.stop="handleRemoveUnit(unit)"
												:title="$t('common.remove')"
											>
												<IconMinus class="h-4 w-4" />
											</button>
										</template>
										<template v-else>
											<button
												type="button"
												class="px-3 py-1.5 text-xs flex items-center gap-1"
												:class="{
													'insis-btn-primary': !isGroupSatisfied(group.types),
													'insis-btn-secondary': isGroupSatisfied(group.types),
													'opacity-90': isGroupSatisfied(group.types), // Dim if type is already selected (swap mode implication)
												}"
												@click.stop="handleAddUnit(unit)"
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
</template>
