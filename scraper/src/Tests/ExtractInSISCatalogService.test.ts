import path from 'node:path'
import { describe, expect, it } from 'vitest'
import ExtractInSISCatalogService from '@scraper/Services/ExtractInSISCatalogService'
import { makeFixtureLoaders } from './helpers'

const { load, expected, exists } = makeFixtureLoaders(path.join(import.meta.dirname, 'fixtures/courses/catalog'))

describe('ExtractInSISCatalogService', () => {
	describe('extractSearchOptions', () => {
		if (exists('index.html')) {
			it('index.html', () => {
				const actual = ExtractInSISCatalogService.extractSearchOptions(load('index.html'))
				expect(actual).toEqual(expected('index.expected.json', actual))
			})
		} else {
			it('no fixtures yet', () => {
				/* skipped until HTML fixtures are added */
			})
		}
	})

	describe('extractCourses', () => {
		if (exists('courses.html')) {
			it('courses.html', () => {
				const actual = ExtractInSISCatalogService.extractCourses(load('courses.html'))
				expect(actual).toEqual(expected('courses.expected.json', actual))
			})
		}

		it('returns empty array for empty result page', () => {
			expect(ExtractInSISCatalogService.extractCourses('<html><body></body></html>')).toEqual([])
		})
	})
})
