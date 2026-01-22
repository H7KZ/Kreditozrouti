import { TimetableTimeConflict } from '@api/Interfaces/Timetable'

/**
 * Response payload containing timetable conflict information.
 *
 * @route POST /kreditozrouti/timetable/conflicts
 */
export default interface TimetableConflictsResponse {
	has_conflicts: boolean
	conflicts: TimetableTimeConflict[]
}
