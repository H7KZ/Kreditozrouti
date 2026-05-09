import DateService from '@api/Services/DateService'
import { TimeSelection } from '@api/Validations'
import { InSISDayValues } from '@scraper/types/insis'
import { ExpressionBuilder } from 'kysely'

/**
 * Builds Kysely filter conditions that determine whether a slot conflicts with
 * a given TimeSelection exclusion.
 *
 * A slot "conflicts" with an exclusion if any of the following hold:
 * - Same weekday AND time ranges overlap (day-based exclusion)
 * - Same exact date AND time ranges overlap (date-based exclusion)
 * - Slot's weekday matches the date's weekday AND time ranges overlap
 *   (catches recurring weekly slots that fall on the excluded date)
 *
 * If `exc.slot_id` is set, that specific slot is excluded from conflict
 * detection (because it is the slot the user already selected).
 *
 * @param eb         - Kysely ExpressionBuilder for the current query scope
 * @param exc        - The time selection to check against
 * @param slotAlias  - SQL alias for the slot table (e.g. `'cus3'`)
 * @returns Array of Kysely expressions; combine with `.and()` or `.or()`
 */
export function buildSlotConflictConditions(eb: ExpressionBuilder<any, any>, exc: TimeSelection, slotAlias: string) {
	const conditions = []

	if (exc.day) {
		// Day-based exclusion: matches slots on the same weekday with overlapping time
		const dayConditions = [
			eb(`${slotAlias}.day`, '=', exc.day),
			eb(`${slotAlias}.time_from`, '<', exc.time_to),
			eb(`${slotAlias}.time_to`, '>', exc.time_from)
		]
		if (exc.slot_id) {
			dayConditions.push(eb(`${slotAlias}.id`, '!=', exc.slot_id))
		}
		conditions.push(eb.and(dayConditions))
	}

	if (exc.date) {
		const dateStr = exc.date instanceof Date ? exc.date.toISOString().split('T')[0] : String(exc.date)

		// Date-based exclusion: matches slots on the exact same date with overlapping time
		const dateConditions = [
			eb(`${slotAlias}.date`, '=', dateStr),
			eb(`${slotAlias}.time_from`, '<', exc.time_to),
			eb(`${slotAlias}.time_to`, '>', exc.time_from)
		]
		if (exc.slot_id) {
			dateConditions.push(eb(`${slotAlias}.id`, '!=', exc.slot_id))
		}
		conditions.push(eb.and(dateConditions))

		// Also match recurring weekly slots that fall on the same weekday as the excluded date
		// e.g. if the exclusion is for 2025-03-17 (Monday), also catch every-Monday slots
		const dateDay = DateService.getDayFromDate(exc.date)
		if (dateDay) {
			const dateDayConditions = [
				eb(`${slotAlias}.day`, '=', dateDay),
				eb(`${slotAlias}.time_from`, '<', exc.time_to),
				eb(`${slotAlias}.time_to`, '>', exc.time_from)
			]
			if (exc.slot_id) {
				dateDayConditions.push(eb(`${slotAlias}.id`, '!=', exc.slot_id))
			}
			conditions.push(eb.and(dateDayConditions))
		}
	}

	return conditions
}

/**
 * Comparator for sorting TimeSelection objects by day index, then start time,
 * then end time. Used to produce deterministic cache keys.
 */
export function compareTimeSelections(a: TimeSelection, b: TimeSelection): number {
	const aDay = a.day ?? DateService.getDayFromDate(a.date!)
	const bDay = b.day ?? DateService.getDayFromDate(b.date!)

	if (!aDay && !bDay) return 0
	if (!aDay) return -1
	if (!bDay) return 1

	const aDayIndex = InSISDayValues.indexOf(aDay)
	const bDayIndex = InSISDayValues.indexOf(bDay)

	if (aDayIndex !== bDayIndex) return aDayIndex - bDayIndex
	if (a.time_from !== b.time_from) return a.time_from - b.time_from
	return a.time_to - b.time_to
}
