export const InSISDayValues = ['Po', 'Út', 'St', 'Čt', 'Pá'] as const

/**
 * InSIS day representation.
 */
type InSISDay = (typeof InSISDayValues)[number]
export default InSISDay
