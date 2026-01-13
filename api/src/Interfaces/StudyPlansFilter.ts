/**
 * Filter criteria for querying Study Plans.
 * Used for database queries and API request validation.
 */
export default interface StudyPlansFilter {
	/** Semester string (e.g., "ZS"). */
	semester?: string | string[]

	/** Academic year (e.g., 2025). */
	year?: number | number[]

	/** Program identifier (e.g., "P-AIN"). */
	ident?: string | string[]

	/** Academic level (e.g., "Bachelor", "Master"). */
	level?: string | string[]

	/** Faculty name or code. */
	faculty_id?: string | string[]

	/** Mode of study (e.g., "Prezenční", "Kombinovaná"). */
	mode_of_study?: string | string[]

	/** Standard length of study (e.g., "3", "2"). */
	study_length?: string | string[]
}
