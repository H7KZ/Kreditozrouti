import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import ExtractInSISCourseService from '@scraper/Services/ExtractInSISCourseService'

const fixture = (name: string) => readFileSync(path.join(__dirname, '../__fixtures__', name), 'utf8')
const COURSE_URL = 'https://insis.vse.cz/katalog/syllabus.pl?predmet=99999'

describe('ExtractInSISCourseService', () => {
    describe('extractIdFromUrl', () => {
        it('extracts id from predmet query param', () => {
            expect(ExtractInSISCourseService.extractIdFromUrl(COURSE_URL)).toBe(99999)
        })

        it('returns null for URLs without predmet param', () => {
            expect(ExtractInSISCourseService.extractIdFromUrl('https://insis.vse.cz/katalog/')).toBeNull()
        })
    })

    describe('extractIdFromHtml', () => {
        it('extracts id from hidden form input', () => {
            expect(ExtractInSISCourseService.extractIdFromHtml(fixture('course.html'))).toBe(99999)
        })
    })

    describe('extract', () => {
        it('returns correct id and ident', () => {
            const course = ExtractInSISCourseService.extract(fixture('course.html'), COURSE_URL)

            expect(course.id).toBe(99999)
            expect(course.ident).toBe('TST100')
        })

        it('extracts ECTS credits', () => {
            const course = ExtractInSISCourseService.extract(fixture('course.html'), COURSE_URL)

            expect(course.ects).toBe(5)
        })

        it('extracts semester and year', () => {
            const course = ExtractInSISCourseService.extract(fixture('course.html'), COURSE_URL)

            expect(course.semester).toBe('ZS')
            expect(course.year).toBe(2024)
        })

        it('extracts faculty ident from page title', () => {
            const course = ExtractInSISCourseService.extract(fixture('course.html'), COURSE_URL)

            expect(course.faculty?.ident).toBe('FIS')
            expect(course.faculty?.is_schedule_publicly_visible).toBe(true)
        })

        it('separates lecturers from guarantors', () => {
            const course = ExtractInSISCourseService.extract(fixture('course.html'), COURSE_URL)

            expect(course.lecturers).toContain('Jan Novák')
            expect(course.guarantors).toContain('Petr Svoboda')
        })

        it('extracts timetable slot', () => {
            const course = ExtractInSISCourseService.extract(fixture('course.html'), COURSE_URL)

            expect(course.timetable).toHaveLength(1)
            const slot = course.timetable![0].slots![0]
            expect(slot.day).toBe('Pondělí')
            expect(slot.time_from).toBe('8:00')
            expect(slot.time_to).toBe('9:30')
            expect(slot.location).toBe('RB 101')
            expect(slot.frequency).toBe('weekly')
        })

        it('extracts assessment methods', () => {
            const course = ExtractInSISCourseService.extract(fixture('course.html'), COURSE_URL)

            expect(course.assessment_methods).toHaveLength(1)
            expect(course.assessment_methods![0].weight).toBe(60)
        })

        it('extracts study plan references', () => {
            const course = ExtractInSISCourseService.extract(fixture('course.html'), COURSE_URL)

            expect(course.study_plans).toHaveLength(1)
            expect(course.study_plans![0].ident).toBe('B-AIN1')
            expect(course.study_plans![0].group).toBe('field_specific_bachelor')
            expect(course.study_plans![0].category).toBe('compulsory')
        })

        it('extracts audit info', () => {
            const course = ExtractInSISCourseService.extract(fixture('course.html'), COURSE_URL)

            expect(course.last_modified_date).toBe('2025-03-15')
            expect(course.last_modified_by).toBe('Jan Admin')
        })
    })
})
