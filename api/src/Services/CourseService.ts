import { mysql } from '@api/clients'
import {
	CourseAssessmentMethodTable,
	CourseTable,
	CourseTimetableSlotTable,
	CourseTimetableUnitTable,
	CourseTimetableUnitWithSlots,
	CourseWithRelations,
	Faculty,
	FacultyTable,
	StudyPlanCourseTable
} from '@api/Database/types'
import FacetItem from '@api/Interfaces/FacetItem'
import { CoursesFilter } from '@api/Validations/CoursesFilterValidation'
import { sql } from 'kysely'

/**
 * Service handling all Course-related database operations.
 * Responsible for fetching course details, joining related entities (timetable, faculty),
 * and calculating aggregated facets for search filters.
 */
export default class CourseService {
	/**
	 * Retrieves a paginated list of courses with deep relations.
	 *
	 * Implementation:
	 * 1. Counts total records matching filters.
	 * 2. Fetches paginated IDs.
	 * 3. Fetches full course records for those IDs.
	 * 4. Parallely fetches related data (timetable, assessments, faculty) to avoid N+1 queries.
	 * 5. Maps relations back to the course objects in memory.
	 */
	static async getCoursesWithRelations(filters: Partial<CoursesFilter>, limit = 20, offset = 0): Promise<{ courses: CourseWithRelations[]; total: number }> {
		// Get total count first
		const countQuery = this.buildCourseQuery(filters)
			.select(eb => eb.fn.countAll<number>().as('total'))
			.groupBy('c.id')

		const countResult = await mysql
			.selectFrom(countQuery.as('counted'))
			.select(eb => eb.fn.count<number>('total').as('total'))
			.executeTakeFirst()

		const total = countResult?.total ?? 0

		// Get paginated course IDs
		const courseIdsQuery = this.buildCourseQuery(filters)
			.select('c.id')
			.groupBy('c.id')
			.orderBy(this.getSortColumn(filters.sort_by) as any, filters.sort_dir ?? 'asc')
			.limit(limit)
			.offset(offset)

		const courseIdRows = await courseIdsQuery.execute()
		const courseIds = courseIdRows.map(r => r.id)

		if (courseIds.length === 0) {
			return { courses: [], total }
		}

		// Fetch full course data
		const courses = await mysql
			.selectFrom(`${CourseTable._table} as c`)
			.selectAll('c')
			.where('c.id', 'in', courseIds)
			.orderBy(this.getSortColumn(filters.sort_by) as any, filters.sort_dir ?? 'asc')
			.execute()

		// Fetch related data in parallel
		const [faculties, timetableUnits, timetableSlots, assessmentMethods, studyPlanInfo] = await Promise.all([
			this.getFacultiesForCourses(courseIds),
			this.getTimetableUnitsForCourses(courseIds),
			this.getTimetableSlotsForCourses(courseIds),
			this.getAssessmentMethodsForCourses(courseIds),
			filters.study_plan_id ? this.getStudyPlanInfoForCourses(courseIds, filters.study_plan_id) : Promise.resolve([])
		])

		// Build faculty map
		const facultyMap = new Map<string, Partial<Faculty>>()
		for (const f of faculties) {
			facultyMap.set(f.id, { id: f.id, title: f.title })
		}

		// Build timetable units map with slots
		const unitsMap = new Map<number, CourseTimetableUnitWithSlots[]>()
		for (const unit of timetableUnits) {
			if (!unitsMap.has(unit.course_id)) {
				unitsMap.set(unit.course_id, [])
			}
			const unitWithSlots: CourseTimetableUnitWithSlots = {
				...unit,
				slots: timetableSlots.filter(s => s.timetable_unit_id === unit.id)
			}
			unitsMap.get(unit.course_id)!.push(unitWithSlots)
		}

		// Build assessment methods map
		const assessmentMap = new Map<number, typeof assessmentMethods>()
		for (const am of assessmentMethods) {
			if (!assessmentMap.has(am.course_id)) {
				assessmentMap.set(am.course_id, [])
			}
			assessmentMap.get(am.course_id)!.push(am)
		}

		// Build study plan info map
		const studyPlanMap = new Map<number, typeof studyPlanInfo>()
		for (const sp of studyPlanInfo) {
			if (!studyPlanMap.has(sp.course_id!)) {
				studyPlanMap.set(sp.course_id!, [])
			}
			studyPlanMap.get(sp.course_id!)!.push(sp)
		}

		// Assemble final response
		const coursesWithRelations: CourseWithRelations[] = courses.map(course => ({
			...course,
			faculty: course.faculty_id ? (facultyMap.get(course.faculty_id) ?? null) : null,
			timetable_units: unitsMap.get(course.id) ?? [],
			assessment_methods: assessmentMap.get(course.id) ?? [],
			study_plan_info: studyPlanMap.get(course.id)?.map(sp => ({
				study_plan_id: sp.study_plan_id,
				group: sp.group,
				category: sp.category
			}))
		}))

		return { courses: coursesWithRelations, total }
	}

	/**
	 * Aggregates all search facets (filters) for the course catalog in parallel.
	 * Returns counts for faculties, days, lecturers, etc.
	 */
	static async getCourseFacets(filters: CoursesFilter) {
		const [faculties, days, lecturersRaw, languagesRaw, levels, semesters, years, groups, categories, ects, modesOfCompletion, timeRange] =
			await Promise.all([
				this.getFacultyFacet(filters),
				this.getDayFacet(filters),
				this.getLecturerFacet(filters),
				this.getLanguageFacet(filters),
				this.getLevelFacet(filters),
				this.getSemesterFacet(filters),
				this.getYearFacet(filters),
				this.getGroupFacet(filters),
				this.getCategoryFacet(filters),
				this.getEctsFacet(filters),
				this.getModeOfCompletionFacet(filters),
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
			groups,
			categories,
			ects,
			modes_of_completion: modesOfCompletion,
			time_range: timeRange
		}
	}

	private static async getFacultyFacet(filters: CoursesFilter): Promise<FacetItem[]> {
		return this.buildCourseQuery(filters, 'faculty_id')
			.select('c.faculty_id as value')
			.select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
			.where('c.faculty_id', 'is not', null)
			.groupBy('c.faculty_id')
			.orderBy('value')
			.execute()
	}

	private static async getDayFacet(filters: CoursesFilter): Promise<FacetItem[]> {
		return this.buildCourseQuery(filters, 'day')
			.select('s.day as value')
			.select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
			.where('s.day', 'is not', null)
			.groupBy('s.day')
			.orderBy('value')
			.execute()
	}

	private static async getLecturerFacet(filters: CoursesFilter) {
		return this.buildCourseQuery(filters, 'lecturer')
			.select(sql<string>`COALESCE(u.lecturer, c.lecturers)`.as('value'))
			.select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
			.where(sql`COALESCE(u.lecturer, c.lecturers)`, 'is not', null)
			.groupBy(sql`COALESCE(u.lecturer, c.lecturers)`)
			.orderBy('count', 'desc')
			.limit(50)
			.execute()
	}

	private static async getLanguageFacet(filters: CoursesFilter) {
		return this.buildCourseQuery(filters, 'language')
			.select('c.languages as value')
			.select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
			.where('c.languages', 'is not', null)
			.groupBy('c.languages')
			.orderBy('count', 'desc')
			.execute()
	}

	private static async getLevelFacet(filters: CoursesFilter): Promise<FacetItem[]> {
		return this.buildCourseQuery(filters, 'level')
			.select('c.level as value')
			.select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
			.where('c.level', 'is not', null)
			.groupBy('c.level')
			.orderBy('value')
			.execute()
	}

	private static async getSemesterFacet(filters: CoursesFilter): Promise<FacetItem[]> {
		return this.buildCourseQuery(filters, 'semester')
			.select('c.semester as value')
			.select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
			.where('c.semester', 'is not', null)
			.groupBy('c.semester')
			.orderBy('value', 'desc')
			.execute()
	}

	private static async getYearFacet(filters: CoursesFilter): Promise<FacetItem[]> {
		return this.buildCourseQuery(filters, 'year')
			.select('c.year as value')
			.select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
			.where('c.year', 'is not', null)
			.groupBy('c.year')
			.orderBy('value', 'desc')
			.execute()
	}

	private static async getGroupFacet(filters: CoursesFilter): Promise<FacetItem[]> {
		if (!filters.study_plan_id) return []
		return this.buildCourseQuery(filters, 'group')
			.select('spc.group as value')
			.select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
			.where('spc.group', 'is not', null)
			.groupBy('spc.group')
			.orderBy('value')
			.execute()
	}

	private static async getCategoryFacet(filters: CoursesFilter): Promise<FacetItem[]> {
		if (!filters.study_plan_id) return []
		return this.buildCourseQuery(filters, 'category')
			.select('spc.category as value')
			.select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
			.where('spc.category', 'is not', null)
			.groupBy('spc.category')
			.orderBy('value')
			.execute()
	}

	private static async getEctsFacet(filters: CoursesFilter): Promise<FacetItem[]> {
		return this.buildCourseQuery(filters, 'ects')
			.select('c.ects as value')
			.select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
			.where('c.ects', 'is not', null)
			.groupBy('c.ects')
			.orderBy('value')
			.execute()
	}

	private static async getModeOfCompletionFacet(filters: CoursesFilter): Promise<FacetItem[]> {
		return this.buildCourseQuery(filters, 'mode_of_completion')
			.select('c.mode_of_completion as value')
			.select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
			.where('c.mode_of_completion', 'is not', null)
			.groupBy('c.mode_of_completion')
			.orderBy('count', 'desc')
			.execute()
	}

	private static async getTimeRangeFacet(filters: CoursesFilter) {
		const result = await this.buildCourseQuery(filters, 'time_from')
			.select(eb => [eb.fn.min<number>('s.time_from_minutes').as('min_time'), eb.fn.max<number>('s.time_to_minutes').as('max_time')])
			.executeTakeFirst()

		return {
			min_time: result?.min_time ?? 0,
			max_time: result?.max_time ?? 1440
		}
	}

	/**
	 * Constructs the central Kysely query builder for filtering courses.
	 * Joins timetable units, slots, and study plan courses as needed.
	 *
	 * @param filters - The set of filters to apply.
	 * @param ignoreFacet - Prevents a specific filter field from filtering itself (used for facet counts).
	 */
	private static buildCourseQuery(filters: Partial<CoursesFilter>, ignoreFacet?: keyof CoursesFilter) {
		const toArray = <T>(val: T | T[] | undefined): T[] => (val === undefined ? [] : Array.isArray(val) ? val : [val])

		let query = mysql
			.selectFrom(`${CourseTable._table} as c`)
			.leftJoin(`${CourseTimetableUnitTable._table} as u`, 'c.id', 'u.course_id')
			.leftJoin(`${CourseTimetableSlotTable._table} as s`, 'u.id', 's.timetable_unit_id')
			.leftJoin(`${StudyPlanCourseTable._table} as spc`, 'c.id', 'spc.course_id')

		// Identity filters
		if (filters.id && ignoreFacet !== 'id') {
			const ids = toArray(filters.id)
			if (ids.length) query = query.where('c.id', 'in', ids)
		}

		if (filters.ident && ignoreFacet !== 'ident') {
			const idents = toArray(filters.ident)
			if (idents.length) {
				query = query.where(eb => eb.or(idents.map(v => eb('c.ident', 'like', `%${v}%`))))
			}
		}

		if (filters.title && ignoreFacet !== 'title') {
			query = query.where(eb => eb.or([eb('c.title', 'like', `%${filters.title}%`), eb('c.czech_title', 'like', `%${filters.title}%`)]))
		}

		// Academic period filters
		if (filters.semester && ignoreFacet !== 'semester') {
			const semesters = toArray(filters.semester)
			if (semesters.length) query = query.where('c.semester', 'in', semesters)
		}

		if (filters.year && ignoreFacet !== 'year') {
			const years = toArray(filters.year)
			if (years.length) query = query.where('c.year', 'in', years)
		}

		// Organizational filters
		if (filters.faculty_id && ignoreFacet !== 'faculty_id') {
			const faculties = toArray(filters.faculty_id)
			if (faculties.length) query = query.where('c.faculty_id', 'in', faculties)
		}

		if (filters.level && ignoreFacet !== 'level') {
			const levels = toArray(filters.level)
			if (levels.length) query = query.where('c.level', 'in', levels)
		}

		if (filters.language && ignoreFacet !== 'language') {
			const languages = toArray(filters.language)
			if (languages.length) {
				query = query.where(eb => eb.or(languages.map(v => eb('c.languages', 'like', `%${v}%`))))
			}
		}

		// Schedule filters
		if (filters.day && ignoreFacet !== 'day') {
			const days = toArray(filters.day)
			if (days.length) query = query.where('s.day', 'in', days)
		}

		if (filters.time_from !== undefined && ignoreFacet !== 'time_from') {
			query = query.where('s.time_from_minutes', '>=', filters.time_from)
		}

		if (filters.time_to !== undefined && ignoreFacet !== 'time_to') {
			query = query.where('s.time_to_minutes', '<=', filters.time_to)
		}

		// Personnel filters
		if (filters.lecturer && ignoreFacet !== 'lecturer') {
			const lecturers = toArray(filters.lecturer)
			if (lecturers.length) {
				query = query.where(eb => eb.or(lecturers.flatMap(v => [eb('c.lecturers', 'like', `%${v}%`), eb('u.lecturer', 'like', `%${v}%`)])))
			}
		}

		// Study plan filters
		if (filters.study_plan_id && ignoreFacet !== 'study_plan_id') {
			const planIds = toArray(filters.study_plan_id)
			if (planIds.length) query = query.where('spc.study_plan_id', 'in', planIds)
		}

		if (filters.group && ignoreFacet !== 'group') {
			const groups = toArray(filters.group)
			if (groups.length) query = query.where('spc.group', 'in', groups)
		}

		if (filters.category && ignoreFacet !== 'category') {
			const categories = toArray(filters.category)
			if (categories.length) query = query.where('spc.category', 'in', categories)
		}

		// Course properties filters
		if (filters.ects && ignoreFacet !== 'ects') {
			const ects = toArray(filters.ects)
			if (ects.length) query = query.where('c.ects', 'in', ects)
		}

		if (filters.mode_of_completion && ignoreFacet !== 'mode_of_completion') {
			const modes = toArray(filters.mode_of_completion)
			if (modes.length) query = query.where('c.mode_of_completion', 'in', modes)
		}

		if (filters.mode_of_delivery && ignoreFacet !== 'mode_of_delivery') {
			const modes = toArray(filters.mode_of_delivery)
			if (modes.length) query = query.where('c.mode_of_delivery', 'in', modes)
		}

		// Conflict exclusion
		if (filters.exclude_slot_ids?.length) {
			query = query.where('s.id', 'not in', filters.exclude_slot_ids)
		}

		if (filters.exclude_times?.length) {
			query = query.where(eb =>
				eb.and(
					filters.exclude_times!.map(exc =>
						eb.or([eb('s.day', '!=', exc.day), eb('s.time_to_minutes', '<=', exc.time_from), eb('s.time_from_minutes', '>=', exc.time_to)])
					)
				)
			)
		}

		return query
	}

	private static async getFacultiesForCourses(courseIds: number[]) {
		return mysql
			.selectFrom(`${FacultyTable._table} as f`)
			.selectAll('f')
			.where(
				'f.id',
				'in',
				mysql.selectFrom(`${CourseTable._table} as c`).select('c.faculty_id').where('c.id', 'in', courseIds).where('c.faculty_id', 'is not', null)
			)
			.execute()
	}

	private static async getTimetableUnitsForCourses(courseIds: number[]) {
		return mysql.selectFrom(`${CourseTimetableUnitTable._table} as u`).selectAll('u').where('u.course_id', 'in', courseIds).execute()
	}

	private static async getTimetableSlotsForCourses(courseIds: number[]) {
		return mysql
			.selectFrom(`${CourseTimetableSlotTable._table} as s`)
			.innerJoin(`${CourseTimetableUnitTable._table} as u`, 's.timetable_unit_id', 'u.id')
			.selectAll('s')
			.where('u.course_id', 'in', courseIds)
			.execute()
	}

	private static async getAssessmentMethodsForCourses(courseIds: number[]) {
		return mysql.selectFrom(`${CourseAssessmentMethodTable._table} as am`).selectAll('am').where('am.course_id', 'in', courseIds).execute()
	}

	private static async getStudyPlanInfoForCourses(courseIds: number[], studyPlanIds: number | number[]) {
		const planIds = Array.isArray(studyPlanIds) ? studyPlanIds : [studyPlanIds]
		return mysql
			.selectFrom(`${StudyPlanCourseTable._table} as spc`)
			.selectAll('spc')
			.where('spc.course_id', 'in', courseIds)
			.where('spc.study_plan_id', 'in', planIds)
			.execute()
	}

	private static processPipeFacet(data: { value: string | null; count: number }[], limit?: number): FacetItem[] {
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

	private static getSortColumn(sortBy?: string): string {
		const sortMap: Record<string, string> = {
			ident: 'c.ident',
			title: 'c.czech_title',
			ects: 'c.ects',
			faculty: 'c.faculty_id',
			year: 'c.year',
			semester: 'c.semester'
		}
		return sortMap[sortBy ?? 'ident'] ?? 'c.ident'
	}
}
