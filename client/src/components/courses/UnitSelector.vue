<script setup lang="ts">
import type { CourseUnitWithSlots, SelectedCourseUnit } from '@client/types'
import type { CourseUnitDTO, CourseUnitSlotDTO, CourseWithRelationsDTO } from '@shared/http/responses'
import { computed, ref, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCourseLabels, useCourseUnitSelection, useSlotFormatting, useSlotSorting, useTimeFilterMatching } from '@client/composables'
import { useTimetableStore } from '@client/stores'
import IconAlertTriangle from '~icons/lucide/alert-triangle'
import IconCheck from '~icons/lucide/check'
import IconEyeOff from '~icons/lucide/eye-off'
import IconMapPin from '~icons/lucide/map-pin'
import IconMinus from '~icons/lucide/minus'
import IconOctagonAlert from '~icons/lucide/octagon-alert'
import IconPlus from '~icons/lucide/plus'
import IconTrash from '~icons/lucide/trash-2'

const { t, te } = useI18n({ useScope: 'global' })

interface Props {
	course: CourseWithRelationsDTO
}

const props = defineProps<Props>()

const timetableStore = useTimetableStore()

const { getUnitTypesGroupLabel, getShortUnitTypeLabel, getSlotType } = useCourseLabels()

const {
	unitsByGroup,
	selectedUnits: selectedUnitsStore,
	isSelectionComplete,
	hasIncompleteSelection,
	missingUnitTypes,
	isUnitSelected,
	isGroupSatisfied,
	handleAddUnit,
	handleRemoveUnit,
	handleRemoveCourse
} = useCourseUnitSelection({ course: toRef(props, 'course') })

const { sortSlots, sortUnits } = useSlotSorting()
const { formatSlotInfo, formatCapacity, getCapacityClass } = useSlotFormatting()
const { slotMatchesTimeFilter, unitMatchesTimeFilter } = useTimeFilterMatching()

const hideConflictingUnits = ref(false)

function getSlotConflicts(slot: CourseUnitSlotDTO): SelectedCourseUnit[] {
	return timetableStore.getSlotConflicts(slot)
}

function getSlotCampusConflicts(slot: CourseUnitSlotDTO): SelectedCourseUnit[] {
	return timetableStore.getSlotCampusConflicts(slot)
}

function unitHasConflicts(unit: CourseUnitDTO): boolean {
	return timetableStore.unitHasConflicts(unit)
}

function unitHasCampusConflictsOnly(unit: CourseUnitDTO): boolean {
	return !timetableStore.unitHasConflicts(unit) && timetableStore.unitHasCampusConflicts(unit)
}

function hiddenConflictCount(units: CourseUnitWithSlots[]): number {
	if (!hideConflictingUnits.value) return 0
	return units.filter(u => unitHasConflicts(u)).length
}

function getVisibleUnits(units: CourseUnitWithSlots[]): CourseUnitWithSlots[] {
	if (!hideConflictingUnits.value) return units
	return units.filter(u => !unitHasConflicts(u) || isUnitSelected(u.id))
}

const hasAnyConflicts = computed(() => {
	for (const [, group] of unitsByGroup.value) {
		for (const unit of group.units) {
			if (unitHasConflicts(unit)) return true
		}
	}
	return false
})

const hasCampusConflictForCourse = computed(() => timetableStore.courseStatuses.get(props.course.id)?.status === 'campus-conflict')

const campusConflictingCourses = computed(() => {
	const entry = timetableStore.courseStatuses.get(props.course.id)
	return entry?.campusConflictsWith ?? []
})

const conflictingUnitCount = computed(() => {
	let count = 0
	for (const [, group] of unitsByGroup.value) {
		for (const unit of group.units) {
			if (unitHasConflicts(unit)) count++
		}
	}
	return count
})

function formatSlotConflictTooltip(slot: CourseUnitSlotDTO): string {
	const conflicts = getSlotConflicts(slot)
	if (conflicts.length > 0) {
		const courseIdents = [...new Set(conflicts.map(c => c.courseIdent))]
		return t('components.courses.CourseRowExpanded.conflictsWithCourses', { courses: courseIdents.join(', ') })
	}
	const campusConflicts = getSlotCampusConflicts(slot)
	if (campusConflicts.length > 0) {
		const courseIdents = [...new Set(campusConflicts.map(c => c.courseIdent))]
		return t('components.filters.CampusConflict.campusConflictTooltip') + ' (' + courseIdents.join(', ') + ')'
	}
	return ''
}

function getSlotCampusConflictTooltip(slot: CourseUnitSlotDTO): string {
	const campusConflicts = getSlotCampusConflicts(slot)
	if (campusConflicts.length === 0) return ''
	const courseIdents = [...new Set(campusConflicts.map(c => c.courseIdent))]
	return t('components.filters.CampusConflict.campusConflictTooltip') + ' (' + courseIdents.join(', ') + ')'
}

function getMissingTypesLabel(): string {
	return missingUnitTypes.value
		.map(type => {
			const key = `unitTypes.${type}`
			return te(key) ? t(key) : type
		})
		.join(', ')
}

function getSlotHighlightClass(slot: CourseUnitSlotDTO): string {
	if (!slotMatchesTimeFilter(slot)) return ''
	const type = getSlotType(slot)
	const classes: Record<string, string> = {
		lecture: 'bg-(--insis-block-lecture)!',
		exercise: 'bg-(--insis-block-exercise)!',
		seminar: 'bg-(--insis-block-seminar)!'
	}
	return classes[type] ?? ''
}

function getSlotConflictClass(slot: CourseUnitSlotDTO): string {
	if (getSlotConflicts(slot).length > 0) return 'bg-(--insis-danger-light)'
	if (getSlotCampusConflicts(slot).length > 0) return 'bg-(--insis-warning-light)'
	return ''
}
</script>

<template>
	<div>
		<div class="mb-3 flex items-center justify-between">
			<h4 class="font-medium text-(--insis-gray-900)">
				{{ $t('components.courses.CourseRowExpanded.unitSelection') }}
			</h4>
			<div class="flex items-center gap-2">
				<span v-if="isSelectionComplete" class="insis-badge insis-badge-success">
					<IconCheck class="mr-1 inline h-3 w-3" />
					{{ $t('components.courses.CourseRowExpanded.complete') }}
				</span>
				<button
					v-if="selectedUnitsStore.length > 0"
					type="button"
					class="insis-btn-text text-xs text-(--insis-danger)"
					:aria-label="$t('components.courses.CourseRowExpanded.removeAll')"
					@click="handleRemoveCourse"
				>
					<IconTrash class="mr-1 inline h-3 w-3" aria-hidden="true" />
					{{ $t('components.courses.CourseRowExpanded.removeAll') }}
				</button>
			</div>
		</div>

		<!-- Conflict filter toggle -->
		<div
			v-if="hasAnyConflicts"
			class="mb-3 flex items-center justify-between rounded border border-(--insis-danger-border) bg-(--insis-danger-light) px-3 py-2"
		>
			<div class="flex items-center gap-2 text-sm text-(--insis-danger)">
				<IconOctagonAlert class="h-4 w-4 shrink-0" aria-hidden="true" />
				<span>{{ $t('components.courses.CourseRowExpanded.slotsWithConflicts', { count: conflictingUnitCount }) }}</span>
			</div>
			<label class="flex cursor-pointer items-center gap-1.5 text-xs text-(--insis-danger)">
				<input
					v-model="hideConflictingUnits"
					type="checkbox"
					class="insis-checkbox"
					:aria-label="$t('components.courses.CourseRowExpanded.hideConflicting')"
				/>
				<IconEyeOff class="h-3 w-3" aria-hidden="true" />
				{{ $t('components.courses.CourseRowExpanded.hideConflicting') }}
			</label>
		</div>

		<!-- Incomplete selection warning -->
		<div v-if="hasIncompleteSelection" class="mb-4 flex items-start gap-2 rounded border border-(--insis-warning) bg-(--insis-warning-light) p-3 text-sm">
			<IconAlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-(--insis-warning-dark)" aria-hidden="true" />
			<div>
				<p class="font-medium text-(--insis-warning-dark)">
					{{ $t('components.courses.CourseRowExpanded.incompleteSelectionTitle') }}
				</p>
				<p class="text-(--insis-gray-700)">
					{{ $t('components.courses.CourseRowExpanded.incompleteSelectionDescription', { types: getMissingTypesLabel() }) }}
				</p>
			</div>
		</div>

		<!-- Campus conflict warning -->
		<div
			v-if="hasCampusConflictForCourse"
			class="mb-4 flex items-start gap-2 rounded border border-(--insis-warning) bg-(--insis-warning-light) p-3 text-sm"
		>
			<IconMapPin class="mt-0.5 h-4 w-4 shrink-0 text-(--insis-warning-dark)" aria-hidden="true" />
			<div>
				<p class="font-medium text-(--insis-warning-dark)">
					{{ $t('components.courses.CourseRowExpanded.campusConflictTitle') }}
				</p>
				<p class="text-(--insis-gray-700)">
					{{ $t('components.courses.CourseRowExpanded.campusConflictDescription', { courses: campusConflictingCourses.join(', ') }) }}
				</p>
			</div>
		</div>

		<!-- Unit type groups -->
		<div class="space-y-5">
			<div v-for="[key, group] in unitsByGroup" :key="key">
				<div class="mb-2 flex items-center gap-2">
					<span class="text-sm font-medium text-(--insis-gray-700)">{{ getUnitTypesGroupLabel(group.types) }}</span>
					<span v-if="isGroupSatisfied(group.types)" class="insis-badge insis-badge-success">
						{{ $t('components.courses.CourseRowExpanded.selected') }}
					</span>
					<span v-else class="text-xs text-(--insis-gray-500)">
						({{
							group.units.length === 1
								? $t('components.courses.CourseRowExpanded.selectAction')
								: $t('components.courses.CourseRowExpanded.selectOne')
						}}
						{{ group.units.length }})
					</span>
					<span v-if="hiddenConflictCount(group.units) > 0" class="text-xs text-(--insis-warning)">
						({{ $t('components.courses.CourseRowExpanded.hiddenConflicts', { count: hiddenConflictCount(group.units) }) }})
					</span>
				</div>

				<!-- Units -->
				<div class="space-y-2">
					<div
						v-for="unit in sortUnits(getVisibleUnits(group.units))"
						:key="unit.id"
						class="rounded border text-sm transition-colors"
						:class="{
							'border-(--insis-danger-border) bg-(--insis-danger-light)': unitHasConflicts(unit),
							'border-(--insis-warning-border) bg-(--insis-warning-light)': !unitHasConflicts(unit) && unitHasCampusConflictsOnly(unit),
							'border-(--insis-success) bg-(--insis-success-light)':
								isUnitSelected(unit.id) && !unitHasConflicts(unit) && !unitHasCampusConflictsOnly(unit),
							'border-(--insis-border) bg-(--insis-surface) hover:border-(--insis-blue)':
								!isUnitSelected(unit.id) && !unitMatchesTimeFilter(unit) && !unitHasConflicts(unit) && !unitHasCampusConflictsOnly(unit),
							'bg-(--insis-blue-light) ring-1 ring-(--insis-blue)':
								!isUnitSelected(unit.id) && unitMatchesTimeFilter(unit) && !unitHasConflicts(unit)
						}"
					>
						<div class="flex items-center justify-between p-2">
							<div class="flex min-w-0 flex-1 flex-col gap-1">
								<div
									v-for="slot in sortSlots(unit.slots)"
									:key="slot.id"
									:class="['-mx-1 flex items-center gap-3 rounded px-1', getSlotConflictClass(slot)]"
									:title="formatSlotConflictTooltip(slot)"
								>
									<span
										class="w-8 shrink-0 rounded bg-(--insis-gray-200) px-1 py-0.5 text-center text-xs text-(--insis-gray-700)"
										:class="getSlotHighlightClass(slot)"
									>
										{{ getShortUnitTypeLabel(getSlotType(slot)) }}
									</span>
									<span class="shrink-0 font-medium whitespace-nowrap">{{ formatSlotInfo(slot) }}</span>
									<span class="min-w-0 truncate text-(--insis-gray-600)" :title="slot.location || ''">{{ slot.location || '-' }}</span>
									<span class="hidden min-w-0 truncate text-xs text-(--insis-gray-500) sm:block">{{ unit.lecturer }}</span>
									<span
										v-if="getSlotConflicts(slot).length > 0"
										class="ml-auto flex shrink-0 items-center gap-1 text-xs text-(--insis-danger)"
										:title="formatSlotConflictTooltip(slot)"
									>
										<IconOctagonAlert class="h-3 w-3" aria-hidden="true" />
										<span class="hidden sm:inline">{{ [...new Set(getSlotConflicts(slot).map(c => c.courseIdent))].join(', ') }}</span>
									</span>
									<span
										v-else-if="getSlotCampusConflicts(slot).length > 0"
										class="ml-auto flex shrink-0 items-center gap-1 text-xs text-(--insis-warning)"
										:title="getSlotCampusConflictTooltip(slot)"
									>
										<IconAlertTriangle class="h-3 w-3" aria-hidden="true" />
										<span class="hidden sm:inline">{{
											[...new Set(getSlotCampusConflicts(slot).map(c => c.courseIdent))].join(', ')
										}}</span>
									</span>
								</div>

								<div class="mt-1 flex items-center gap-2 pl-[44px]">
									<span v-if="unit.capacity !== undefined" :class="['text-xs', getCapacityClass(unit.capacity)]">{{
										formatCapacity(unit.capacity)
									}}</span>
									<span v-if="unit.note" class="text-xs text-(--insis-gray-400) italic">{{ unit.note }}</span>
								</div>
							</div>

							<!-- Add/Remove Button -->
							<div class="ml-4 shrink-0">
								<template v-if="isUnitSelected(unit.id)">
									<button
										type="button"
										class="insis-btn min-h-[44px] bg-(--insis-surface) px-3 py-1.5 text-xs hover:border-(--insis-danger) hover:bg-(--insis-danger-light) hover:text-(--insis-danger)"
										:aria-label="$t('common.remove')"
										@click.stop="handleRemoveUnit(unit)"
									>
										<IconMinus class="h-4 w-4" aria-hidden="true" />
									</button>
								</template>
								<template v-else>
									<button
										type="button"
										class="flex min-h-[44px] items-center gap-1 px-3 py-1.5 text-xs"
										:class="{
											'insis-btn-primary': !isGroupSatisfied(group.types),
											'insis-btn-secondary opacity-90': isGroupSatisfied(group.types)
										}"
										:aria-label="isGroupSatisfied(group.types) ? $t('common.change') : $t('common.add')"
										@click.stop="handleAddUnit(unit)"
									>
										<IconPlus v-if="!isGroupSatisfied(group.types)" class="h-3 w-3" aria-hidden="true" />
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
</template>
