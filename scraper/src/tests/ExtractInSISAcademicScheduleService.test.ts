import { readdirSync } from 'node:fs'
import path from 'node:path'
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
        const fixtures = readdirSync(dir).filter(f => /^faculty-\d+\.html$/.test(f))

        if (fixtures.length === 0) {
            it('no fixtures yet', () => {
                /* skipped until HTML fixtures are added */
            })
        } else {
            it.each(fixtures)('%s', file => {
                // Faculty ID is encoded in the filename (faculty-{id}.html) and stored in the
                // expected JSON under _facultyId so it can be passed back to extractPeriods.
                const match = /^faculty-(\d+)\.html$/.exec(file)
                const facultyId = parseInt(match![1], 10)
                const periods = ExtractInSISAcademicScheduleService.extractPeriods(load(file), facultyId)
                const exp = expected(file.replace('.html', '.expected.json'), { _facultyId: facultyId, periods })
                expect(periods).toEqual(exp.periods)
            })
        }
    })

    describe('extractEvents', () => {
        const fixtures = readdirSync(dir).filter(f => /^events-\d+\.html$/.test(f))

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
