import type { InSISSemester, InSISStudyPlanCourseCategory, InSISStudyPlanCourseGroup } from '@scraper/types/insis'

// Group Code Data

/**
 * InSIS Group Code Structure:
 *
 * First letter (lowercase) = Group scope:
 *   f* = faculty_specific (fakultně specifické skupiny)
 *   c* = university_wide (celoškolně používané skupiny)
 *   o* = field_specific_bachelor (oborově specifické skupiny - bakalářské)
 *   h* = field_specific_master (oborově specifické skupiny - magisterské)
 *   s* = minor_specialization (skupiny vedlejších specializací)
 *   e* = field_specific_master (extended/doctoral - fallback to master)
 *
 * Suffix (uppercase + numbers) = Category:
 *   *P = compulsory (povinné předměty)
 *   *V[*] = elective (volitelné předměty)
 *   *J[*] = language (jazykově povinně volitelné předměty)
 *   *SZ[*] = state_exam (státní zkoušky)
 *   *EXC = prohibited (zakázaný předmět)
 *   *VOR = beyond_scope (předměty nad rámec studijního plánu)
 *   *ZEXCN* = exchange_program (předměty pro výměnné programy)
 *   *TVS[*] = physical_education (tělesná výchova a sport)
 */
export const GroupPrefixes: Record<string, InSISStudyPlanCourseGroup> = {
	f: 'faculty_specific',
	c: 'university_wide',
	o: 'field_specific_bachelor',
	h: 'field_specific_master',
	s: 'minor_specialization',
	e: 'field_specific_master' // Extended/doctoral programs - fallback to master
}

/**
 * Category detection rules - order matters (most specific first)
 */
export const CategoryRules: {
	test: (suffix: string) => boolean
	category: InSISStudyPlanCourseCategory
}[] = [
	// *TVS[*] - Tělesná výchova a sport
	{ test: suffix => suffix.includes('TVS'), category: 'physical_education' },

	// *SZ[*] - Státní zkoušky
	{ test: suffix => suffix.includes('SZ'), category: 'state_exam' },

	// *ZEXCN* - Předměty pro výměnné programy (must check before EXC)
	{ test: suffix => suffix.includes('ZEXCN'), category: 'exchange_program' },

	// *EXC - Zakázaný předmět
	{ test: suffix => suffix.includes('EXC'), category: 'prohibited' },

	// *VOR - Předměty nad rámec studijního plánu
	{ test: suffix => suffix.includes('VOR'), category: 'beyond_scope' },

	// *J[*] - Jazykově povinně volitelné předměty
	// Pattern: suffix starts with J (e.g., J1, J2, JV)
	{ test: suffix => /^J\d?/.test(suffix) || suffix === 'JV', category: 'language' },

	// *P - Povinné předměty (strictly ends with P, but not part of other patterns)
	// Must check after TVS, VOR to avoid false matches
	{ test: suffix => suffix === 'P' || suffix === 'BP', category: 'compulsory' },

	// *V[*] - Volitelné předměty (contains V but not VOR, TVS, JV)
	{ test: suffix => /V\d?$/.test(suffix) || ['VB', 'VM', 'VOL'].some(v => suffix.includes(v)), category: 'elective' }
]

// Group Code Parsing

/**
 * Parses an InSIS group code into group scope and category.
 *
 * @param groupCode - The group code (e.g., "oP", "cVB", "fJ1", "hSZ")
 * @returns Object with parsed group and category
 *
 * @example
 * parseGroupCode("oP")    // { group: 'field_specific_bachelor', category: 'compulsory' }
 * parseGroupCode("cVB")   // { group: 'university_wide', category: 'elective' }
 * parseGroupCode("fJ1")   // { group: 'faculty_specific', category: 'language' }
 * parseGroupCode("cTVS1") // { group: 'university_wide', category: 'physical_education' }
 * parseGroupCode("hSZ")   // { group: 'field_specific_master', category: 'state_exam' }
 * parseGroupCode("sP")    // { group: 'minor_specialization', category: 'compulsory' }
 * parseGroupCode("cVM")   // { group: 'university_wide', category: 'elective' }
 * parseGroupCode("oV")    // { group: 'field_specific_bachelor', category: 'elective' }
 * parseGroupCode("hV")    // { group: 'field_specific_master', category: 'elective' }
 * parseGroupCode("sV")    // { group: 'minor_specialization', category: 'elective' }
 * parseGroupCode("eV")    // { group: 'field_specific_master', category: 'elective' }
 */
export function parseGroupCode(groupCode: string): { group: InSISStudyPlanCourseGroup; category: InSISStudyPlanCourseCategory } {
	const group = determineGroup(groupCode)
	const category = determineCategory(groupCode)
	return { group, category }
}

/**
 * Determines the group scope from the first character of the group code.
 */
export function determineGroup(groupCode: string): InSISStudyPlanCourseGroup {
	if (!groupCode || groupCode.length === 0) return 'university_wide' // Default fallback

	const firstChar = groupCode[0].toLowerCase()
	return GroupPrefixes[firstChar] ?? 'university_wide'
}

/**
 * Determines the category from the suffix of the group code.
 */
export function determineCategory(groupCode: string): InSISStudyPlanCourseCategory {
	if (!groupCode || groupCode.length < 2) return 'elective' // Default fallback

	// Extract suffix (everything after the first lowercase letter)
	const suffix = groupCode.slice(1).toUpperCase()

	for (const rule of CategoryRules) {
		if (rule.test(suffix)) return rule.category
	}

	// Default to elective if no match
	return 'elective'
}

// Semester & Year Extraction

export function extractSemester(value: string | null): InSISSemester | null {
	if (!value) return null

	value = value.toUpperCase()

	if (value.startsWith('ZS ') || value.includes(' ZS ') || value.endsWith(' ZS')) return 'ZS'

	if (value.startsWith('LS ') || value.includes(' LS ') || value.endsWith(' LS')) return 'LS'

	return null
}

export function extractYear(value: string | null): number | null {
	if (!value) return null

	const yearMatch = /(\d{4}\/\d{4})/.exec(value)

	return yearMatch ? yearMatch[1].split('/').map(y => parseInt(y, 10))[0] : null
}
