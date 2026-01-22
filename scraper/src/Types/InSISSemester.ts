export const InSISSemesterValues = ['LS', 'ZS'] as const

/**
 * InSISSemester represents the semester codes used in the InSIS system.
 */
type InSISSemester = (typeof InSISSemesterValues)[number]
export default InSISSemester
