<script setup lang="ts">
import { Course, CourseAssessment, CourseUnit, CourseUnitSlot, Faculty, StudyPlanCourse } from '@api/Database/types'
import { useTimeUtils } from '@client/composables'
import { useTimetableStore } from '@client/stores'
import { CourseUnitType } from '@client/types'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import IconCheck from '~icons/lucide/check'
import IconMinus from '~icons/lucide/minus'
import IconPlus from '~icons/lucide/plus'
import IconTrash from '~icons/lucide/trash-2'

/*
 * CourseRowExpanded
 * Expanded view for a course row showing full details and unit selection.
 * Handles the complex logic of selecting lectures, exercises, etc.
 */

const { t, te } = useI18n({ useScope: 'global' })
const timetableStore = useTimetableStore()
const { formatTimeRange, DAYS_SHORT } = useTimeUtils()

type CourseWithRelations = Course<Faculty, CourseUnit<void, CourseUnitSlot>, CourseAssessment, StudyPlanCourse>

interface Props {
	course: CourseWithRelations
}

const props = defineProps<Props>()

// Group units by type
const unitsByType = computed(() => {
	const map = new Map<CourseUnitType, Array<CourseUnit<void, CourseUnitSlot>>>()

	for (const unit of props.course.units || []) {
		for (const slot of unit.slots || []) {
			const type = timetableStore.getSlotType(slot)
			if (!map.has(type)) {
				map.set(type, [])
			}
			map.get(type)!.push(unit)
		}
	}

	return new Map([...map.entries()].sort().reverse())
})

// Get currently selected units for this course
const selectedUnits = computed(() => timetableStore.getUnitsForCourse(props.course.id))

// Check what unit types need to be selected
const requiredUnitTypes = computed(() => {
	const types = new Set<CourseUnitType>()

	for (const unit of props.course.units || []) {
		for (const slot of unit.slots || []) {
			const type = timetableStore.getSlotType(slot)
			types.add(type)
		}
	}

	return types
})

// Check which types are already selected
const selectedUnitTypes = computed(() => new Set(selectedUnits.value.map((u) => u.unitType)))

// Check if course selection is complete
const isSelectionComplete = computed(() => {
	for (const type of requiredUnitTypes.value) {
		if (!selectedUnitTypes.value.has(type)) {
			return false
		}
	}
	return true
})

// Get type label
function getTypeLabel(type: CourseUnitType): string {
	const key = `unitTypes.${type}`
	return te(key) ? t(key) : type
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

// Check if a specific slot is selected
function isSlotSelected(slotId: number): boolean {
	return selectedUnits.value.some((u) => u.slotId === slotId)
}

// Get the selected slot for a unit type
function getSelectedSlotForType(type: CourseUnitType): number | null {
	const unit = selectedUnits.value.find((u) => u.unitType === type)
	return unit?.slotId ?? null
}

// Handle adding a unit
function handleAddUnit(unit: CourseUnit<void, CourseUnitSlot>, slot: CourseUnitSlot) {
	const success = timetableStore.addUnit(props.course, unit, slot)
	if (!success) {
		// Could show an error toast here
		console.warn('Failed to add unit')
	}
}

// Handle changing a unit (swap to different slot of same type)
function handleChangeUnit(unit: CourseUnit<void, CourseUnitSlot>, slot: CourseUnitSlot, oldSlotId: number) {
	const success = timetableStore.changeUnit(props.course, oldSlotId, unit, slot)
	if (!success) {
		console.warn('Failed to change unit')
	}
}

// Handle removing a unit
function handleRemoveUnit(slotId: number) {
	timetableStore.removeUnit(slotId)
}

// Handle removing all units for this course
function handleRemoveCourse() {
	timetableStore.removeCourse(props.course.id)
}

// Get slot display info
function formatSlotInfo(slot: CourseUnitSlot): string {
	const day = DAYS_SHORT[slot.day as keyof typeof DAYS_SHORT] || slot.day
	const time = formatTimeRange(slot.time_from, slot.time_to)
	return `${day} ${time}`
}
</script>

<template>
	<div class="p-4">
		<div class="grid gap-6 lg:grid-cols-2">
			<!-- Course Info -->
			<div>
				<h3 class="mb-3 font-medium text-[var(--insis-gray-900)]">{{ course.ident }} - {{ course.title }}</h3>

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
								}"
							>
								{{ getCategoryLabel(spc.category || '') }}
							</span>
						</dd>
					</template>
				</dl>

				<!-- Assessments -->
				<div v-if="course.assessments?.length" class="mt-4">
					<h4 class="mb-2 text-sm font-medium text-[var(--insis-gray-700)]">{{ $t('components.courses.CourseRowExpanded.assessments') }}</h4>
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
							v-if="selectedUnits.length > 0"
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
				<div class="space-y-4">
					<div v-for="[type, units] in unitsByType" :key="type">
						<div class="mb-2 flex items-center gap-2">
							<span class="text-sm font-medium text-[var(--insis-gray-700)]">
								{{ getTypeLabel(type) }}
							</span>
							<span v-if="selectedUnitTypes.has(type)" class="insis-badge insis-badge-success">
								{{ $t('components.courses.CourseRowExpanded.selected') }}
							</span>
							<span v-else class="text-xs text-[var(--insis-gray-500)]">
								({{
									units.length === 1
										? $t('components.courses.CourseRowExpanded.selectAction')
										: $t('components.courses.CourseRowExpanded.selectOne')
								}}
								{{ units.length }})
							</span>
						</div>

						<!-- Slots for this unit type -->
						<div class="space-y-1">
							<template v-for="unit in units" :key="unit.id">
								<div
									v-for="slot in unit.slots || []"
									:key="slot.id"
									:class="[
										'flex items-center justify-between rounded border p-2 text-sm',
										isSlotSelected(slot.id)
											? 'border-[var(--insis-success)] bg-[var(--insis-success-light)]'
											: 'border-[var(--insis-border)] bg-white',
									]"
								>
									<div class="flex items-center gap-3">
										<!-- Type badge -->
										<span class="w-8 rounded bg-[var(--insis-gray-200)] px-1 py-0.5 text-center text-xs">
											{{ getShortTypeLabel(type) }}
										</span>

										<!-- Time info -->
										<span class="font-medium">
											{{ formatSlotInfo(slot) }}
										</span>

										<!-- Room -->
										<span v-if="slot.location" class="text-[var(--insis-gray-600)]">
											{{ slot.location }}
										</span>

										<!-- Lecturer -->
										<span v-if="unit.lecturer" class="text-xs text-[var(--insis-gray-500)]">
											{{ unit.lecturer }}
										</span>

										<!-- Capacity -->
										<span
											v-if="unit.capacity !== undefined"
											:class="[
												'text-xs',
												unit.capacity && unit.capacity > 0 ? 'text-[var(--insis-success)]' : 'text-[var(--insis-danger)]',
											]"
										>
											{{ unit.capacity }} {{ $t('common.seats') }}
										</span>
									</div>

									<!-- Action buttons -->
									<div class="flex items-center gap-1">
										<template v-if="isSlotSelected(slot.id)">
											<button type="button" class="insis-btn px-2 py-1 text-xs" @click.stop="handleRemoveUnit(slot.id)">
												<IconMinus class="h-3 w-3" />
											</button>
										</template>
										<template v-else>
											<button
												v-if="!selectedUnitTypes.has(type)"
												type="button"
												class="insis-btn-primary px-2 py-1 text-xs"
												@click.stop="handleAddUnit(unit, slot)"
											>
												<IconPlus class="mr-1 h-3 w-3" />
												{{ $t('common.add') }}
											</button>
											<button
												v-else
												type="button"
												class="insis-btn px-2 py-1 text-xs"
												@click.stop="handleChangeUnit(unit, slot, getSelectedSlotForType(type)!)"
											>
												{{ $t('common.change') }}
											</button>
										</template>
									</div>
								</div>
							</template>
						</div>
					</div>
				</div>

				<!-- No units available -->
				<div v-if="!course.units?.length" class="insis-panel insis-panel-warning">
					<p class="text-sm">{{ $t('components.courses.CourseRowExpanded.noUnitsAvailable') }}</p>
				</div>
			</div>
		</div>
	</div>
</template>
