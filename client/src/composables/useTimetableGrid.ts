import { useTimeUtils } from '@client/composables'
import { TIME_CONFIG, WEEKDAYS } from '@client/constants/timetable.ts'
import type { SelectedCourseUnit } from '@client/types'
import type InSISDay from '@scraper/Types/InSISDay'
import { computed, type ComputedRef, type Ref } from 'vue'

export interface OverlapInfo {
	/** Position index in the overlap group */
	index: number
	/** Total number of overlapping blocks */
	total: number
}

export interface BlockStyle {
	left: string
	width: string
	top: string
	height: string
}

export interface UseTimetableGridOptions {
	/** Row height in pixels (default: 60) */
	rowHeight?: number
	/** Padding from row edges in pixels (default: 2) */
	blockPadding?: number
}

/**
 * Extended unit type that may include merged info
 */
interface ExtendedUnit extends SelectedCourseUnit {
	isMerged?: boolean
	mergedCount?: number
	mergedSlotIds?: number[]
}

/**
 * Timetable grid composable.
 * Updated to support merged units for one-time blocks.
 *
 * @example
 * ```ts
 * const {
 *   timeSlots,
 *   getUnitsForDay,
 *   getBlockStyle,
 *   getOverlapInfo,
 *   getDragSelectionStyle,
 * } = useTimetableGrid(unitsByDay, {
 *   rowHeight: 60,
 *   blockPadding: 2,
 * })
 * ```
 */
export function useTimetableGrid(
	unitsByDay: Ref<Map<InSISDay, (SelectedCourseUnit | ExtendedUnit)[]>> | ComputedRef<Map<InSISDay, (SelectedCourseUnit | ExtendedUnit)[]>>,
	options: UseTimetableGridOptions = {},
) {
	const { rowHeight = 60, blockPadding = 2 } = options
	const { minutesToTime, calculateTimePosition, calculateTimeDuration } = useTimeUtils()

	/**
	 * Time slots for the grid header (every hour).
	 */
	const timeSlots = computed(() => {
		const slots: Array<{ minutes: number; label: string }> = []
		let time = TIME_CONFIG.START

		while (time <= TIME_CONFIG.END) {
			slots.push({
				minutes: time,
				label: minutesToTime(time),
			})
			time += 60 // Every hour
		}

		return slots
	})

	/**
	 * Get units for a specific day.
	 */
	function getUnitsForDay(day: InSISDay): (SelectedCourseUnit | ExtendedUnit)[] {
		return unitsByDay.value.get(day) || []
	}

	/**
	 * Find overlapping groups of units within a day.
	 * Returns a Map where each unit's slotId maps to its position info.
	 * Updated to handle merged units by using their primary slotId.
	 */
	function getOverlapInfo(day: InSISDay): Map<number, OverlapInfo> {
		const units = getUnitsForDay(day)
		const overlapMap = new Map<number, OverlapInfo>()

		if (units.length === 0) return overlapMap

		// Sort units by start time, then by end time
		const sortedUnits = [...units].sort((a, b) => {
			if (a.timeFrom !== b.timeFrom) return a.timeFrom - b.timeFrom
			return a.timeTo - b.timeTo
		})

		// Find all units that overlap with each unit
		for (const unit of sortedUnits) {
			const overlapping = sortedUnits.filter((other) => other.timeFrom < unit.timeTo && unit.timeFrom < other.timeTo)

			// Sort overlapping group consistently to assign stable indices
			overlapping.sort((a, b) => {
				if (a.timeFrom !== b.timeFrom) return a.timeFrom - b.timeFrom
				if (a.timeTo !== b.timeTo) return a.timeTo - b.timeTo
				return a.slotId - b.slotId
			})

			const index = overlapping.findIndex((u) => u.slotId === unit.slotId)
			overlapMap.set(unit.slotId, { index, total: overlapping.length })
		}

		return overlapMap
	}

	/**
	 * Cache overlap info per day to avoid recalculating for each block.
	 */
	const overlapCache = computed(() => {
		const cache = new Map<InSISDay, Map<number, OverlapInfo>>()
		for (const day of WEEKDAYS) {
			cache.set(day, getOverlapInfo(day))
		}
		return cache
	})

	/**
	 * Calculate style for a course block (position and size).
	 */
	function getBlockStyle(unit: SelectedCourseUnit | ExtendedUnit, day: InSISDay): BlockStyle {
		const left = calculateTimePosition(unit.timeFrom, TIME_CONFIG.START, TIME_CONFIG.END)
		const width = calculateTimeDuration(unit.timeFrom, unit.timeTo, TIME_CONFIG.START, TIME_CONFIG.END)

		// Get overlap info for this unit
		const dayOverlaps = overlapCache.value.get(day)
		const overlapInfo = dayOverlaps?.get(unit.slotId) ?? { index: 0, total: 1 }

		// Calculate vertical position within the row
		const availableHeight = rowHeight - blockPadding * 2
		const blockHeight = availableHeight / overlapInfo.total
		const topOffset = blockPadding + overlapInfo.index * blockHeight

		return {
			left: `${left}%`,
			width: `${width}%`,
			top: `${topOffset}px`,
			height: `${blockHeight}px`,
		}
	}

	/**
	 * Get time from X coordinate relative to a day row element.
	 */
	function getTimeFromX(x: number, element: HTMLElement): number {
		const rect = element.getBoundingClientRect()
		const relativeX = x - rect.left
		const percentage = relativeX / rect.width
		const totalMinutes = TIME_CONFIG.END - TIME_CONFIG.START
		const minutes = TIME_CONFIG.START + percentage * totalMinutes

		// Snap to 15-minute intervals
		return Math.max(TIME_CONFIG.START, Math.min(TIME_CONFIG.END, Math.round(minutes / 15) * 15))
	}

	/**
	 * Get drag selection style for a day row.
	 */
	function getDragSelectionStyle(
		day: InSISDay,
		selection: { day: InSISDay; timeFrom: number; timeTo: number } | null,
		active: boolean,
	): { left: string; width: string } | null {
		if (!selection || selection.day !== day || !active) {
			return null
		}

		const left = calculateTimePosition(selection.timeFrom, TIME_CONFIG.START, TIME_CONFIG.END)
		const width = calculateTimeDuration(selection.timeFrom, selection.timeTo, TIME_CONFIG.START, TIME_CONFIG.END)

		return {
			left: `${left}%`,
			width: `${width}%`,
		}
	}

	return {
		// Constants
		timeSlots,
		rowHeight,
		blockPadding,

		// Units
		getUnitsForDay,

		// Positioning
		getBlockStyle,
		getOverlapInfo,
		overlapCache,

		// Drag selection
		getTimeFromX,
		getDragSelectionStyle,
	}
}
