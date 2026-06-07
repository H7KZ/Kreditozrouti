import { readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import ExtractInSISStudyPlanService from '@scraper/Services/ExtractInSISStudyPlanService'
import { makeFixtureLoaders } from './helpers'

const dir = path.join(import.meta.dirname, 'fixtures/studyplans')
const { load, expected, exists } = makeFixtureLoaders(dir)

describe('ExtractInSISStudyPlanService', () => {
    describe('extractFaculties + extractNavigationUrls + extractPlanUrls', () => {
        if (exists('studyplans.html')) {
            it('studyplans.html', () => {
                const html = load('studyplans.html')
                const faculties = ExtractInSISStudyPlanService.extractFaculties(html)
                const navigationUrls = ExtractInSISStudyPlanService.extractNavigationUrls(html)
                const planUrls = ExtractInSISStudyPlanService.extractPlanUrls(html)
                const exp = expected('studyplans.expected.json', { faculties, navigationUrls, planUrls })
                expect(faculties).toEqual(exp.faculties)
                expect(navigationUrls).toEqual(exp.navigationUrls)
                expect(planUrls).toEqual(exp.planUrls)
            })
        } else {
            it('no fixtures yet', () => {
                /* skipped until HTML fixtures are added */
            })
        }
    })

    describe('extract', () => {
        const fixtures = readdirSync(dir).filter(f => /^studyplan-.+\.html$/.test(f))

        if (fixtures.length === 0) {
            it('no fixtures yet', () => {
                /* skipped until HTML fixtures are added */
            })
        } else {
            it.each(fixtures)('%s', file => {
                const actual = ExtractInSISStudyPlanService.extract(load(file), '')
                expect(actual).toEqual(expected(file.replace('.html', '.expected.json'), actual))
            })
        }
    })

    describe('extractIdFromUrl', () => {
        it('returns the numeric plan ID from a valid URL', () => {
            expect(ExtractInSISStudyPlanService.extractIdFromUrl('https://insis.vse.cz/katalog/plany.pl?stud_plan=123')).toBe(123)
        })

        it('returns null for a URL with no plan param', () => {
            expect(ExtractInSISStudyPlanService.extractIdFromUrl('https://insis.vse.cz/')).toBeNull()
        })
    })
})
