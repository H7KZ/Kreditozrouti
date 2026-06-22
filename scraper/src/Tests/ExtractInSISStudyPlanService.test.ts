import { readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import ExtractInSISStudyPlanService from '@scraper/Services/ExtractInSISStudyPlanService'
import { makeFixtureLoaders } from './helpers'

const navDir = path.join(import.meta.dirname, 'fixtures/studyplans/navigation')
const planDir = path.join(import.meta.dirname, 'fixtures/studyplans')
const nav = makeFixtureLoaders(navDir)
const plan = makeFixtureLoaders(planDir)

describe('ExtractInSISStudyPlanService', () => {
	describe('extractFaculties', () => {
		if (nav.exists('index.html')) {
			it('index.html', () => {
				const actual = ExtractInSISStudyPlanService.extractFaculties(nav.load('index.html'))
				expect(actual).toEqual(nav.expected('index.expected.json', actual))
			})
		} else {
			it('no fixtures yet', () => {
				/* skipped until index.html fixture is added to fixtures/studyplans/navigation/ */
			})
		}
	})

	describe('extractNavigationUrls + extractPlanUrls', () => {
		const fixtures = readdirSync(navDir).filter(f => /^nav-.+\.html$/.test(f))

		if (fixtures.length === 0) {
			it('no fixtures yet', () => {
				/* skipped until nav-*.html fixtures are added to fixtures/studyplans/navigation/ */
			})
		} else {
			it.each(fixtures)('%s', file => {
				const html = nav.load(file)
				const navigationUrls = ExtractInSISStudyPlanService.extractNavigationUrls(html)
				const planUrls = ExtractInSISStudyPlanService.extractPlanUrls(html)
				const exp = nav.expected(file.replace('.html', '.expected.json'), { navigationUrls, planUrls })
				expect(navigationUrls).toEqual(exp.navigationUrls)
				expect(planUrls).toEqual(exp.planUrls)
			})
		}
	})

	describe('extract', () => {
		const fixtures = readdirSync(planDir).filter(f => /^studyplan-.+\.html$/.test(f))

		if (fixtures.length === 0) {
			it('no fixtures yet', () => {
				/* skipped until studyplan-*.html fixtures are added to fixtures/studyplans/ */
			})
		} else {
			it.each(fixtures)('%s', file => {
				const actual = ExtractInSISStudyPlanService.extract(plan.load(file), '')
				expect(actual).toEqual(plan.expected(file.replace('.html', '.expected.json'), actual))
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
