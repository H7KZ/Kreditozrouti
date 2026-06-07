import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import ExtractInSISStudyPlanService from '@scraper/Services/ExtractInSISStudyPlanService'

const dir = path.join(import.meta.dirname, 'fixtures/studyplans')

function load(file: string): string {
    return readFileSync(path.join(dir, file), 'utf8')
}

function expected<T>(file: string): T {
    return JSON.parse(readFileSync(path.join(dir, file), 'utf8')) as T
}

function fileExists(file: string): boolean {
    try { readFileSync(path.join(dir, file)); return true } catch { return false }
}

describe('ExtractInSISStudyPlanService', () => {
    describe('extractFaculties + extractNavigationUrls + extractPlanUrls', () => {
        if (fileExists('studyplans.html')) {
            it('studyplans.html', () => {
                const html = load('studyplans.html')
                const exp = expected<{ faculties: unknown; navigationUrls: unknown; planUrls: unknown }>('studyplans.expected.json')
                expect(ExtractInSISStudyPlanService.extractFaculties(html)).toEqual(exp.faculties)
                expect(ExtractInSISStudyPlanService.extractNavigationUrls(html)).toEqual(exp.navigationUrls)
                expect(ExtractInSISStudyPlanService.extractPlanUrls(html)).toEqual(exp.planUrls)
            })
        } else {
            it('no fixtures yet', () => { /* skipped until HTML fixtures are added */ })
        }
    })

    describe('extract', () => {
        const fixtures = readdirSync(dir).filter(f => /^studyplan-.+\.html$/.test(f))

        if (fixtures.length === 0) {
            it('no fixtures yet', () => { /* skipped until HTML fixtures are added */ })
        } else {
            it.each(fixtures)('%s', (file) => {
                expect(ExtractInSISStudyPlanService.extract(load(file), ''))
                    .toEqual(expected(file.replace('.html', '.expected.json')))
            })
        }
    })

    describe('extractIdFromUrl', () => {
        it('returns the numeric plan ID from a valid URL', () => {
            expect(ExtractInSISStudyPlanService.extractIdFromUrl('https://insis.vse.cz/katalog/plany.pl?stud_plan=123'))
                .toBe(123)
        })

        it('returns null for a URL with no plan param', () => {
            expect(ExtractInSISStudyPlanService.extractIdFromUrl('https://insis.vse.cz/')).toBeNull()
        })
    })
})
