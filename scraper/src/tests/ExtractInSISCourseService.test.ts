import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import ExtractInSISCourseService from '@scraper/Services/ExtractInSISCourseService'

const dir = path.join(import.meta.dirname, 'fixtures/courses')

function load(file: string): string {
    return readFileSync(path.join(dir, file), 'utf8')
}

function expected<T>(file: string): T {
    return JSON.parse(readFileSync(path.join(dir, file), 'utf8')) as T
}

describe('ExtractInSISCourseService', () => {
    describe('extract', () => {
        const fixtures = readdirSync(dir).filter(f => /^course-.+\.html$/.test(f))

        if (fixtures.length === 0) {
            it('no fixtures yet', () => { /* skipped until HTML fixtures are added */ })
        } else {
            it.each(fixtures)('%s', (file) => {
                expect(ExtractInSISCourseService.extract(load(file), ''))
                    .toEqual(expected(file.replace('.html', '.expected.json')))
            })
        }
    })

    describe('extractIdFromUrl', () => {
        it('returns the numeric predmet param value from a valid URL', () => {
            expect(ExtractInSISCourseService.extractIdFromUrl('https://insis.vse.cz/katalog/syllabus.pl?predmet=12345'))
                .toBe(12345)
        })

        it('returns null for a URL with no predmet param', () => {
            expect(ExtractInSISCourseService.extractIdFromUrl('https://insis.vse.cz/')).toBeNull()
        })

        it('returns null for null input', () => {
            expect(ExtractInSISCourseService.extractIdFromUrl(null as unknown as string)).toBeNull()
        })
    })

    describe('extractIdFromHtml', () => {
        it('returns the numeric value from a hidden predmet input', () => {
            const html = '<html><body><input type="hidden" name="predmet" value="12345"></body></html>'
            expect(ExtractInSISCourseService.extractIdFromHtml(html)).toBe(12345)
        })

        it('returns null when no predmet input exists', () => {
            expect(ExtractInSISCourseService.extractIdFromHtml('<html><body></body></html>')).toBeNull()
        })
    })
})
