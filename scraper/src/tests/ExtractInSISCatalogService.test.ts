import path from 'node:path'
import { describe, expect, it } from 'vitest'
import ExtractInSISCatalogService from '@scraper/Services/ExtractInSISCatalogService'
import { makeFixtureLoaders } from './helpers'

const { load, expected, exists } = makeFixtureLoaders(path.join(import.meta.dirname, 'fixtures/catalog'))

describe('ExtractInSISCatalogService', () => {
    describe('extractSearchOptions', () => {
        if (exists('catalog-search.html')) {
            it('catalog-search.html', () => {
                const actual = ExtractInSISCatalogService.extractSearchOptions(load('catalog-search.html'))
                expect(actual).toEqual(expected('catalog-search.expected.json', actual))
            })
        } else {
            it('no fixtures yet', () => {
                /* skipped until HTML fixtures are added */
            })
        }
    })

    describe('extractCourses', () => {
        if (exists('catalog-courses.html')) {
            it('catalog-courses.html', () => {
                const actual = ExtractInSISCatalogService.extractCourses(load('catalog-courses.html'))
                expect(actual).toEqual(expected('catalog-courses.expected.json', actual))
            })
        }

        it('returns empty array for empty result page', () => {
            expect(ExtractInSISCatalogService.extractCourses('<html><body></body></html>')).toEqual([])
        })
    })
})
