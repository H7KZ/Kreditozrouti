import { readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import ExtractInSISFacultyTimetableService from '@scraper/Services/ExtractInSISFacultyTimetableService'
import { makeFixtureLoaders } from './helpers'

const dir = path.join(import.meta.dirname, 'fixtures/faculty-timetables')
const { load, expected } = makeFixtureLoaders(dir)

describe('ExtractInSISFacultyTimetableService', () => {
    describe('extractFaculties', () => {
        it('nav.html', () => {
            expect(ExtractInSISFacultyTimetableService.extractFaculties(load('nav.html'))).toEqual(expected('nav.expected.json'))
        })

        it('returns empty array when no faculty table is found', () => {
            expect(ExtractInSISFacultyTimetableService.extractFaculties('<html><body></body></html>')).toEqual([])
        })
    })

    describe('extractFacultyTimetable', () => {
        const fixtures = readdirSync(dir).filter(f => /^timetable-.+\.html$/.test(f))

        it.each(fixtures)('%s', file => {
            expect(ExtractInSISFacultyTimetableService.extractFacultyTimetable(load(file))).toEqual(expected(file.replace('.html', '.expected.json')))
        })

        it('returns nulls when page has no schedule rows', () => {
            const result = ExtractInSISFacultyTimetableService.extractFacultyTimetable('<html><body></body></html>')
            expect(result.ident).toBeNull()
            expect(result.max_year).toBeNull()
        })
    })

    describe('isPubliclyVisible', () => {
        it('returns false for null max_year', () => {
            expect(ExtractInSISFacultyTimetableService.isPubliclyVisible(null)).toBe(false)
        })

        it('returns false when max_year is before current academic year', () => {
            expect(ExtractInSISFacultyTimetableService.isPubliclyVisible(2016, new Date('2026-06-01'))).toBe(false)
        })

        it('returns true when max_year equals current academic year', () => {
            expect(ExtractInSISFacultyTimetableService.isPubliclyVisible(2025, new Date('2026-06-01'))).toBe(true)
        })

        it('uses September as the start of a new academic year', () => {
            expect(ExtractInSISFacultyTimetableService.isPubliclyVisible(2025, new Date('2025-10-01'))).toBe(true)
        })

        it('in August academic year is still the previous calendar year', () => {
            expect(ExtractInSISFacultyTimetableService.isPubliclyVisible(2025, new Date('2025-08-01'))).toBe(true)
        })
    })
})
