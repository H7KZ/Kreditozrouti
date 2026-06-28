import { readdirSync } from 'node:fs'
import path from 'node:path'
import type { ScraperInSISCourse } from '@shared/queue/insis.js'
import { describe, expect, it } from 'vitest'
import { buildAssessmentRows, buildCoursePayload, buildSlotShape } from '@api/Jobs/ScraperResponseInSISCourseJob.js'
import { makeFixtureLoaders } from './helpers.js'

const fixturesDir = path.join(import.meta.dirname, '../../../fixtures/courses')
const { load, expected } = makeFixtureLoaders(fixturesDir)

const fixtures = readdirSync(fixturesDir).filter(f => /^course-.+\.scraper\.json$/.test(f))

describe('ScraperResponseInSISCourseJob — parsing', () => {
	it.each(fixtures)('%s', file => {
		const scraperOutput: ScraperInSISCourse = JSON.parse(load(file))
		const facultyId = scraperOutput.faculty?.ident ?? null
		const actual = {
			course: buildCoursePayload(scraperOutput, facultyId),
			assessments: buildAssessmentRows(scraperOutput.assessment_methods ?? []),
			timetable: (scraperOutput.timetable ?? []).map(unit => ({
				lecturer: unit.lecturer,
				capacity: unit.capacity,
				note: unit.note,
				slots: (unit.slots ?? []).map(buildSlotShape)
			}))
		}
		expect(actual).toEqual(expected(file.replace('.scraper.json', '.db.json'), actual))
	})
})
