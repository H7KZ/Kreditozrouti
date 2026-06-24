import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import ExtractInSISCourseService from '@scraper/Services/ExtractInSISCourseService'
import { makeFixtureLoaders } from './helpers'

const dir = path.join(import.meta.dirname, 'fixtures/courses')
const { load, expected } = makeFixtureLoaders(dir)

describe('ExtractInSISCourseService', () => {
	describe('extract', () => {
		const fixtures = readdirSync(dir).filter(f => /^course-.+\.html$/.test(f) && !f.endsWith('-en.html'))

		if (fixtures.length === 0) {
			it('no fixtures yet', () => {
				/* skipped until HTML fixtures are added */
			})
		} else {
			it.each(fixtures)('%s', file => {
				const actual = ExtractInSISCourseService.extract(load(file), '')
				expect(actual).toEqual(expected(file.replace('.html', '.expected.json'), actual))
			})
		}
	})

	describe('extractIdFromUrl', () => {
		it('returns the numeric predmet param value from a valid URL', () => {
			expect(ExtractInSISCourseService.extractIdFromUrl('https://insis.vse.cz/katalog/syllabus.pl?predmet=12345')).toBe(12345)
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

	describe('isNotFound', () => {
		it('returns true for InSIS not-found error page fixture', () => {
			const html = load('not-found.html')
			expect(ExtractInSISCourseService.isNotFound(html)).toBe(true)
		})

		it('returns false for normal course page', () => {
			expect(ExtractInSISCourseService.isNotFound('<html><body>Kód předmětu: 4IT123</body></html>')).toBe(false)
		})
	})

	describe('extractEnglishFields', () => {
		it('extracts EN syllabus fields from 4SA260 English fixture', () => {
			const html = readFileSync(path.join(dir, 'course-4SA260-en.html'), 'utf-8')
			const result = ExtractInSISCourseService.extractEnglishFields(html)

			expect(result.aims_of_the_course_en).not.toBeNull()
			expect(result.learning_outcomes_en).not.toBeNull()
			expect(result.course_contents_en).not.toBeNull()
			expect(result.prerequisites_en).not.toBeNull()
			expect(result.literature_required_en).not.toBeNull()
			expect(result.literature_recommended_en).not.toBeNull()
		})

		it('returns all nulls for empty HTML', () => {
			const result = ExtractInSISCourseService.extractEnglishFields('<html><body></body></html>')

			expect(result.aims_of_the_course_en).toBeNull()
			expect(result.learning_outcomes_en).toBeNull()
			expect(result.course_contents_en).toBeNull()
			expect(result.special_requirements_en).toBeNull()
			expect(result.literature_required_en).toBeNull()
			expect(result.literature_recommended_en).toBeNull()
			expect(result.prerequisites_en).toBeNull()
			expect(result.recommended_programmes_en).toBeNull()
			expect(result.required_work_experience_en).toBeNull()
		})

		it('treats entire reading section as required when no Recommended: split found', () => {
			const html = `<html><body>
				<table><tbody>
					<tr><td><b><span class="nowrap">Reading: </span></b></td></tr>
					<tr><td><table><tbody>
						<tr><td><b>Basic:</b></td></tr>
						<tr><td>Some required book</td></tr>
					</tbody></table></td></tr>
				</tbody></table>
			</body></html>`
			const result = ExtractInSISCourseService.extractEnglishFields(html)

			expect(result.literature_required_en).not.toBeNull()
			expect(result.literature_recommended_en).toBeNull()
		})
	})
})
