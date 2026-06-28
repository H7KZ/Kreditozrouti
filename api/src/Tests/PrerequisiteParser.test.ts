import { describe, expect, it } from 'vitest'
import { parsePrerequisites } from '@api/Services/PrerequisiteParser'

describe('parsePrerequisites', () => {
	it('returns all nulls for null inputs', () => {
		expect(parsePrerequisites(null, null)).toEqual({
			blocked_by_course_idents: null,
			excluded_after_course_idents: null,
			concurrent_exclusion_idents: null,
			recommended_before_course_idents: null
		})
	})

	it('returns all nulls when text has no course codes', () => {
		expect(parsePrerequisites('studovat po absolvování programu ekonomie', null)).toEqual({
			blocked_by_course_idents: null,
			excluded_after_course_idents: null,
			concurrent_exclusion_idents: null,
			recommended_before_course_idents: null
		})
	})

	it('extracts blocked_by from "studovat po absolvování"', () => {
		const result = parsePrerequisites('studovat po absolvování 4EK201', null)
		expect(result.blocked_by_course_idents).toEqual(['4EK201'])
		expect(result.excluded_after_course_idents).toBeNull()
		expect(result.concurrent_exclusion_idents).toBeNull()
	})

	it('extracts excluded_after from "nelze studovat po absolvování"', () => {
		const result = parsePrerequisites('nelze studovat po absolvování 4EK201 a 4EK202', null)
		expect(result.excluded_after_course_idents).toEqual(['4EK201', '4EK202'])
		expect(result.blocked_by_course_idents).toBeNull()
	})

	it('does not assign excluded_after codes to blocked_by (overlap guard)', () => {
		// "nelze studovat po absolvování" contains "studovat po absolvování" as substring.
		// The combined regex must not double-assign.
		const result = parsePrerequisites('nelze studovat po absolvování 4IT405', null)
		expect(result.excluded_after_course_idents).toEqual(['4IT405'])
		expect(result.blocked_by_course_idents).toBeNull()
	})

	it('handles diacritics variant "absolvovaní"', () => {
		const result = parsePrerequisites('studovat po absolvovaní 2MO422', null)
		expect(result.blocked_by_course_idents).toEqual(['2MO422'])
	})

	it('extracts concurrent from "nelze studovat současně s"', () => {
		const result = parsePrerequisites('nelze studovat současně s 2MO422', null)
		expect(result.concurrent_exclusion_idents).toEqual(['2MO422'])
		expect(result.blocked_by_course_idents).toBeNull()
	})

	it('handles "nelze studovat soucasne s" without diacritics', () => {
		const result = parsePrerequisites('nelze studovat soucasne s 3MI604', null)
		expect(result.concurrent_exclusion_idents).toEqual(['3MI604'])
	})

	it('handles multiple clauses in one text', () => {
		const text = 'studovat po absolvování 4EK201 a nelze studovat po absolvování 4EK300'
		const result = parsePrerequisites(text, null)
		expect(result.blocked_by_course_idents).toEqual(['4EK201'])
		expect(result.excluded_after_course_idents).toEqual(['4EK300'])
	})

	it('handles all three clause types in one text', () => {
		const text =
			'studovat po absolvování 4EK201 a nelze studovat po absolvování 4EK300 a nelze studovat současně s 4ST301'
		const result = parsePrerequisites(text, null)
		expect(result.blocked_by_course_idents).toEqual(['4EK201'])
		expect(result.excluded_after_course_idents).toEqual(['4EK300'])
		expect(result.concurrent_exclusion_idents).toEqual(['4ST301'])
	})

	it('deduplicates codes within a clause', () => {
		const result = parsePrerequisites('studovat po absolvování 4EK201 nebo 4EK201', null)
		expect(result.blocked_by_course_idents).toEqual(['4EK201'])
	})

	it('normalises space in code "2AJ 342" to "2AJ342"', () => {
		const result = parsePrerequisites('studovat po absolvování 2AJ 342', null)
		expect(result.blocked_by_course_idents).toEqual(['2AJ342'])
	})

	it('extracts recommended_before from recommended_programmes', () => {
		const result = parsePrerequisites(null, '4EK201 Makroekonomie I nebo 4EK202 Mikroekonomie I')
		expect(result.recommended_before_course_idents).toEqual(['4EK201', '4EK202'])
	})

	it('returns null recommended_before when programmes has no course codes', () => {
		const result = parsePrerequisites(null, 'Vhodné pro všechny studijní programy')
		expect(result.recommended_before_course_idents).toBeNull()
	})

	it('handles both prerequisites and recommended_programmes together', () => {
		const result = parsePrerequisites('studovat po absolvování 4EK201', '4EK202 Mikroekonomie')
		expect(result.blocked_by_course_idents).toEqual(['4EK201'])
		expect(result.recommended_before_course_idents).toEqual(['4EK202'])
	})
})
