export const InSISDayValues = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek'] as const

/**
 * InSIS day representation.
 */
type InSISDay = (typeof InSISDayValues)[number]
export default InSISDay
