import path from 'node:path'
import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import ExtractInSISStudyPlanService from '@scraper/Services/ExtractInSISStudyPlanService'

const fixture = (name: string) => readFileSync(path.join(__dirname, '../__fixtures__', name), 'utf8')
const PLAN_URL = 'https://insis.vse.cz/studijni/plan.pl?stud_plan=555'

describe('ExtractInSISStudyPlanService', () => {
    describe('extractIdFromUrl', () => {
        it('extracts id from stud_plan query param', () => {
            expect(ExtractInSISStudyPlanService.extractIdFromUrl('?stud_plan=555')).toBe(555)
        })

        it('returns null when param is absent', () => {
            expect(ExtractInSISStudyPlanService.extractIdFromUrl('?nav=1')).toBeNull()
        })
    })

    describe('extractFaculties', () => {
        it('extracts faculty links', () => {
            const faculties = ExtractInSISStudyPlanService.extractFaculties(fixture('study-plans.html'))

            expect(faculties).toHaveLength(2)
            expect(faculties[0].title).toBe('Fakulta informatiky a statistiky')
        })
    })

    describe('extractNavigationUrls', () => {
        it('returns only non-plan navigation links', () => {
            const navs = ExtractInSISStudyPlanService.extractNavigationUrls(fixture('study-plans.html'))

            expect(navs).toHaveLength(1)
            expect(navs[0].url).not.toContain('stud_plan=')
        })
    })

    describe('extractPlanUrls', () => {
        it('returns only plan URLs', () => {
            const urls = ExtractInSISStudyPlanService.extractPlanUrls(fixture('study-plans.html'))

            expect(urls).toHaveLength(2)
            expect(urls.every(u => u.includes('stud_plan='))).toBe(true)
        })
    })

    describe('extract', () => {
        it('extracts id from URL', () => {
            const plan = ExtractInSISStudyPlanService.extract(fixture('study-plan.html'), PLAN_URL)

            expect(plan.id).toBe(555)
        })

        it('extracts ident', () => {
            const plan = ExtractInSISStudyPlanService.extract(fixture('study-plan.html'), PLAN_URL)

            expect(plan.ident).toBe('B-AIN1')
        })

        it('extracts faculty ident from period row', () => {
            const plan = ExtractInSISStudyPlanService.extract(fixture('study-plan.html'), PLAN_URL)

            expect(plan.faculty?.ident).toBe('FIS')
        })

        it('extracts semester and year', () => {
            const plan = ExtractInSISStudyPlanService.extract(fixture('study-plan.html'), PLAN_URL)

            expect(plan.semester).toBe('ZS')
            expect(plan.year).toBe(2023)
        })

        it('extracts courses with group and category', () => {
            const plan = ExtractInSISStudyPlanService.extract(fixture('study-plan.html'), PLAN_URL)

            expect(plan.courses).toHaveLength(2)
            expect(plan.courses![0].ident).toBe('TST100')
            expect(plan.courses![0].group).toBe('field_specific_bachelor')
            expect(plan.courses![0].category).toBe('compulsory')
        })

        it('extracts elective course category', () => {
            const plan = ExtractInSISStudyPlanService.extract(fixture('study-plan.html'), PLAN_URL)

            expect(plan.courses![1].ident).toBe('OPT200')
            expect(plan.courses![1].category).toBe('elective')
        })
    })
})
