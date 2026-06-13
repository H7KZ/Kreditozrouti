import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import ExtractInSISAcademicScheduleService from '@scraper/Services/ExtractInSISAcademicScheduleService'
import ExtractInSISCatalogService from '@scraper/Services/ExtractInSISCatalogService'
import ExtractInSISCourseService from '@scraper/Services/ExtractInSISCourseService'
import ExtractInSISFacultyTimetableService from '@scraper/Services/ExtractInSISFacultyTimetableService'
import ExtractInSISStudyPlanService from '@scraper/Services/ExtractInSISStudyPlanService'

const fixturesRoot = path.join(__dirname, '../src/Tests/fixtures')

function html(dir: string, file: string): string {
    return readFileSync(path.join(fixturesRoot, dir, file), 'utf8')
}

function write(dir: string, file: string, data: unknown): void {
    const dest = path.join(fixturesRoot, dir, file)
    writeFileSync(dest, JSON.stringify(data, null, 4) + '\n', 'utf8')
    console.log('wrote', dest)
}

function htmlFiles(dir: string, pattern: RegExp): string[] {
    return readdirSync(path.join(fixturesRoot, dir)).filter(f => pattern.test(f))
}

// courses
for (const file of htmlFiles('courses', /^course-.+\.html$/)) {
    const result = ExtractInSISCourseService.extract(html('courses', file), '')
    write('courses', file.replace('.html', '.expected.json'), result)
}

// studyplans
if (htmlFiles('studyplans', /^studyplans\.html$/).length) {
    const navHtml = html('studyplans', 'studyplans.html')
    const result = {
        faculties: ExtractInSISStudyPlanService.extractFaculties(navHtml),
        navigationUrls: ExtractInSISStudyPlanService.extractNavigationUrls(navHtml),
        planUrls: ExtractInSISStudyPlanService.extractPlanUrls(navHtml)
    }
    write('studyplans', 'studyplans.expected.json', result)
}
for (const file of htmlFiles('studyplans', /^studyplan-.+\.html$/)) {
    const result = ExtractInSISStudyPlanService.extract(html('studyplans', file), '')
    write('studyplans', file.replace('.html', '.expected.json'), result)
}

// catalog
if (htmlFiles('courses/catalog', /^index\.html$/).length) {
    write('courses/catalog', 'index.expected.json', ExtractInSISCatalogService.extractSearchOptions(html('courses/catalog', 'index.html')))
}
if (htmlFiles('courses/catalog', /^courses\.html$/).length) {
    write('courses/catalog', 'courses.expected.json', ExtractInSISCatalogService.extractCourses(html('courses/catalog', 'courses.html')))
}

// academic-schedules
if (htmlFiles('academic-schedules', /^index\.html$/).length) {
    write('academic-schedules', 'index.expected.json', ExtractInSISAcademicScheduleService.extractFaculties(html('academic-schedules', 'index.html')))
}
for (const file of htmlFiles('academic-schedules', /^faculty-\d+\.html$/)) {
    const facultyId = parseInt(file.replace('faculty-', '').replace('.html', ''), 10)
    const periods = ExtractInSISAcademicScheduleService.extractPeriods(html('academic-schedules', file), facultyId)
    write('academic-schedules', file.replace('.html', '.expected.json'), { _facultyId: facultyId, periods })
}
for (const file of htmlFiles('academic-schedules', /^events-\d+\.html$/)) {
    write('academic-schedules', file.replace('.html', '.expected.json'), ExtractInSISAcademicScheduleService.extractEvents(html('academic-schedules', file)))
}

// faculty-timetables
if (htmlFiles('faculty-timetables', /^nav\.html$/).length) {
    write('faculty-timetables', 'nav.expected.json', ExtractInSISFacultyTimetableService.extractFaculties(html('faculty-timetables', 'nav.html')))
}
for (const file of htmlFiles('faculty-timetables', /^timetable-.+\.html$/)) {
    write(
        'faculty-timetables',
        file.replace('.html', '.expected.json'),
        ExtractInSISFacultyTimetableService.extractFacultyTimetable(html('faculty-timetables', file))
    )
}

console.log('done')
