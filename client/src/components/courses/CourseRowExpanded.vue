<script setup lang="ts">
/**
 * CourseRowExpanded
 *
 * Expanded view for a course row showing full details and unit selection.
 * Handles grouping slots by unit and selecting entire units.
 *
 * REFACTORED: Uses shared composables instead of inline logic.
 */

import { CourseUnitSlot, CourseWithRelations } from '@api/Database/types'
import { useCourseLabels, useCourseUnitSelection, useSlotFormatting, useSlotSorting, useTimeFilterMatching } from '@client/composables'
import { toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import IconAlertTriangle from '~icons/lucide/alert-triangle'
import IconCheck from '~icons/lucide/check'
import IconExternalLink from '~icons/lucide/external-link'
import IconMinus from '~icons/lucide/minus'
import IconPlus from '~icons/lucide/plus'
import IconTrash from '~icons/lucide/trash-2'

const { t, te } = useI18n({ useScope: 'global' })

// ============================================================================
// Props & Emits
// ============================================================================

interface Props {
	course: CourseWithRelations
}

const props = defineProps<Props>()

// ============================================================================
// Composables
// ============================================================================

// Course label translations
const {
	getCompletionLabel,
	getFacultyLabel,
	getLanguagesLabel,
	getCategoryLabel,
	getUnitTypesGroupLabel,
	getShortUnitTypeLabel,
	getCourseTitle,
	getSlotType,
	getCategoryBadgeClass,
} = useCourseLabels()

// Course unit selection logic
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
	handleRemoveCourse,
} = useCourseUnitSelection({ course: toRef(props, 'course') })

// Slot sorting
const { sortSlots, sortUnits } = useSlotSorting()

// Slot formatting
const { formatSlotInfo, formatCapacity, getCapacityClass } = useSlotFormatting()

// Time filter matching
const { slotMatchesTimeFilter, unitMatchesTimeFilter } = useTimeFilterMatching()

// ============================================================================
// Computed Helpers
// ============================================================================

/**
 * Get missing unit types labels for the warning message.
 */
function getMissingTypesLabel(): string {
	return missingUnitTypes.value
		.map((type) => {
			const key = `unitTypes.${type}`
			return te(key) ? t(key) : type
		})
		.join(', ')
}

/**
 * Get slot highlight class based on filter match and slot type.
 */
function getSlotHighlightClass(slot: CourseUnitSlot): string {
	if (!slotMatchesTimeFilter(slot)) return ''

	const type = getSlotType(slot)
	const classes: Record<string, string> = {
		lecture: 'bg-[var(--insis-block-lecture)]!',
		exercise: 'bg-[var(--insis-block-exercise)]!',
		seminar: 'bg-[var(--insis-block-seminar)]!',
	}
	return classes[type] ?? ''
}
</script>

<template>
	<div class="p-4">
		<div class="grid gap-6 lg:grid-cols-2">
			<!-- Course Info -->
			<div>
				<h3 class="mb-3 flex items-center gap-1.5 font-medium text-[var(--insis-gray-900)]">
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
					<dt class="text-[var(--insis-gray-500)]">
						{{ $t('components.courses.CourseRowExpanded.faculty') }}
					</dt>
					<dd>{{ course.faculty_id ? getFacultyLabel(course.faculty_id) : '-' }}</dd>

					<dt class="text-[var(--insis-gray-500)]">
						{{ $t('components.courses.CourseRowExpanded.ectsCredits') }}
					</dt>
					<dd class="font-medium">{{ course.ects ?? '-' }}</dd>

					<dt class="text-[var(--insis-gray-500)]">
						{{ $t('components.courses.CourseRowExpanded.completion') }}
					</dt>
					<dd>
						{{ course.mode_of_completion ? getCompletionLabel(course.mode_of_completion) : '-' }}
					</dd>

					<dt class="text-[var(--insis-gray-500)]">
						{{ $t('components.courses.CourseRowExpanded.language') }}
					</dt>
					<dd>{{ getLanguagesLabel(course.languages) }}</dd>

					<template v-if="course.study_plans?.length">
						<dt class="text-[var(--insis-gray-500)]">
							{{ $t('components.courses.CourseRowExpanded.category') }}
						</dt>
						<dd>
							<span v-for="spc in course.study_plans" :key="spc.id" class="insis-badge mr-1" :class="getCategoryBadgeClass(spc.category || '')">
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
					<h4 class="font-medium text-[var(--insis-gray-900)]">
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
					<IconAlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-[var(--insis-warning-dark)]" />
					<div>
						<p class="font-medium text-[var(--insis-warning-dark)]">
							{{ $t('components.courses.CourseRowExpanded.incompleteSelectionTitle') }}
						</p>
						<p class="text-[var(--insis-gray-700)]">
							{{
								$t('components.courses.CourseRowExpanded.incompleteSelectionDescription', {
									types: getMissingTypesLabel(),
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
								{{ getUnitTypesGroupLabel(group.types) }}
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
									<div class="flex w-full flex-col gap-1">
										<div v-for="slot in sortSlots(unit.slots)" :key="slot.id" class="-mx-1 flex items-center gap-3 rounded px-1">
											<span
												class="w-8 shrink-0 rounded bg-[var(--insis-gray-200)] px-1 py-0.5 text-center text-xs text-[var(--insis-gray-700)]"
												:class="getSlotHighlightClass(slot)"
											>
												{{ getShortUnitTypeLabel(getSlotType(slot)) }}
											</span>

											<span class="shrink-0 whitespace-nowrap font-medium">
												{{ formatSlotInfo(slot) }}
											</span>

											<span class="shrink-0 truncate text-[var(--insis-gray-600)]" :title="slot.location || ''">
												{{ slot.location || '-' }}
											</span>

											<span class="hidden truncate text-xs text-[var(--insis-gray-500)] sm:block">
												{{ unit.lecturer }}
											</span>
										</div>

										<div class="mt-1 flex items-center gap-2 pl-[44px]">
											<span v-if="unit.capacity !== undefined" :class="['text-xs', getCapacityClass(unit.capacity)]">
												{{ formatCapacity(unit.capacity) }}
											</span>
											<span v-if="unit.note" class="text-xs italic text-[var(--insis-gray-400)]">
												{{ unit.note }}
											</span>
										</div>
									</div>

									<!-- Add/Remove Button -->
									<div class="ml-4 shrink-0">
										<template v-if="isUnitSelected(unit.id)">
											<button
												type="button"
												class="insis-btn bg-white px-3 py-1.5 text-xs hover:border-[var(--insis-danger)] hover:bg-red-50 hover:text-[var(--insis-danger)]"
												:title="$t('common.remove')"
												@click.stop="handleRemoveUnit(unit)"
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
													'insis-btn-secondary opacity-90': isGroupSatisfied(group.types),
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
