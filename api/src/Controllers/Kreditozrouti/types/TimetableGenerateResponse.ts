import { TimetableGenerated } from '@api/Interfaces/Timetable'

/**
 * Response payload containing a generated timetable.
 *
 * @route POST /kreditozrouti/timetable/generate
 */
export default interface TimetableGenerateResponse {
	timetable: TimetableGenerated
}
