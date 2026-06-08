import { readdirSync } from 'node:fs'
import path from 'node:path'
import type { HarmonogramPeriod } from '@scraper/Services/ExtractInSISAcademicScheduleService'
import { describe, expect, it } from 'vitest'
import ExtractInSISAcademicScheduleService, { parseDateDMY, parseDateTimeRange, parsePeriodLabel } from '@scraper/Services/ExtractInSISAcademicScheduleService'
import { makeFixtureLoaders } from './helpers'

const dir = path.join(import.meta.dirname, 'fixtures/academic-schedules')
const { load, expected, exists } = makeFixtureLoaders(dir)

describe('ExtractInSISAcademicScheduleService', () => {
    describe('extractFaculties', () => {
        if (exists('index.html')) {
            it('index.html', () => {
                const actual = ExtractInSISAcademicScheduleService.extractFaculties(load('index.html'))
                expect(actual).toEqual(expected('index.expected.json', actual))
            })
        } else {
            it('no fixtures yet', () => {
                /* skipped until HTML fixtures are added */
            })
        }
    })

    describe('extractPeriods', () => {
        const facultyIdentPattern = /^faculty-.+\.html$/
        const fixtures = readdirSync(dir).filter(f => facultyIdentPattern.test(f))

        if (fixtures.length === 0) {
            it('no fixtures yet', () => {
                /* skipped until HTML fixtures are added */
            })
        } else {
            it.each(fixtures)('%s', file => {
                // Faculty ident is encoded in the filename (faculty-{ident}.html) and stored in
                // the expected JSON under _facultyIdent. The numeric _facultyId must also be stored
                // in the expected JSON so it can be passed back to extractPeriods.
                const match = facultyIdentPattern.exec(file)
                const facultyIdent = match![1]
                const expFile = file.replace('.html', '.expected.json')
                const stub = { _facultyIdent: facultyIdent, _facultyId: 0, periods: [] as HarmonogramPeriod[] }
                const exp = expected(expFile, stub)
                const periods = ExtractInSISAcademicScheduleService.extractPeriods(load(file), exp._facultyId)
                expect(periods).toEqual(expected(expFile, { ...stub, periods }).periods)
            })
        }
    })

    describe('extractEvents', () => {
        const eventsPattern = /^events-.+\.html$/
        const fixtures = readdirSync(dir).filter(f => eventsPattern.test(f))

        if (fixtures.length === 0) {
            it('no fixtures yet', () => {
                /* skipped until HTML fixtures are added */
            })
        } else {
            it.each(fixtures)('%s', file => {
                const actual = ExtractInSISAcademicScheduleService.extractEvents(load(file))
                expect(actual).toEqual(expected(file.replace('.html', '.expected.json'), actual))
            })
        }
    })

    describe('parsePeriodLabel', () => {
        it('parses a label with faculty suffix', () => {
            const result = parsePeriodLabel('ZS 2025/2026 - FIS')
            expect(result).toMatchObject({ semester: 'ZS', facultyIdent: 'FIS' })
        })

        it('returns null for a label without faculty suffix separator', () => {
            // parsePeriodLabel requires at least two parts split by ' - '
            expect(parsePeriodLabel('LS 2024/2025')).toBeNull()
        })

        it('returns null for a malformed label', () => {
            expect(parsePeriodLabel('')).toBeNull()
        })
    })

    describe('parseDateDMY', () => {
        it('parses a valid DD.MM.YYYY string to an ISO date string', () => {
            expect(parseDateDMY('15.09.2025')).toBe('2025-09-15')
        })

        it('returns null for a malformed string', () => {
            expect(parseDateDMY('not-a-date')).toBeNull()
        })
    })

    describe('parseDateTimeRange', () => {
        it('extracts a single event range and returns an object with starts_at and ends_at', () => {
            const result = parseDateTimeRange('15. 9. 2025 08:00 - 10:00')
            expect(result).not.toBeNull()
            expect(result).toHaveProperty('starts_at')
            expect(result).toHaveProperty('ends_at')
        })

        it('returns null when no ranges match', () => {
            expect(parseDateTimeRange('')).toBeNull()
        })
    })
})
