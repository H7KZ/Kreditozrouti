import path from 'node:path'
import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import ExtractInSISCatalogService from '@scraper/Services/ExtractInSISCatalogService'

const fixture = (name: string) => readFileSync(path.join(__dirname, '../__fixtures__', name), 'utf8')

describe('ExtractInSISCatalogService', () => {
    describe('extractSearchOptions', () => {
        it('extracts faculties', () => {
            const { faculties } = ExtractInSISCatalogService.extractSearchOptions(fixture('catalog-search.html'))

            expect(faculties).toHaveLength(2)
            expect(faculties[0].id).toBe(100)
            expect(faculties[0].identifier).toBe('fis')
            expect(faculties[0].name).toBe('fakulta informatiky a statistiky')
        })

        it('extracts periods with semester and year', () => {
            const { periods } = ExtractInSISCatalogService.extractSearchOptions(fixture('catalog-search.html'))

            expect(periods).toHaveLength(2)
            expect(periods[0].id).toBe(1001)
            expect(periods[0].yearId).toBe(500)
            expect(periods[0].semester).toBe('ZS')
            expect(periods[0].year).toBe(2024)
        })

        it('extracts LS period', () => {
            const { periods } = ExtractInSISCatalogService.extractSearchOptions(fixture('catalog-search.html'))

            expect(periods[1].id).toBe(1002)
            expect(periods[1].semester).toBe('LS')
        })
    })

    describe('extractCourses', () => {
        it('deduplicates courses by URL', () => {
            const courses = ExtractInSISCatalogService.extractCourses(fixture('catalog-courses.html'))

            expect(courses).toHaveLength(2)
        })

        it('extracts ident from anchor text', () => {
            const courses = ExtractInSISCatalogService.extractCourses(fixture('catalog-courses.html'))

            expect(courses[0].ident).toBe('4IZ210')
            expect(courses[1].ident).toBe('FVS111')
        })

        it('resolves relative URLs using catalogUrl', () => {
            const courses = ExtractInSISCatalogService.extractCourses(fixture('catalog-courses.html'))

            expect(courses[0].url).toMatch(/^https?:\/\//)
            expect(courses[0].url).toContain('predmet=12345')
        })

        it('keeps absolute URLs unchanged', () => {
            const courses = ExtractInSISCatalogService.extractCourses(fixture('catalog-courses.html'))

            expect(courses[1].url).toBe('https://insis.vse.cz/katalog/syllabus.pl?predmet=67890')
        })
    })
})
