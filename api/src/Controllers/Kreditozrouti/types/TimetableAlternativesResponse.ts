import { CourseTimetableUnitWithSlots } from '@api/Database/types'

/**
 * Response payload containing course ID and its timetable alternatives.
 *
 * @route POST /kreditozrouti/timetable/alternatives
 */
export default interface TimetableAlternativesResponse {
	course_id: number
	alternatives: CourseTimetableUnitWithSlots[]
}
