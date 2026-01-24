import { mysql } from '@api/clients'
import {
	Course,
	CourseAssessment,
	CourseAssessmentTable,
	CourseTable,
	CourseUnit,
	CourseUnitSlot,
	CourseUnitSlotTable,
	CourseUnitTable,
	ExcludeMethods,
	Faculty,
	FacultyTable,
	StudyPlanCourse,
	StudyPlanCourseTable
} from '@api/Database/types'
import FacetItem from '@api/Interfaces/FacetItem'
import { CoursesFilter } from '@api/Validations/CoursesFilterValidation'
import { sql } from 'kysely'

/**
 * Service handling all Course-related database operations.
 */
export default class CourseService {
	/**
	 * Retrieves a paginated list of courses with deep relations.
	 */
	static async getCoursesWithRelations(
		filters: Partial<CoursesFilter>,
		limit = 20,
		offset = 0
	): Promise<{ courses: Course<Faculty, CourseUnit<void, CourseUnitSlot>, CourseAssessment, StudyPlanCourse>[]; total: number }> {
		// 1. Get total count
		const countQuery = this.buildCourseQuery(filters)
			.select(eb => eb.fn.count<number>('c.id').distinct().as('total'))
			.groupBy('c.id')

		const countResult = await mysql
			.selectFrom(countQuery.as('counted'))
			.select(eb => eb.fn.count<number>('total').as('total'))
			.executeTakeFirst()

		const total = countResult?.total ?? 0

		// 2. Get paginated course IDs
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

		// 3. Fetch full course data
		const courses = await mysql
			.selectFrom(`${CourseTable._table} as c`)
			.selectAll('c')
			.where('c.id', 'in', courseIds)
			.orderBy(this.getSortColumn(filters.sort_by) as any, filters.sort_dir ?? 'asc')
			.execute()

		// 4. Fetch related data in parallel
		const [faculties, units, slots, assessments, studyPlans] = await Promise.all([
			this.getFacultiesForCourses(courseIds),
			this.getCoursesUnits(courseIds),
			this.getCoursesUnitsSlots(courseIds),
			this.getCoursesAssessments(courseIds),
			filters.study_plan_ids ? this.getCoursesStudyPlans(courseIds, filters.study_plan_ids) : Promise.resolve([])
		])

		// 5. In-Memory Mapping

		// Faculty Map
		const facultyMap = new Map<string, Faculty>()
		for (const f of faculties) {
			facultyMap.set(f.id, f)
		}

		// Timetable Units Map (with injected Slots)
		const unitsMap = new Map<number, CourseUnit<void, CourseUnitSlot>[]>()
		for (const unit of units) {
			if (!unitsMap.has(unit.course_id)) {
				unitsMap.set(unit.course_id, [])
			}

			// We explicitly construct the object to match CourseUnit<void, CourseUnitSlot>
			const unitWithSlots: CourseUnit<void, CourseUnitSlot> = {
				...unit,
				slots: slots.filter(s => s.unit_id === unit.id)
			}
			unitsMap.get(unit.course_id)!.push(unitWithSlots)
		}

		// Assessment Map
		const assessmentMap = new Map<number, CourseAssessment[]>()
		for (const am of assessments) {
			if (!assessmentMap.has(am.course_id)) {
				assessmentMap.set(am.course_id, [])
			}
			assessmentMap.get(am.course_id)!.push(am)
		}

		// Study Plan Map
		const studyPlanMap = new Map<number, StudyPlanCourse[]>()
		for (const sp of studyPlans) {
			// Safety check: sp.course_id should exist based on query, but type says nullable
			if (sp.course_id) {
				if (!studyPlanMap.has(sp.course_id)) {
					studyPlanMap.set(sp.course_id, [])
				}
				studyPlanMap.get(sp.course_id)!.push(sp)
			}
		}

		// 6. Assembly
		const coursesWithRelations: Course<Faculty, CourseUnit<void, CourseUnitSlot>, CourseAssessment, StudyPlanCourse>[] = courses.map(course => ({
			...course,
			faculty: course.faculty_id ? (facultyMap.get(course.faculty_id) ?? null) : null,
			units: unitsMap.get(course.id) ?? [],
			assessments: assessmentMap.get(course.id) ?? [],
			study_plans: studyPlanMap.get(course.id) ?? []
		}))

		return { courses: coursesWithRelations, total }
	}

	/**
	 * Aggregates all search facets (filters) for the course catalog in parallel.
	 */
	static async getCourseFacets(filters: CoursesFilter) {
		const [faculties, days, lecturersRaw, languagesRaw, levels, semesters, years, groups, categories, ects, modesOfCompletion, timeRange] =
			await Promise.all([
				this.getFacet(filters, 'faculty_id'),
				this.getDayFacet(filters),
				this.getLecturerFacet(filters),
				this.getLanguageFacet(filters),
				this.getLevelFacet(filters),
				this.getFacet(filters, 'semester'),
				this.getFacet(filters, 'year'),
				this.getGroupFacet(filters),
				this.getCategoryFacet(filters),
				this.getFacet(filters, 'ects'),
				this.getFacet(filters, 'mode_of_completion'),
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

	/**
	 * Generic facet builder to reduce code duplication (DRY Principle).
	 */
	private static async getFacet(filters: CoursesFilter, column: keyof ExcludeMethods<Course>): Promise<FacetItem[]> {
		return this.buildCourseQuery(filters, column)
			.select(`c.${column} as value`)
			.select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
			.where(`c.${column}`, 'is not', null)
			.groupBy(`c.${column}`)
			.orderBy('count', 'desc')
			.execute()
	}

	private static async getDayFacet(filters: CoursesFilter): Promise<FacetItem[]> {
		return this.buildCourseQuery(filters, 'include_times')
			.select('s.day as value')
			.select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
			.where('s.day', 'is not', null)
			.groupBy('s.day')
			.orderBy('value')
			.execute()
	}

	private static async getLecturerFacet(filters: CoursesFilter) {
		return this.buildCourseQuery(filters, 'lecturers')
			.select(sql<string>`COALESCE(u.lecturer, c.lecturers)`.as('value'))
			.select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
			.where(sql`COALESCE(u.lecturer, c.lecturers)`, 'is not', null)
			.groupBy(sql`COALESCE(u.lecturer, c.lecturers)`)
			.orderBy('count', 'desc')
			.limit(50)
			.execute()
	}

	private static async getLanguageFacet(filters: CoursesFilter) {
		return this.buildCourseQuery(filters, 'languages')
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

	private static async getGroupFacet(filters: CoursesFilter): Promise<FacetItem[]> {
		if (!filters.study_plan_ids) return []
		return this.buildCourseQuery(filters, 'groups')
			.select('spc.group as value')
			.select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
			.where('spc.group', 'is not', null)
			.groupBy('spc.group')
			.orderBy('value')
			.execute()
	}

	private static async getCategoryFacet(filters: CoursesFilter): Promise<FacetItem[]> {
		if (!filters.study_plan_ids) return []
		return this.buildCourseQuery(filters, 'categories')
			.select('spc.category as value')
			.select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
			.where('spc.category', 'is not', null)
			.groupBy('spc.category')
			.orderBy('value')
			.execute()
	}

	private static async getTimeRangeFacet(filters: CoursesFilter) {
		const result = await this.buildCourseQuery(filters, 'include_times')
			.select(eb => [
				// Use min/max on the slot times
				eb.fn.min<number>('s.time_from').as('min_time'),
				eb.fn.max<number>('s.time_to').as('max_time')
			])
			.where('s.time_from', 'is not', null)
			.executeTakeFirst()

		return {
			// Default to 0-1440 (00:00 - 24:00) if no slots are found
			min_time: result?.min_time ?? 0,
			max_time: result?.max_time ?? 1440
		}
	}

	/**
	 * Constructs the central Kysely query builder for filtering courses.
	 */
	private static buildCourseQuery(
		filters: Partial<CoursesFilter>,
		ignoreFacet?: keyof ExcludeMethods<Course> | keyof Omit<CoursesFilter, 'sort_by' | 'sort_dir' | 'limit' | 'offset'>
	) {
		let query = mysql
			.selectFrom(`${CourseTable._table} as c`)
			.leftJoin(`${CourseUnitTable._table} as u`, 'c.id', 'u.course_id')
			.leftJoin(`${CourseUnitSlotTable._table} as s`, 'u.id', 's.unit_id')
			.leftJoin(`${StudyPlanCourseTable._table} as spc`, 'c.id', 'spc.course_id')

		// Identity filters
		if (filters.ids?.length && ignoreFacet !== 'ids') {
			query = query.where('c.id', 'in', filters.ids)
		}

		if (filters.idents?.length && ignoreFacet !== 'idents') {
			query = query.where(eb => eb.or(filters.idents!.map(v => eb('c.ident', 'like', `%${v}%`))))
		}

		if (filters.title && ignoreFacet !== 'title') {
			query = query.where(eb => eb.or([eb('c.title', 'like', `%${filters.title}%`), eb('c.czech_title', 'like', `%${filters.title}%`)]))
		}

		// Academic period filters
		if (filters.semesters?.length && ignoreFacet !== 'semesters') {
			query = query.where('c.semester', 'in', filters.semesters)
		}

		if (filters.years?.length && ignoreFacet !== 'years') {
			query = query.where('c.year', 'in', filters.years)
		}

		// Organizational filters
		if (filters.faculty_ids?.length && ignoreFacet !== 'faculty_ids') {
			query = query.where('c.faculty_id', 'in', filters.faculty_ids)
		}

		if (filters.levels?.length && ignoreFacet !== 'levels') {
			query = query.where('c.level', 'in', filters.levels)
		}

		if (filters.languages?.length && ignoreFacet !== 'languages') {
			query = query.where(eb => eb.or(filters.languages!.map(v => eb('c.languages', 'like', `%${v}%`))))
		}

		// Time filters
		if (filters.include_times?.length && ignoreFacet !== 'include_times') {
			query = query.where(eb =>
				eb.or(
					filters.include_times!.map(exc =>
						eb.and([
							eb('s.day', '=', exc.day), // Exact day match
							eb('s.time_from', '>=', exc.time_from), // Slot starts at or after the filter start time
							eb('s.time_to', '<=', exc.time_to) // Slot ends at or before the filter end time
						])
					)
				)
			)
		}

		if (filters.exclude_times?.length && ignoreFacet !== 'exclude_times') {
			query = query.where(eb =>
				eb.and(
					filters.exclude_times!.map(exc =>
						eb.or([
							eb('s.day', '!=', exc.day), // Different day
							eb('s.time_to', '<=', exc.time_from), // Slot ends before the filter start time
							eb('s.time_from', '>=', exc.time_to) // Slot starts after the filter end time
						])
					)
				)
			)
		}

		// Personnel filters
		if (filters.lecturers?.length && ignoreFacet !== 'lecturers') {
			query = query.where(eb =>
				eb.or(
					filters.lecturers!.flatMap(v => [
						eb('c.lecturers', 'like', `%${v}%`), // Course-level lecturers
						eb('u.lecturer', 'like', `%${v}%`) // Unit-level lecturers
					])
				)
			)
		}

		// Study plan filters
		if (filters.study_plan_ids?.length && ignoreFacet !== 'study_plan_ids') {
			query = query.where('spc.study_plan_id', 'in', filters.study_plan_ids)
		}

		if (filters.groups?.length && ignoreFacet !== 'groups') {
			query = query.where('spc.group', 'in', filters.groups)
		}

		if (filters.categories?.length && ignoreFacet !== 'categories') {
			query = query.where('spc.category', 'in', filters.categories)
		}

		// Course properties filters
		if (filters.ects?.length && ignoreFacet !== 'ects') {
			query = query.where('c.ects', 'in', filters.ects)
		}

		if (filters.mode_of_completions?.length && ignoreFacet !== 'mode_of_completions') {
			query = query.where('c.mode_of_completion', 'in', filters.mode_of_completions)
		}

		if (filters.mode_of_deliveries?.length && ignoreFacet !== 'mode_of_delivery') {
			query = query.where('c.mode_of_delivery', 'in', filters.mode_of_deliveries)
		}

		// Conflict exclusion
		if (filters.exclude_slot_ids?.length && ignoreFacet !== 'exclude_slot_ids') {
			query = query.where('s.id', 'not in', filters.exclude_slot_ids)
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

	private static async getCoursesUnits(courseIds: number[]) {
		return mysql.selectFrom(`${CourseUnitTable._table} as u`).selectAll('u').where('u.course_id', 'in', courseIds).execute()
	}

	private static async getCoursesUnitsSlots(courseIds: number[]) {
		return mysql
			.selectFrom(`${CourseUnitSlotTable._table} as s`)
			.innerJoin(`${CourseUnitTable._table} as u`, 's.unit_id', 'u.id')
			.selectAll('s')
			.where('u.course_id', 'in', courseIds)
			.execute()
	}

	private static async getCoursesAssessments(courseIds: number[]) {
		return mysql.selectFrom(`${CourseAssessmentTable._table} as am`).selectAll('am').where('am.course_id', 'in', courseIds).execute()
	}

	private static async getCoursesStudyPlans(courseIds: number[], studyPlanIds: number | number[]) {
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
