import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import ExtractInSISCatalogService from '@scraper/Services/ExtractInSISCatalogService'

const dir = path.join(import.meta.dirname, 'fixtures/catalog')

function load(file: string): string {
    return readFileSync(path.join(dir, file), 'utf8')
}

function expected<T>(file: string): T {
    return JSON.parse(readFileSync(path.join(dir, file), 'utf8')) as T
}

function fileExists(file: string): boolean {
    try { readFileSync(path.join(dir, file)); return true } catch { return false }
}

describe('ExtractInSISCatalogService', () => {
    describe('extractSearchOptions', () => {
        if (fileExists('catalog-search.html')) {
            it('catalog-search.html', () => {
                expect(ExtractInSISCatalogService.extractSearchOptions(load('catalog-search.html')))
                    .toEqual(expected('catalog-search.expected.json'))
            })
        } else {
            it('no fixtures yet', () => { /* skipped until HTML fixtures are added */ })
        }
    })

    describe('extractCourses', () => {
        if (fileExists('catalog-courses.html')) {
            it('catalog-courses.html', () => {
                expect(ExtractInSISCatalogService.extractCourses(load('catalog-courses.html')))
                    .toEqual(expected('catalog-courses.expected.json'))
            })
        }

        it('returns empty array for empty result page', () => {
            expect(ExtractInSISCatalogService.extractCourses('<html><body></body></html>')).toEqual([])
        })
    })
})
