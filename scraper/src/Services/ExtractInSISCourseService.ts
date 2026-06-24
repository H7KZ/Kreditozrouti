import type {
	InSISDay,
	InSISSemester,
	ScraperInSISCourse,
	ScraperInSISCourseAssessmentMethod,
	ScraperInSISCourseStudyLoad,
	ScraperInSISCourseStudyPlan,
	ScraperInSISCourseTimetableSlot,
	ScraperInSISCourseTimetableUnit,
	ScraperInSISFaculty
} from '@scraper/types/insis'
import type { CheerioAPI } from 'cheerio'
import * as cheerio from 'cheerio'
import MarkdownService from '@scraper/Services/MarkdownService'
import { cleanText, getRowValueCaseInsensitive, getSectionContent, parseMultiLineCell, sanitizeBodyHtml, serializeValue } from '@scraper/Utils/HTMLUtils'
import { extractSemester, extractYear, parseGroupCode } from '@scraper/Utils/InSISUtils'

export interface ScraperInSISCourseEnFields {
	aims_of_the_course_en: string | null
	learning_outcomes_en: string | null
	course_contents_en: string | null
	special_requirements_en: string | null
	literature_required_en: string | null
	literature_recommended_en: string | null
	prerequisites_en: string | null
	recommended_programmes_en: string | null
	required_work_experience_en: string | null
}

/**
 * Extracts course data from InSIS syllabus pages.
 * Handles metadata, syllabus content, assessments, and timetable parsing.
 */
export default class ExtractInSISCourseService {
	/**
	 * Extracts course ID from a syllabus URL.
	 */
	static extractIdFromUrl(url: string): number | null {
		const match = /[?&;]predmet=(\d+)/.exec(url)
		return match ? parseInt(match[1], 10) : null
	}

	/**
	 * Extracts course ID from HTML form input.
	 */
	static extractIdFromHtml(html: string): number | null {
		const $ = cheerio.load(html)
		const idInput = $('input[name="predmet"]').attr('value')
		return idInput ? parseInt(idInput, 10) : null
	}

	/**
	 * Returns true when InSIS reports that the course does not exist
	 * or its syllabus is not publicly accessible.
	 */
	static isNotFound(html: string): boolean {
		return html.includes('neexistuje nebo jeho sylabus není veřejně přístupný')
	}

	/**
	 * Main extraction method - parses complete course data from syllabus page.
	 */
	static extract(html: string, url: string): ScraperInSISCourse {
		const $ = cheerio.load(html)
		sanitizeBodyHtml($)

		const id = this.resolveId($, url)
		const basicInfo = this.extractBasicInfo($)
		const semesterInfo = this.extractSemesterAndYear($)
		const faculty = this.extractFaculty($, semesterInfo.year)
		const levelInfo = this.extractLevelAndYear($)
		const people = this.extractPeople($)
		const syllabus = this.extractSyllabusContent($)
		const assessmentMethods = this.extractAssessmentMethods($)
		const timetable = faculty.is_schedule_publicly_visible ? this.extractTimetable($) : []
		const plans = this.extractStudyPlans($)
		const studyLoad = this.extractStudyLoad($)
		const auditInfo = this.extractAuditInfo($)

		return {
			id,
			url,
			url_id: this.extractIdFromUrl(url),
			...basicInfo,
			...semesterInfo,
			faculty,
			...levelInfo,
			lecturers: people.lecturers,
			guarantors: people.guarantors,
			...syllabus,
			assessment_methods: assessmentMethods.length > 0 ? assessmentMethods : null,
			timetable,
			study_plans: plans,
			study_load: studyLoad.length > 0 ? studyLoad : null,
			last_modified_date: auditInfo.last_modified_date,
			last_modified_by: auditInfo.last_modified_by,
			aims_of_the_course_en: null,
			learning_outcomes_en: null,
			course_contents_en: null,
			special_requirements_en: null,
			literature_required_en: null,
			literature_recommended_en: null,
			prerequisites_en: null,
			recommended_programmes_en: null,
			required_work_experience_en: null,
			content_hash_cs: null,
			content_hash_en: null
		}
	}

	private static resolveId($: CheerioAPI, url: string): number {
		const idInput = $('input[name="predmet"]').attr('value')
		if (idInput) return parseInt(idInput, 10)

		const urlId = this.extractIdFromUrl(url)
		if (urlId !== null) return urlId

		throw new Error('Course ID not found in the HTML content or URL.')
	}

	private static extractBasicInfo($: CheerioAPI) {
		const ident = getRowValueCaseInsensitive($, 'Kód předmětu:')
		const title_cs = getRowValueCaseInsensitive($, 'Název česky:')
		const title_en = getRowValueCaseInsensitive($, 'Název anglicky:')
		const title = getRowValueCaseInsensitive($, 'Název v jazyce výuky:')

		const ectsRaw = getRowValueCaseInsensitive($, 'Počet přidělených ECTS kreditů:')
		const ectsParsed = ectsRaw ? parseInt(ectsRaw.split(' ')[0], 10) : NaN
		const ects = isNaN(ectsParsed) ? null : ectsParsed

		const mode_of_delivery = getRowValueCaseInsensitive($, 'Forma výuky kurzu:')?.trim().toLowerCase() ?? null
		const mode_of_completion = getRowValueCaseInsensitive($, 'Forma ukončení kurzu:')?.trim().toLowerCase() ?? null

		const languagesRaw = getRowValueCaseInsensitive($, 'Jazyk výuky:')?.trim().toLowerCase() ?? null
		const languages = languagesRaw
			? languagesRaw
					.split(', ')
					.map(l => serializeValue(l.trim()))
					.filter((l): l is string => l !== null)
			: null

		return { ident, title, title_cs, title_en, ects, mode_of_delivery, mode_of_completion, languages }
	}

	private static extractSemesterAndYear($: CheerioAPI): { semester: InSISSemester | null; year: number | null } {
		const periodValue = getRowValueCaseInsensitive($, 'Semestr:')
		if (!periodValue) return { semester: null, year: null }

		return {
			semester: extractSemester(periodValue),
			year: extractYear(periodValue)
		}
	}

	private static extractFaculty($: CheerioAPI, year: number | null): ScraperInSISFaculty {
		const headerText = $('#titulek h1').text() || ''
		// Match last parentheses content
		const bracketMatch = /\(([^)]+)\)\s*$/.exec(headerText)

		if (!bracketMatch) return { ident: null, title: null, is_schedule_publicly_visible: true }

		const facultyIdent = bracketMatch[1].trim().split(' - ')[0]

		if (!facultyIdent) return { ident: null, title: null, is_schedule_publicly_visible: true }

		let is_schedule_publicly_visible = true
		if (year !== null && facultyIdent) {
			if (facultyIdent === 'CTVS' && year >= 2017) is_schedule_publicly_visible = false // PE
			if (facultyIdent === 'OZS' && year >= 2020) is_schedule_publicly_visible = false
			if (facultyIdent === 'IOM' && year >= 2021) is_schedule_publicly_visible = false
			if (facultyIdent === 'CESP' && year >= 2022) is_schedule_publicly_visible = false
		}

		return { ident: facultyIdent, title: null, is_schedule_publicly_visible }
	}

	private static extractLevelAndYear($: CheerioAPI) {
		const levelYearRaw = getRowValueCaseInsensitive($, 'Doporučený typ a ročník studia:')?.trim().toLowerCase() ?? null
		let level: string | null = null
		let year_of_study: number | null = null

		const isUndefined = !levelYearRaw || levelYearRaw.includes('obsah této položky nebyl definován')

		if (!isUndefined && levelYearRaw) {
			const firstPart = levelYearRaw.split(';')[0].trim()
			const parts = firstPart.split(':')

			if (parts.length > 0) level = serializeValue(parts[0].replace(/\(.*?\)/g, '').trim())

			if (parts.length > 1) {
				const yearMatch = /\d+/.exec(parts[1])
				if (yearMatch) year_of_study = parseInt(yearMatch[0], 10)
			}
		} else {
			// Fallback: infer from page header
			const headerText = $('#titulek h1').text() || ''
			const typeMatch = /-\s*(mba|kurzy|kurz)\s*\)/i.exec(headerText)

			if (typeMatch) {
				const typeRaw = typeMatch[1].toLowerCase()
				if (typeRaw === 'mba') level = 'MBA'
				else if (typeRaw.includes('kurz')) level = 'kurz'
			}
		}

		return { level, year_of_study }
	}

	private static extractPeople($: CheerioAPI): { lecturers: string[] | null; guarantors: string[] | null } {
		const lecturers: string[] = []
		const guarantors: string[] = []
		const lecturersCell = $('td')
			.filter((_, el) => cleanText($(el).text()).includes('Vyučující:'))
			.next('td')

		if (lecturersCell.length) {
			// Try extracting from anchor tags first, splitting guarantors from lecturers
			lecturersCell.find('a').each((_, el) => {
				const name = cleanText($(el).text())
				if (!name) return
				const sibling = (el as { nextSibling: { nodeValue?: string | null } | null }).nextSibling
				const nextText = sibling?.nodeValue ?? ''
				if (nextText.includes('(garant)')) {
					guarantors.push(name)
				} else {
					lecturers.push(name)
				}
			})

			// Fallback to parsing multi-line cell
			if (lecturers.length === 0 && guarantors.length === 0) {
				const cell = lecturersCell.get(0)
				if (cell) lecturers.push(...parseMultiLineCell($, cell))
			}
		}

		return {
			lecturers: lecturers.length > 0 ? lecturers : null,
			guarantors: guarantors.length > 0 ? guarantors : null
		}
	}

	private static extractSyllabusContent($: CheerioAPI) {
		const prerequisites = getRowValueCaseInsensitive($, 'Omezení pro zápis:')
		const recommended_programmes = getRowValueCaseInsensitive($, 'Doporučené doplňky kurzu:')
		const required_work_experience = getRowValueCaseInsensitive($, 'Vyžadovaná praxe:')
		const aims_of_the_course = getSectionContent($, 'Zaměření předmětu:')
		const learning_outcomes = getSectionContent($, 'Výsledky učení:')
		const course_contents = getSectionContent($, 'Obsah předmětu:')
		const special_requirements =
			getSectionContent($, 'Zvláštní podmínky a podrobnosti:') ?? getRowValueCaseInsensitive($, 'Zvláštní podmínky a podrobnosti:')

		// Literature extraction — split into required and recommended
		let literature_required: string | null = null
		let literature_recommended: string | null = null
		const literatureHeaderRow = $('td')
			.filter((_, el) => cleanText($(el).text()).includes('Literatura:'))
			.parent('tr')

		if (literatureHeaderRow.length && literatureHeaderRow.next('tr').length) {
			const literatureCell = literatureHeaderRow.next('tr').find('td')
			const rawHtml = literatureCell.html() ?? ''

			// Split on "Doporučená:" label (case-insensitive)
			const splitIndex = rawHtml.search(/Doporu[cč]en[aá]:/i)
			if (splitIndex !== -1) {
				const requiredHtml = rawHtml.slice(0, splitIndex)
				const recommendedHtml = rawHtml.slice(splitIndex)

				// Strip leading "Základní:" label from required section
				const requiredStripped = requiredHtml.replace(/Z[aá]kladn[ií]:/i, '').trim()

				const $req = cheerio.load(`<td>${requiredStripped}</td>`)
				const $rec = cheerio.load(`<td>${recommendedHtml}</td>`)

				const reqMd = MarkdownService.formatCheerioElementToMarkdown($req('td'))
				const recMd = MarkdownService.formatCheerioElementToMarkdown($rec('td'))

				literature_required = reqMd && reqMd.trim().length > 0 ? reqMd : null
				literature_recommended = recMd && recMd.trim().length > 0 ? recMd : null
			} else {
				// No split found — treat the whole thing as required
				const fullMd = MarkdownService.formatCheerioElementToMarkdown(literatureCell)
				literature_required = fullMd && fullMd.trim().length > 0 ? fullMd : null
			}
		}

		return {
			prerequisites,
			recommended_programmes,
			required_work_experience,
			aims_of_the_course,
			learning_outcomes,
			course_contents,
			special_requirements,
			literature_required,
			literature_recommended
		}
	}

	static extractEnglishFields(html: string): ScraperInSISCourseEnFields {
		const $ = cheerio.load(html)
		sanitizeBodyHtml($)

		const prerequisites_en = getRowValueCaseInsensitive($, 'Prerequisites and co-requisites:')
		const recommended_programmes_en = getRowValueCaseInsensitive($, 'Recommended optional programme components:')
		const required_work_experience_en = getRowValueCaseInsensitive($, 'Work placement:')
		const aims_of_the_course_en = getSectionContent($, 'Aims of the course:')
		const learning_outcomes_en = getSectionContent($, 'Learning outcomes and competences:')
		const course_contents_en = getSectionContent($, 'Course contents:')
		const special_requirements_en =
			getSectionContent($, 'Special requirements and details:') ?? getRowValueCaseInsensitive($, 'Special requirements and details:')

		let literature_required_en: string | null = null
		let literature_recommended_en: string | null = null
		const literatureHeaderRow = $('td')
			.filter((_, el) => cleanText($(el).text()).includes('Reading:'))
			.parent('tr')

		if (literatureHeaderRow.length && literatureHeaderRow.next('tr').length) {
			const literatureCell = literatureHeaderRow.next('tr').find('td')
			const rawHtml = literatureCell.html() ?? ''

			const splitIndex = rawHtml.search(/Recommended:/i)
			if (splitIndex !== -1) {
				const requiredHtml = rawHtml.slice(0, splitIndex)
				const recommendedHtml = rawHtml.slice(splitIndex)

				const requiredStripped = requiredHtml.replace(/Basic:/i, '').trim()

				const $req = cheerio.load(requiredStripped)
				const $rec = cheerio.load(recommendedHtml)

				const reqMd = MarkdownService.formatCheerioElementToMarkdown($req('body'))
				const recMd = MarkdownService.formatCheerioElementToMarkdown($rec('body'))

				literature_required_en = reqMd && reqMd.trim().length > 0 ? reqMd : null
				literature_recommended_en = recMd && recMd.trim().length > 0 ? recMd : null
			} else {
				const fullMd = MarkdownService.formatCheerioElementToMarkdown(literatureCell)
				literature_required_en = fullMd && fullMd.trim().length > 0 ? fullMd : null
			}
		}

		return {
			aims_of_the_course_en,
			learning_outcomes_en,
			course_contents_en,
			special_requirements_en,
			literature_required_en,
			literature_recommended_en,
			prerequisites_en,
			recommended_programmes_en,
			required_work_experience_en
		}
	}

	private static extractAssessmentMethods($: CheerioAPI): ScraperInSISCourseAssessmentMethod[] {
		const methods: ScraperInSISCourseAssessmentMethod[] = []

		const headerRow = $('td')
			.filter((_, el) => cleanText($(el).text()).includes('Způsoby a kritéria hodnocení'))
			.parent('tr')

		if (!headerRow.length) return methods

		const table = headerRow.next('tr').find('table')
		table.find('tbody tr').each((_, row) => {
			const cols = $(row).find('td')
			if (cols.length < 2) return

			const method = cleanText($(cols[0]).text()) || cleanText($(cols[1]).text())
			const valText = cleanText($(cols).last().text())

			if (method && valText && !method.toLowerCase().includes('celkem')) {
				const weightMatch = /(\d+)/.exec(valText)
				methods.push({
					method: serializeValue(method),
					weight: weightMatch ? parseInt(weightMatch[1], 10) : null
				})
			}
		})

		return methods
	}

	private static extractTimetable($: CheerioAPI): ScraperInSISCourseTimetableUnit[] {
		const units = new Set<ScraperInSISCourseTimetableUnit>()

		const header = $('td, b, strong')
			.filter((_, el) => cleanText($(el).text()).includes('Periodické rozvrhové akce'))
			.last()

		if (!header.length) return []

		const table = header.closest('tr').next('tr').find('table')

		table.find('tbody tr').each((_, row) => {
			const cols = $(row).find('td')
			if (cols.length < 7) return

			const unit = this.processTimetableRow($, cols as any)

			if (unit) units.add(unit)
		})

		return Array.from(units)
	}

	private static processTimetableRow($: CheerioAPI, cols: cheerio.Cheerio<Element>): ScraperInSISCourseTimetableUnit | null {
		const colElements = cols.toArray()

		const dayOrDates = parseMultiLineCell($, colElements[0])
		const times = parseMultiLineCell($, colElements[1])
		const locations = parseMultiLineCell($, colElements[2])
		const types = parseMultiLineCell($, colElements[3])
		const frequencies = parseMultiLineCell($, colElements[4])
		const lecturer = cleanText($(colElements[5] as any).text())
		const capacityInt = parseInt(cleanText($(colElements[6] as any).text()), 10) || 0
		const noteText = colElements.length > 8 ? cleanText($(colElements[8] as any).text()) : ''

		if (dayOrDates.length === 0) return null

		const maxRows = Math.max(dayOrDates.length, times.length, locations.length)

		const slots = new Set<ScraperInSISCourseTimetableSlot>()

		for (let i = 0; i < maxRows; i++) {
			const currentDayOrDate = dayOrDates[i] ?? dayOrDates[0] ?? ''
			const currentTime = times[i] ?? times[0] ?? ''
			const currentLocation = locations[i] ?? locations[0] ?? ''
			const currentType = types[i] ?? types[0] ?? ''
			const currentFreq = frequencies[i] ?? frequencies[0] ?? ''

			const slot = this.createTimetableSlot(currentDayOrDate, currentTime, currentLocation, currentType, currentFreq)
			slots.add(slot)
		}

		return {
			lecturer: serializeValue(lecturer),
			capacity: capacityInt,
			note: serializeValue(noteText === '-' ? null : noteText),
			slots: Array.from(slots)
		}
	}

	private static createTimetableSlot(dayOrDate: string, time: string, location: string, type: string, frequency: string): ScraperInSISCourseTimetableSlot {
		const [time_from, time_to] = time.includes('-') ? time.split('-').map(t => t.trim()) : ['', '']
		const isDate = /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(dayOrDate)

		let freq: 'weekly' | 'single' | null = null
		if (frequency.toLowerCase().includes('každý')) freq = 'weekly'
		else if (frequency.toLowerCase().includes('jednoráz') || isDate) freq = 'single'

		return {
			type: serializeValue(type),
			frequency: isDate ? 'single' : freq,
			date: isDate ? serializeValue(dayOrDate) : null,
			day: !isDate ? (serializeValue(dayOrDate) as InSISDay) : null,
			time_from: serializeValue(time_from),
			time_to: serializeValue(time_to),
			location: serializeValue(location)
		}
	}

	private static extractAuditInfo($: CheerioAPI): { last_modified_by: string | null; last_modified_date: string | null } {
		const bodyText = $('body').text().replace(/\s+/g, ' ')
		const match = /Poslední změnu provedla? (.*?)(?: dne | )(\d{1,2}\. \d{1,2}\. \d{4})/.exec(bodyText)

		if (!match) return { last_modified_by: null, last_modified_date: null }

		const last_modified_by = serializeValue(match[1].trim())
		const dateParts = match[2].replace(/\s/g, '').split('.')
		const last_modified_date = dateParts.length === 3 ? `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}` : null

		return { last_modified_by, last_modified_date }
	}

	private static extractStudyLoad($: CheerioAPI): ScraperInSISCourseStudyLoad[] {
		const result: ScraperInSISCourseStudyLoad[] = []

		const headerRow = $('td')
			.filter((_, el) => {
				const text = cleanText($(el).text())
				return text.includes('Způsob studia') || text.includes('studijní zátěž') || text.includes('Studijní zátěž')
			})
			.parent('tr')

		if (!headerRow.length) return result

		const table = headerRow.next('tr').find('table')
		if (!table.length) return result

		table.find('tbody tr, tr').each((_, row) => {
			const cols = $(row).find('td')
			if (cols.length < 2) return

			const activity = cleanText($(cols[0]).text())
			const valText = cleanText($(cols[1]).text())

			if (!activity || activity.toLowerCase().includes('celkem')) return

			const hoursMatch = /(\d+)/.exec(valText)
			if (hoursMatch) {
				result.push({
					activity: serializeValue(activity)!,
					hours: parseInt(hoursMatch[1], 10)
				})
			}
		})

		return result
	}

	/**
	 * Extracts study plan references from the course detail tables.
	 * Parses the "Fakulta | Kód programu | Forma | Skupina | Období" tables.
	 */
	private static extractStudyPlans($: CheerioAPI): ScraperInSISCourseStudyPlan[] {
		const plans: Set<ScraperInSISCourseStudyPlan> = new Set<ScraperInSISCourseStudyPlan>()

		const tables = $('table.detailni_ramecek').filter((_, el) => {
			const text = $(el).find('th').text()
			return text.includes('Kód programu') && text.includes('Skupina') && text.includes('Období')
		})

		tables.each((_, table) => {
			let lastFaculty: string | null = null

			$(table)
				.find('tbody tr')
				.each((_, row) => {
					const cells = $(row).find('td')
					if (cells.length < 4) return

					let codeIndex = 0
					let formIndex = 1
					let groupIndex = 2
					let periodIndex = 3

					if (cells.length === 5) {
						codeIndex = 1
						formIndex = 2
						groupIndex = 3
						periodIndex = 4
						lastFaculty = cleanText($(cells[0]).text())
					}

					const planIdent = cleanText($(cells[codeIndex]).text())
					const modeOfStudy = cleanText($(cells[formIndex]).text()) // e.g. "prezenční"
					const groupCode = cleanText($(cells[groupIndex]).text()) // e.g. "cVM", "hP"
					const periodRaw = $(cells[periodIndex]).html() // Contains <br>

					if (!planIdent || !periodRaw) return

					// Parse group code into Study Plan Category and Group
					// Use the logic from ExtractInSISStudyPlanService
					const { group, category } = parseGroupCode(groupCode)

					// Split periods by <br> to create distinct plan entries per semester
					const periods = periodRaw
						.split('<br>')
						.map(p => cleanText(cheerio.load(p).text()))
						.filter(p => p)

					for (const semester of periods) {
						if (!semester) continue

						const plan: ScraperInSISCourseStudyPlan = {
							ident: serializeValue(planIdent),
							facultyIdent: serializeValue(lastFaculty),
							semester: extractSemester(serializeValue(semester)),
							year: extractYear(serializeValue(semester)),
							mode_of_study: serializeValue(modeOfStudy),
							group: group,
							category: category
						}

						plans.add(plan)
					}
				})
		})

		return Array.from(plans)
	}
}
