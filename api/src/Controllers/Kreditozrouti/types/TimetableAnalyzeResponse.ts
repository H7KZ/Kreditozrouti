/**
 * Response payload containing the analysis of a timetable.
 *
 * @route POST /kreditozrouti/timetable/analyze
 */
export default interface TimetableAnalyzeResponse {
	byDay: Record<string, { count: number; hours: number }>
	gaps: { day: string; from: number; to: number; duration: number }[]
	suggestions: string[]
}
