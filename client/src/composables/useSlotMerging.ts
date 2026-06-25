import type { SelectedCourseUnit } from '@client/types'
import type { Day } from '@shared/domain/constants'
import type { Ref } from 'vue'
import { computed } from 'vue'
import { WEEKDAYS } from '@client/constants/timetable'

/**
 * Represents a merged block containing multiple one-time slots
 * that fall on the same day of week, have the same course,
 * same time, and same unit type.
 */
export interface MergedUnit extends SelectedCourseUnit {
	isMerged: boolean
	mergedCount: number
	mergedSlotIds: number[]
	dateRange: string
	originalUnits: SelectedCourseUnit[]
}

/**
 * Type guard to check if a unit is a MergedUnit.
 */
export function isMergedUnit(unit: SelectedCourseUnit | MergedUnit): unit is MergedUnit {
	return 'isMerged' in unit && (unit as MergedUnit).isMerged
}

/**
 * Composable for merging one-time (date-specific) course slots
 * that fall on the same day of week and share course, time, and unit type.
 *
 * Pure data transformation — no store access, no DOM refs.
 *
 * @param unitsByDay - Ref to a Map from Day to SelectedCourseUnit[]
 * @returns mergedUnitsByDay computed, MergedUnit interface (via export), isMergedUnit type guard
 *
 * @example
 * ```ts
 * const { mergedUnitsByDay } = useSlotMerging(toRef(() => timetableStore.unitsByDay))
 * ```
 */
export function useSlotMerging(unitsByDay: Ref<Map<Day, SelectedCourseUnit[]>>) {
	/**
	 * Merge one-time blocks that fall on the same day of the week,
	 * have the same course, same time, and same unit type.
	 */
	const mergedUnitsByDay = computed(() => {
		const result = new Map<Day, (SelectedCourseUnit | MergedUnit)[]>()

		for (const day of WEEKDAYS) {
			result.set(day, [])
		}

		const originalByDay = unitsByDay.value

		for (const day of WEEKDAYS) {
			const dayUnits = originalByDay.get(day) || []
			const processedSlotIds = new Set<number>()
			const mergedUnits: (SelectedCourseUnit | MergedUnit)[] = []

			for (const unit of dayUnits) {
				// Skip if already processed
				if (processedSlotIds.has(unit.slotId)) continue

				// If this is a weekly recurring slot (no date), add as-is
				if (!unit.date) {
					mergedUnits.push(unit)
					processedSlotIds.add(unit.slotId)
					continue
				}

				// This is a one-time (date-only) slot - find others to merge with
				const mergeCandidates = dayUnits.filter(
					other =>
						!processedSlotIds.has(other.slotId) &&
						other.date && // Must also be one-time
						other.courseId === unit.courseId &&
						other.unitType === unit.unitType &&
						other.timeFrom === unit.timeFrom &&
						other.timeTo === unit.timeTo
				)

				if (mergeCandidates.length <= 1) {
					// No other candidates, add as-is
					mergedUnits.push(unit)
					processedSlotIds.add(unit.slotId)
					continue
				}

				// Merge the candidates
				const dates = mergeCandidates
					.map(u => u.date!)
					.sort((a, b) => {
						// Sort dates (DD.MM.YYYY format)
						const [dA, mA, yA] = a.split('.').map(Number)
						const [dB, mB, yB] = b.split('.').map(Number)
						if (yA !== yB) return yA! - yB!
						if (mA !== mB) return mA! - mB!
						return dA! - dB!
					})

				// Create date range string
				const dateRange = dates.length > 2 ? `${dates[0]} - ${dates[dates.length - 1]}` : dates.join(', ')

				const mergedUnit: MergedUnit = {
					...unit,
					isMerged: true,
					mergedCount: mergeCandidates.length,
					mergedSlotIds: mergeCandidates.map(u => u.slotId),
					dateRange,
					originalUnits: mergeCandidates
				}

				mergedUnits.push(mergedUnit)

				// Mark all merged slots as processed
				for (const candidate of mergeCandidates) {
					processedSlotIds.add(candidate.slotId)
				}
			}

			result.set(day, mergedUnits)
		}

		return result
	})

	return {
		mergedUnitsByDay
	}
}
