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
import { jsonArrayFrom, jsonObjectFrom } from 'kysely/helpers/mysql'

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
		// 1. Get total count (Keep as separate query for performance)
		const countQuery = this.buildCourseQuery(filters)
			.select(eb => eb.fn.count<number>('c.id').distinct().as('total'))
			.groupBy('c.id')

		const countResult = await mysql
			.selectFrom(countQuery.as('counted'))
			.select(eb => eb.fn.count<number>('total').as('total'))
			.executeTakeFirst()

		const total = countResult?.total ?? 0

		if (total === 0) {
			return { courses: [], total: 0 }
		}

		// 2. Optimized Single Query for Data
		// We first select the IDs in a subquery to handle pagination correctly independent of the heavy JSON joins.
		const courseIdsQuery = this.buildCourseQuery(filters)
			.select('c.id')
			.groupBy('c.id')
			.orderBy(this.getSortColumn(filters.sort_by) as any, filters.sort_dir ?? 'asc')
			.limit(limit)
			.offset(offset)

		const courses = await mysql
			.selectFrom(courseIdsQuery.as('ids')) // Use the subquery
			.innerJoin(`${CourseTable._table} as c`, 'c.id', 'ids.id')
			.selectAll('c')
			.select(eb => [
				// Relation 1: Faculty (1:1)
				jsonObjectFrom(
					eb
						.selectFrom(`${FacultyTable._table} as f`)
						.select(['f.id', 'f.title', 'f.created_at', 'f.updated_at'])
						.whereRef('f.id', '=', 'c.faculty_id')
				).as('faculty'),

				// Relation 2: Units (1:N) with Nested Slots (1:N)
				jsonArrayFrom(
					eb
						.selectFrom(`${CourseUnitTable._table} as u`)
						.select(['u.id', 'u.course_id', 'u.lecturer', 'u.capacity', 'u.note', 'u.created_at', 'u.updated_at'])
						.whereRef('u.course_id', '=', 'c.id')
						.select(subEb => [
							jsonArrayFrom(
								subEb
									.selectFrom(`${CourseUnitSlotTable._table} as s`)
									.select([
										's.id',
										's.unit_id',
										's.type',
										's.frequency',
										's.date',
										's.day',
										's.time_from',
										's.time_to',
										's.location',
										's.created_at',
										's.updated_at'
									])
									.whereRef('s.unit_id', '=', 'u.id')
							).as('slots')
						])
				).as('units'),

				// Relation 3: Assessments (1:N)
				jsonArrayFrom(
					eb
						.selectFrom(`${CourseAssessmentTable._table} as ca`)
						.select(['ca.id', 'ca.course_id', 'ca.method', 'ca.weight', 'ca.created_at', 'ca.updated_at'])
						.whereRef('ca.course_id', '=', 'c.id')
				).as('assessments'),

				// Relation 4: Study Plans (M:N) - Conditional Logic
				filters.study_plan_ids
					? jsonArrayFrom(
							eb
								.selectFrom(`${StudyPlanCourseTable._table} as spc`)
								.select([
									'spc.id',
									'spc.study_plan_id',
									'spc.course_id',
									'spc.course_ident',
									'spc.group',
									'spc.category',
									'spc.created_at',
									'spc.updated_at'
								])
								.whereRef('spc.course_id', '=', 'c.id')
								.where('spc.study_plan_id', 'in', Array.isArray(filters.study_plan_ids) ? filters.study_plan_ids : [filters.study_plan_ids])
						).as('study_plans')
					: eb.val(null).as('study_plans')
			])
			.orderBy(this.getSortColumn(filters.sort_by) as any, filters.sort_dir ?? 'asc')
			.execute()

		const parsedCourses = courses.map(course => ({
			...course,
			units: course.units ?? [],
			assessments: course.assessments ?? [],
			study_plans: course.study_plans ?? []
		}))

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		return { courses: parsedCourses as any, total }
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
		ignore?: keyof ExcludeMethods<Course> | keyof Omit<CoursesFilter, 'sort_by' | 'sort_dir' | 'limit' | 'offset'>
	) {
		let query = mysql
			.selectFrom(`${CourseTable._table} as c`)
			.leftJoin(`${CourseUnitTable._table} as u`, 'c.id', 'u.course_id')
			.leftJoin(`${CourseUnitSlotTable._table} as s`, 'u.id', 's.unit_id')
			.leftJoin(`${StudyPlanCourseTable._table} as spc`, 'c.id', 'spc.course_id')

		// Identity filters
		if (filters.ids?.length && !['id', 'ids'].includes(ignore!)) {
			query = query.where('c.id', 'in', filters.ids)
		}

		if (filters.idents?.length && !['ident', 'idents'].includes(ignore!)) {
			query = query.where(eb => eb.or(filters.idents!.map(v => eb('c.ident', 'like', `%${v}%`))))
		}

		if (filters.title && !['title'].includes(ignore!)) {
			query = query.where(eb => eb.or([eb('c.title', 'like', `%${filters.title}%`), eb('c.czech_title', 'like', `%${filters.title}%`)]))
		}

		// Academic period filters
		if (filters.semesters?.length && !['semester', 'semesters'].includes(ignore!)) {
			query = query.where('c.semester', 'in', filters.semesters)
		}

		if (filters.years?.length && !['year', 'years'].includes(ignore!)) {
			query = query.where('c.year', 'in', filters.years)
		}

		// Organizational filters
		if (filters.faculty_ids?.length && !['faculty_id', 'faculty_ids'].includes(ignore!)) {
			query = query.where('c.faculty_id', 'in', filters.faculty_ids)
		}

		if (filters.levels?.length && !['level', 'levels'].includes(ignore!)) {
			query = query.where('c.level', 'in', filters.levels)
		}

		if (filters.languages?.length && !['language', 'languages'].includes(ignore!)) {
			query = query.where(eb => eb.or(filters.languages!.map(v => eb('c.languages', 'like', `%${v}%`))))
		}

		// Time filters
		if (filters.include_times?.length && !['include_times'].includes(ignore!)) {
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

		if (filters.exclude_times?.length && !['exclude_times'].includes(ignore!)) {
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
		if (filters.lecturers?.length && !['lecturers'].includes(ignore!)) {
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
		if (filters.study_plan_ids?.length && !['study_plan_id', 'study_plan_ids'].includes(ignore!)) {
			query = query.where('spc.study_plan_id', 'in', filters.study_plan_ids)
		}

		if (filters.groups?.length && !['groups'].includes(ignore!)) {
			query = query.where('spc.group', 'in', filters.groups)
		}

		if (filters.categories?.length && !['categories'].includes(ignore!)) {
			query = query.where('spc.category', 'in', filters.categories)
		}

		// Course properties filters
		if (filters.ects?.length && !['ects'].includes(ignore!)) {
			query = query.where('c.ects', 'in', filters.ects)
		}

		if (filters.mode_of_completions?.length && !['mode_of_completion', 'mode_of_completions'].includes(ignore!)) {
			query = query.where('c.mode_of_completion', 'in', filters.mode_of_completions)
		}

		if (filters.mode_of_deliveries?.length && !['mode_of_delivery', 'mode_of_deliveries'].includes(ignore!)) {
			query = query.where('c.mode_of_delivery', 'in', filters.mode_of_deliveries)
		}

		// Conflict exclusion
		if (filters.exclude_slot_ids?.length && !['exclude_slot_ids'].includes(ignore!)) {
			query = query.where('s.id', 'not in', filters.exclude_slot_ids)
		}

		return query
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
