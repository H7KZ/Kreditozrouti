/**
 * Interface representing a faculty in the InSIS system.
 */
export default interface ScraperInSISFaculty {
    /** Faculty ident ("FIS"). */
    ident: string | null

    /** Faculty name. */
    title: string | null
}
