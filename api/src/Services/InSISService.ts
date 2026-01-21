import { mysql } from '@api/clients'
import { CourseTable, CourseTimetableSlotTable, CourseTimetableUnitTable, StudyPlanCourseTable, StudyPlanTable } from '@api/Database/types'
import CoursesFilter from '@api/Interfaces/CoursesFilter'
import StudyPlansFilter from '@api/Interfaces/StudyPlansFilter'
import InSISSemester from '@scraper/Types/InSISSemester'
import { sql } from 'kysely'

/**
 * Service for retrieving and filtering InSIS data (Courses, Study Plans)
 * and generating associated facets for client search interfaces.
 */
export default class InSISService {
	/**
	 * Retrieves a paginated list of Courses matching the provided filters.
	 */
	static async getCourses(filters: CoursesFilter, limit = 20, offset = 0) {
		const query = this.getBaseQuery(filters).selectAll('c').groupBy('c.id').limit(limit).offset(offset)

		return await query.execute()
	}

	/**
	 * Aggregates all available facets for the Course catalog based on current filters.
	 * Executes multiple aggregation queries in parallel.
	 */
	static async getFacets(filters: CoursesFilter) {
		const [faculties, days, lecturersRaw, languagesRaw, levels, semesters, years, time_range] = await Promise.all([
			this.getFacultyFacet(filters),
			this.getDayFacet(filters),
			this.getLecturerFacet(filters),
			this.getLanguageFacet(filters),
			this.getLevelFacet(filters),
			this.getSemesterFacet(filters),
			this.getYearFacet(filters),
			this.getTimeRangeFacet(filters)
		])

		const lecturers = this.processPipeFacet(lecturersRaw, 50)
		const languages = this.processPipeFacet(languagesRaw)

		return {
			faculties,
			days,
			lecturers,
			languages,
			levels,
			semesters,
			years,
			time_range
		}
	}

	/**
	 * Retrieves a paginated list of Study Plans matching the provided filters.
	 */
	static async getStudyPlans(filters: StudyPlansFilter, limit = 20, offset = 0) {
		const query = this.getStudyPlanBaseQuery(filters).selectAll('sp').limit(limit).offset(offset).orderBy('sp.ident', 'asc')

		return await query.execute()
	}

	/**
	 * Aggregates all available facets for Study Plans.
	 */
	static async getStudyPlanFacets(filters: StudyPlansFilter) {
		const [faculties, levels, modes_of_studies, semesters, years, study_lengths] = await Promise.all([
			this.getPlanFacet(filters, 'faculty_id'),
			this.getPlanFacet(filters, 'level'),
			this.getPlanFacet(filters, 'mode_of_study'),
			this.getPlanFacet(filters, 'semester'),
			this.getPlanFacet(filters, 'year'),
			this.getPlanFacet(filters, 'study_length')
		])

		return {
			faculties,
			levels,
			modes_of_studies,
			semesters,
			years,
			study_lengths
		}
	}

	/**
	 * Helper to process pipe-delimited facet values (e.g., "Lecturer A | Lecturer B").
	 * Splits values, counts occurrences, and optionally limits the results.
	 */
	private static processPipeFacet(data: { value: string | null; count: number }[], limit?: number) {
		const map = new Map<string, number>()

		for (const row of data) {
			if (!row.value) continue

			const parts = row.value.split('|').filter(s => s.trim().length > 0)
			for (const part of parts) {
				const trimmed = part.trim()
				const currentCount = map.get(trimmed) ?? 0
				map.set(trimmed, currentCount + Number(row.count))
			}
		}

		const result = Array.from(map.entries())
			.map(([value, count]) => ({ value, count }))
			.sort((a, b) => b.count - a.count)

		return limit ? result.slice(0, limit) : result
	}

	private static async getFacultyFacet(filters: CoursesFilter) {
		return await this.getBaseQuery(filters, 'faculty')
			.select('c.faculty_id as value')
			.select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
			.where('c.faculty_id', 'is not', null)
			.groupBy('c.faculty_id')
			.orderBy('value')
			.execute()
	}

	private static async getDayFacet(filters: CoursesFilter) {
		return await this.getBaseQuery(filters, 'day')
			.select('s.day as value')
			.select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
			.where('s.day', 'is not', null)
			.groupBy('s.day')
			.orderBy('value')
			.execute()
	}

	private static async getLecturerFacet(filters: CoursesFilter) {
		return await this.getBaseQuery(filters, 'lecturer')
			.select(sql<string>`COALESCE(u.lecturer, c.lecturers)`.as('value'))
			.select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
			.where(sql`COALESCE(u.lecturer, c.lecturers)`, 'is not', null)
			.groupBy(sql`COALESCE(u.lecturer, c.lecturers)`)
			.orderBy('count', 'desc')
			.limit(50)
			.execute()
	}

	private static async getLanguageFacet(filters: CoursesFilter) {
		return await this.getBaseQuery(filters, 'language')
			.select('c.languages as value')
			.select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
			.where('c.languages', 'is not', null)
			.groupBy('c.languages')
			.orderBy('count', 'desc')
			.execute()
	}

	private static async getLevelFacet(filters: CoursesFilter) {
		return await this.getBaseQuery(filters, 'level')
			.select('c.level as value')
			.select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
			.where('c.level', 'is not', null)
			.groupBy('c.level')
			.orderBy('value')
			.execute()
	}

	private static async getSemesterFacet(filters: CoursesFilter) {
		return await this.getBaseQuery(filters, 'semester')
			.select('c.semester as value')
			.select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
			.where('c.semester', 'is not', null)
			.groupBy('c.semester')
			.orderBy('value', 'desc')
			.execute()
	}

	private static async getYearFacet(filters: CoursesFilter) {
		return await this.getBaseQuery(filters, 'year')
			.select('c.year as value')
			.select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
			.where('c.year', 'is not', null)
			.groupBy('c.year')
			.orderBy('value', 'desc')
			.execute()
	}

	private static async getTimeRangeFacet(filters: CoursesFilter) {
		const result = await this.getBaseQuery(filters, 'time_from')
			.select(eb => [eb.fn.min<number>('s.time_from_minutes').as('min_time'), eb.fn.max<number>('s.time_to_minutes').as('max_time')])
			.executeTakeFirst()

		return {
			min_time: result?.min_time ?? 0,
			max_time: result?.max_time ?? 1440
		}
	}

	/**
	 * Generic helper to fetch counts for Study Plan columns.
	 */
	private static async getPlanFacet(filters: StudyPlansFilter, column: keyof StudyPlansFilter & string) {
		return await this.getStudyPlanBaseQuery(filters, column)
			.select(`sp.${column} as value`)
			.select(eb => eb.fn.count<number>('sp.id').as('count'))
			.where(`sp.${column}`, 'is not', null)
			.groupBy(`sp.${column}`)
			.orderBy('count', 'desc')
			.execute()
	}

	/**
	 * Constructs the base Kysely query for Courses with all active filters applied.
	 */
	private static getBaseQuery(filters: CoursesFilter, ignore?: keyof CoursesFilter) {
		// Refactored to use static table names from Schema classes
		let query = mysql
			.selectFrom(`${CourseTable._table} as c`)
			.leftJoin(`${CourseTimetableUnitTable._table} as u`, 'c.id', 'u.course_id')
			.leftJoin(`${CourseTimetableSlotTable._table} as s`, 'u.id', 's.timetable_unit_id')

		const toArray = <T>(val: T | T[]) => (Array.isArray(val) ? val : [val])

		if (filters.study_plan_id && ignore !== 'study_plan_id') {
			query = query.innerJoin(`${StudyPlanCourseTable._table} as spc`, 'c.id', 'spc.course_id').where('spc.study_plan_id', '=', filters.study_plan_id)
		}

		if (filters.semester && ignore !== 'semester') {
			const vals = toArray(filters.semester)
			if (vals.length) query = query.where('c.semester', 'in', vals as InSISSemester[])
		}

		if (filters.year && ignore !== 'year') {
			const vals = toArray(filters.year)
			if (vals.length) query = query.where('c.year', 'in', vals)
		}

		if (filters.ident && ignore !== 'ident') {
			const vals = toArray(filters.ident)
			if (vals.length) {
				query = query.where(eb => eb.or(vals.map(v => eb('c.ident', 'like', `%${v}%`))))
			}
		}

		if (filters.faculty && ignore !== 'faculty') {
			const vals = toArray(filters.faculty)
			if (vals.length) {
				query = query.where('c.faculty_id', 'in', vals)
			}
		}

		if (filters.lecturer && ignore !== 'lecturer') {
			const vals = toArray(filters.lecturer)
			if (vals.length) {
				query = query.where(eb => eb.or(vals.flatMap(v => [eb('c.lecturers', 'like', `%${v}%`), eb('u.lecturer', 'like', `%${v}%`)])))
			}
		}

		if (filters.day && ignore !== 'day') {
			const vals = toArray(filters.day)
			if (vals.length) query = query.where('s.day', 'in', vals)
		}

		const ignoreTime = ignore === 'time_from' || ignore === 'time_to'
		if (filters.time_from && !ignoreTime) {
			query = query.where('s.time_from_minutes', '>=', filters.time_from)
		}
		if (filters.time_to && !ignoreTime) {
			query = query.where('s.time_to_minutes', '<=', filters.time_to)
		}

		if (filters.language && ignore !== 'language') {
			const vals = toArray(filters.language)
			if (vals.length) {
				query = query.where(eb => eb.or(vals.map(v => eb('c.languages', 'like', `%${v}%`))))
			}
		}

		if (filters.level && ignore !== 'level') {
			const vals = toArray(filters.level)
			if (vals.length) query = query.where('c.level', 'in', vals)
		}

		return query
	}

	/**
	 * Constructs the base Kysely query for Study Plans with all active filters applied.
	 */
	private static getStudyPlanBaseQuery(filters: StudyPlansFilter, ignore?: keyof StudyPlansFilter) {
		// Refactored to use static table names from Schema classes
		let query = mysql.selectFrom(`${StudyPlanTable._table} as sp`)

		const toArray = <T>(val: T | T[]) => (Array.isArray(val) ? val : [val])

		if (filters.ident && ignore !== 'ident') {
			const vals = toArray(filters.ident)
			if (vals.length) {
				query = query.where(eb => eb.or(vals.map(v => eb('sp.ident', 'like', `%${v}%`))))
			}
		}

		if (filters.faculty_id && ignore !== 'faculty_id') {
			const vals = toArray(filters.faculty_id)
			if (vals.length) {
				query = query.where('sp.faculty_id', 'in', vals)
			}
		}

		if (filters.semester && ignore !== 'semester') {
			const vals = toArray(filters.semester)
			if (vals.length) query = query.where('sp.semester', 'in', vals as InSISSemester[])
		}

		if (filters.year && ignore !== 'year') {
			const vals = toArray(filters.year)
			if (vals.length) query = query.where('sp.year', 'in', vals)
		}

		if (filters.level && ignore !== 'level') {
			const vals = toArray(filters.level)
			if (vals.length) query = query.where('sp.level', 'in', vals)
		}

		if (filters.mode_of_study && ignore !== 'mode_of_study') {
			const vals = toArray(filters.mode_of_study)
			if (vals.length) query = query.where('sp.mode_of_study', 'in', vals)
		}

		if (filters.study_length && ignore !== 'study_length') {
			const vals = toArray(filters.study_length)
			if (vals.length) query = query.where('sp.study_length', 'in', vals)
		}

		return query
	}

	/**
	 * Determines the upcoming semester period(s) to scrape based on current date.
	 * Only returns periods during the 1-2 month window before semester start.
	 *
	 * Schedule:
	 * - Jan/Feb: Scan for LS (Summer) of current academic year (year = previous calendar year)
	 * - Aug/Sep: Scan for ZS (Winter) of upcoming academic year (year = current calendar year)
	 */
	static getUpcomingPeriod(date: Date = new Date()): { semester: InSISSemester; year: number } | null {
		const month = date.getMonth() + 1 // 1-12
		const year = date.getFullYear()

		// Jan-Feb: Scan for upcoming Summer semester
		// LS 2024/2025 -> year is 2024 (the starting year of the academic year)
		if (month >= 1 && month <= 2) {
			return { semester: 'LS', year: year - 1 }
		}

		// Aug-Sep: Scan for upcoming Winter semester
		// ZS 2025/2026 -> year is 2025
		if (month >= 8 && month <= 9) {
			return { semester: 'ZS', year }
		}

		// Outside scanning windows - no scraping needed
		return null
	}

	/**
	 * Returns periods for the last N academic years, counting backwards from the upcoming period.
	 * Each academic year has ZS and LS semesters.
	 */
	static getPeriodsForLastYears(yearsBack = 4, date: Date = new Date()): { semester: InSISSemester; year: number }[] {
		const upcomingPeriod = this.getUpcomingPeriod(date)

		if (!upcomingPeriod) {
			return []
		}

		const periods: { semester: InSISSemester; year: number }[] = []
		let currentYear = upcomingPeriod.year
		let currentSemester = upcomingPeriod.semester

		// Generate 2 periods per year (ZS + LS) going backwards
		const totalPeriods = yearsBack * 2

		for (let i = 0; i < totalPeriods; i++) {
			periods.push({ semester: currentSemester, year: currentYear })

			// Move backwards: ZS -> LS (same year), LS -> ZS (previous year)
			if (currentSemester === 'ZS') {
				currentSemester = 'LS'
			} else {
				currentSemester = 'ZS'
				currentYear--
			}
		}

		return periods
	}
}
