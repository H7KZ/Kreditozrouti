import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import ExtractInSISFacultyTimetableService from '@scraper/Services/ExtractInSISFacultyTimetableService'

const fixture = (name: string) => readFileSync(path.join(__dirname, '../__fixtures__', name), 'utf8')

describe('ExtractInSISFacultyTimetableService', () => {
    describe('extractFaculties', () => {
        it('extracts faculty list skipping the all-faculties row', () => {
            const result = ExtractInSISFacultyTimetableService.extractFaculties(fixture('faculty-timetables-nav.html'))
            expect(result).toHaveLength(2)
            expect(result[0]).toEqual({ f_id: 96, name: 'Centrum tělesné výchovy a sportu' })
            expect(result[1]).toEqual({ f_id: 40, name: 'Fakulta informatiky a statistiky' })
        })

        it('returns empty array when no faculty table is found', () => {
            const result = ExtractInSISFacultyTimetableService.extractFaculties('<html><body></body></html>')
            expect(result).toHaveLength(0)
        })
    })

    describe('extractFacultyTimetable', () => {
        it('extracts CTVS ident and max_year=2016 from old-schedule page', () => {
            const result = ExtractInSISFacultyTimetableService.extractFacultyTimetable(fixture('faculty-timetable-ctvs.html'))
            expect(result.ident).toBe('CTVS')
            expect(result.max_year).toBe(2016)
        })

        it('extracts FIS ident and max_year=2025 from recent-schedule page', () => {
            const result = ExtractInSISFacultyTimetableService.extractFacultyTimetable(fixture('faculty-timetable-fis.html'))
            expect(result.ident).toBe('FIS')
            expect(result.max_year).toBe(2025)
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
            // June 2026: getMonth()=5, academic year = 2025. 2016 < 2025 → false
            const date = new Date('2026-06-01')
            expect(ExtractInSISFacultyTimetableService.isPubliclyVisible(2016, date)).toBe(false)
        })

        it('returns true when max_year equals current academic year', () => {
            // June 2026: getMonth()=5, academic year = 2025. 2025 >= 2025 → true
            const date = new Date('2026-06-01')
            expect(ExtractInSISFacultyTimetableService.isPubliclyVisible(2025, date)).toBe(true)
        })

        it('uses September (getMonth=8) as the start of a new academic year', () => {
            // October 2025: getMonth()=9, academic year = 2025. 2025 >= 2025 → true
            const date = new Date('2025-10-01')
            expect(ExtractInSISFacultyTimetableService.isPubliclyVisible(2025, date)).toBe(true)
        })

        it('in August academic year is still the previous calendar year', () => {
            // August 2025: getMonth()=7, academic year = 2024. 2025 >= 2024 → true
            const date = new Date('2025-08-01')
            expect(ExtractInSISFacultyTimetableService.isPubliclyVisible(2025, date)).toBe(true)
        })
    })
})
