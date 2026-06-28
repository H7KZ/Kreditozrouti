import type { InSISSemester, InSISStudyPlanCourseCategory, InSISStudyPlanCourseGroup } from '../domain/insis.js'

export const GroupPrefixes: Record<string, InSISStudyPlanCourseGroup> = {
	f: 'faculty_specific',
	c: 'university_wide',
	o: 'field_specific_bachelor',
	h: 'field_specific_master',
	s: 'minor_specialization',
	e: 'field_specific_master'
}

export const CategoryRules: {
	test: (suffix: string) => boolean
	category: InSISStudyPlanCourseCategory
}[] = [
	{ test: suffix => suffix.includes('TVS'), category: 'physical_education' },
	{ test: suffix => suffix.includes('SZ'), category: 'state_exam' },
	{ test: suffix => suffix.includes('ZEXCN'), category: 'exchange_program' },
	{ test: suffix => suffix.includes('EXC'), category: 'prohibited' },
	{ test: suffix => suffix.includes('VOR'), category: 'beyond_scope' },
	{ test: suffix => /^J\d?/.test(suffix) || suffix === 'JV', category: 'language' },
	{ test: suffix => suffix === 'P' || suffix === 'BP', category: 'compulsory' },
	{ test: suffix => /V\d?$/.test(suffix) || ['VB', 'VM', 'VOL'].some(v => suffix.includes(v)), category: 'elective' }
]

export function determineGroup(groupCode: string): InSISStudyPlanCourseGroup {
	if (!groupCode || groupCode.length === 0) return 'university_wide'
	const firstChar = groupCode[0].toLowerCase()
	return GroupPrefixes[firstChar] ?? 'university_wide'
}

export function determineCategory(groupCode: string): InSISStudyPlanCourseCategory {
	if (!groupCode || groupCode.length < 2) return 'elective'
	const suffix = groupCode.slice(1).toUpperCase()
	for (const rule of CategoryRules) {
		if (rule.test(suffix)) return rule.category
	}
	return 'elective'
}

export function parseGroupCode(groupCode: string): { group: InSISStudyPlanCourseGroup; category: InSISStudyPlanCourseCategory } {
	return { group: determineGroup(groupCode), category: determineCategory(groupCode) }
}

export function extractSemester(value: string | null): InSISSemester | null {
	if (!value) return null
	const v = value.toUpperCase()
	if (v.startsWith('ZS ') || v.includes(' ZS ') || v.endsWith(' ZS')) return 'ZS'
	if (v.startsWith('LS ') || v.includes(' LS ') || v.endsWith(' LS')) return 'LS'
	return null
}

export function extractYear(value: string | null): number | null {
	if (!value) return null
	const yearMatch = /(\d{4}\/\d{4})/.exec(value)
	return yearMatch ? parseInt(yearMatch[1].split('/')[0], 10) : null
}
