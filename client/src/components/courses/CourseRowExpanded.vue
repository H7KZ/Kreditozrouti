<script setup lang="ts">
import { Course, CourseAssessment, CourseUnit, CourseUnitSlot, Faculty, StudyPlanCourse } from '@api/Database/types'
import { useTimeUtils } from '@client/composables'
import { useTimetableStore } from '@client/stores'
import { CourseUnitType } from '@client/types'
import InSISDay from '@scraper/Types/InSISDay.ts'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import IconCheck from '~icons/lucide/check'
import IconMinus from '~icons/lucide/minus'
import IconPlus from '~icons/lucide/plus'
import Search from '~icons/lucide/search'
import IconTrash from '~icons/lucide/trash-2'

/*
 * CourseRowExpanded
 * Expanded view for a course row showing full details and unit selection.
 * Handles grouping slots by unit and selecting entire units.
 */

const { t, te } = useI18n({ useScope: 'global' })
const timetableStore = useTimetableStore()
const { formatTimeRange, getDayFromDate } = useTimeUtils()

type CourseWithRelations = Course<Faculty, CourseUnit<void, CourseUnitSlot>, CourseAssessment, StudyPlanCourse>

interface Props {
	course: CourseWithRelations
}

const props = defineProps<Props>()

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

// Get slot display info
function formatSlotInfo(slot: CourseUnitSlot): string {
	let info = ''

	const day: InSISDay | '-' | null | undefined = slot.day
	if (day) info += t(`daysShort.${day}`)

	if (slot.date) {
		const slotDate = new Date(slot.date.split('.').reverse().join('-')) // Convert DD.MM.YYYY to YYYY-MM-DD
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
	if (!unit.slots) return

	// 1. Identify conflicts/swaps
	// If we are adding a unit that contains "Lecture", and we already have a "Lecture" selected,
	// we need to remove the old one first.
	const typesInUnit = getUnitTypes(unit)
	const slotsToRemove: number[] = []

	// Find existing selected units that clash with the new unit's types
	for (const type of typesInUnit) {
		const existing = selectedUnitsStore.value.find((u) => u.unitType === type)
		if (existing) {
			slotsToRemove.push(existing.slotId)
		}
	}

	// Remove old slots
	slotsToRemove.forEach((id) => timetableStore.removeUnit(id))

	// Add new slots
	const addedSlots: number[] = []

	for (const slot of unit.slots) {
		const success = timetableStore.addUnit(props.course, unit, slot)
		if (success) {
			addedSlots.push(slot.id)
		} else {
			// Rollback if one slot fails (e.g. time conflict with another course)
			addedSlots.forEach((id) => timetableStore.removeUnit(id))
			// Ideally restore the old ones here, but for now we just warn.
			// In a real app, we'd do a dry-run check first.
			console.warn('Failed to add unit slot:', slot.id)
			break
		}
	}
}

// Remove all slots for a unit
function handleRemoveUnit(unit: CourseUnit<void, CourseUnitSlot>) {
	if (!unit.slots) return
	for (const slot of unit.slots) {
		timetableStore.removeUnit(slot.id)
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
					<a :href="course.url" target="_blank" rel="noopener noreferrer" class="flex items-center justify-center hover:text-[var(--insis-blue)]">
						<Search class="inline h-3 w-3" />
					</a>
					{{ course.ident }} - {{ course.title }}
				</h3>

				<dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
					<dt class="text-[var(--insis-gray-500)]">{{ $t('components.courses.CourseRowExpanded.faculty') }}</dt>
					<dd>{{ course.faculty?.title || course.faculty_id }}</dd>

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
								v-for="unit in group.units"
								:key="unit.id"
								:class="[
									'rounded border text-sm transition-colors',
									isUnitSelected(unit.id)
										? 'border-[var(--insis-success)] bg-[var(--insis-success-light)]'
										: 'border-[var(--insis-border)] bg-white hover:border-[var(--insis-blue)]',
								]"
							>
								<div class="flex items-center justify-between p-2">
									<div class="flex flex-col gap-1 w-full">
										<div v-for="slot in unit.slots" :key="slot.id" class="flex items-center gap-3">
											<span
												class="w-8 shrink-0 rounded bg-[var(--insis-gray-200)] px-1 py-0.5 text-center text-xs text-[var(--insis-gray-700)]"
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
