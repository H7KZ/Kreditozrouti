import { mysql } from '@api/clients'
import { ExcludeMethods, Faculty, FacultyTable, StudyPlan, StudyPlanCourse, StudyPlanCourseTable, StudyPlanTable } from '@api/Database/types'
import FacetItem from '@api/Interfaces/FacetItem'
import { toArray } from '@api/Services/Utils'
import { StudyPlansFilter } from '@api/Validations/StudyPlansFilterValidation'

export default class StudyPlanService {
	/**
	 * Retrieves paginated study plans with full relational data.
	 */
	static async getStudyPlansWithRelations(
		filters: Partial<StudyPlansFilter>,
		limit = 20,
		offset = 0
	): Promise<{ plans: StudyPlan<Faculty, StudyPlanCourse>[]; total: number }> {
		// 1. Get total count
		const countResult = await this.buildStudyPlanQuery(filters)
			.select(eb => eb.fn.count<number>('sp.id').distinct().as('total'))
			.executeTakeFirst()

		const total = countResult?.total ?? 0

		// 2. Get paginated plans
		const plans = await this.buildStudyPlanQuery(filters)
			.selectAll('sp')
			.groupBy('sp.id')
			.orderBy(this.getStudyPlanSortColumn(filters.sort_by) as any, filters.sort_dir ?? 'asc')
			.limit(limit)
			.offset(offset)
			.execute()

		if (plans.length === 0) {
			return { plans: [], total }
		}

		const planIds = new Set(plans.map(p => p.id))

		// 3. Parallel fetch of related data
		// Optimized to fetch only what is needed for the result set
		const [faculties, planCourses] = await Promise.all([this.getFacultiesForPlans(plans), this.getCoursesForPlans([...planIds])])

		// 4. In-Memory Mapping
		const facultyMap = new Map<string, Faculty>()
		for (const f of faculties) {
			facultyMap.set(f.id, f)
		}

		const coursesMap = new Map<number, StudyPlanCourse[]>()
		for (const pc of planCourses) {
			if (!coursesMap.has(pc.study_plan_id)) coursesMap.set(pc.study_plan_id, [])

			coursesMap.get(pc.study_plan_id)!.push(pc)
		}

		// 5. Assembly
		// We strictly type the return to match StudyPlan<Faculty, StudyPlanCourse>
		const plansWithRelations: StudyPlan<Faculty, StudyPlanCourse>[] = plans.map(plan => {
			const courses = coursesMap.get(plan.id) ?? []

			return {
				...plan,
				faculty: plan.faculty_id ? (facultyMap.get(plan.faculty_id) ?? null) : null,
				courses: courses
			}
		})

		return { plans: plansWithRelations, total }
	}

	/**
	 * Aggregates all available facets for Study Plans.
	 */
	static async getStudyPlanFacets(filters: StudyPlansFilter) {
		const [faculties, levels, modesOfStudies, semesters, years, studyLengths] = await Promise.all([
			this.getFacet(filters, 'faculty_id'),
			this.getFacet(filters, 'level'),
			this.getFacet(filters, 'mode_of_study'),
			this.getFacet(filters, 'semester'),
			this.getFacet(filters, 'year'),
			this.getFacet(filters, 'study_length')
		])

		return {
			faculties,
			levels,
			modes_of_studies: modesOfStudies,
			semesters,
			years,
			study_lengths: studyLengths
		}
	}

	/**
	 * Generic facet builder to reduce code duplication (DRY Principle).
	 */
	private static async getFacet(filters: StudyPlansFilter, column: keyof ExcludeMethods<StudyPlan>): Promise<FacetItem[]> {
		return this.buildStudyPlanQuery(filters, column)
			.select(`sp.${column} as value`)
			.select(eb => eb.fn.count<number>('sp.id').distinct().as('count'))
			.where(`sp.${column}`, 'is not', null)
			.groupBy(`sp.${column}`)
			.orderBy('count', 'desc')
			.execute()
	}

	private static buildStudyPlanQuery(
		filters: Partial<StudyPlansFilter>,
		ignoreFacet?: keyof ExcludeMethods<StudyPlan> | keyof Omit<StudyPlansFilter, 'sort_by' | 'sort_dir' | 'limit' | 'offset'>
	) {
		let query = mysql.selectFrom(`${StudyPlanTable._table} as sp`).leftJoin(`${StudyPlanCourseTable._table} as spc`, 'sp.id', 'spc.study_plan_id')

		// Identity filters
		if (filters.id && ignoreFacet !== 'id') {
			const ids = toArray(filters.id)
			if (ids.length) query = query.where('sp.id', 'in', ids)
		}

		if (filters.ident && ignoreFacet !== 'ident') {
			const idents = toArray(filters.ident)
			if (idents.length) {
				query = query.where(eb => eb.or(idents.map(v => eb('sp.ident', 'like', `%${v}%`))))
			}
		}

		if (filters.title && ignoreFacet !== 'title') {
			query = query.where('sp.title', 'like', `%${filters.title}%`)
		}

		// Faculty & Period
		if (filters.faculty_id && ignoreFacet !== 'faculty_id') {
			const faculties = toArray(filters.faculty_id)
			if (faculties.length) query = query.where('sp.faculty_id', 'in', faculties)
		}

		if (filters.year && ignoreFacet !== 'year') {
			const years = toArray(filters.year)
			if (years.length) query = query.where('sp.year', 'in', years)
		}

		if (filters.semester && ignoreFacet !== 'semester') {
			const semesters = toArray(filters.semester)
			if (semesters.length) query = query.where('sp.semester', 'in', semesters)
		}

		if (filters.level && ignoreFacet !== 'level') {
			const levels = toArray(filters.level)
			if (levels.length) query = query.where('sp.level', 'in', levels)
		}

		if (filters.mode_of_study && ignoreFacet !== 'mode_of_study') {
			const modes = toArray(filters.mode_of_study)
			if (modes.length) query = query.where('sp.mode_of_study', 'in', modes)
		}

		if (filters.study_length && ignoreFacet !== 'study_length') {
			const lengths = toArray(filters.study_length)
			if (lengths.length) query = query.where('sp.study_length', 'in', lengths)
		}

		// Course-related filters
		if (filters.has_course_id && ignoreFacet !== 'has_course_id') {
			const courseIds = toArray(filters.has_course_id)
			if (courseIds.length) query = query.where('spc.course_id', 'in', courseIds)
		}

		if (filters.has_course_ident && ignoreFacet !== 'has_course_ident') {
			const courseIdents = toArray(filters.has_course_ident)
			if (courseIdents.length) query = query.where('spc.course_ident', 'in', courseIdents)
		}

		return query
	}

	private static async getFacultiesForPlans(plans: { faculty_id: string | null }[]): Promise<Faculty[]> {
		const facultyIds = [...new Set(plans.map(p => p.faculty_id).filter(Boolean))] as string[]
		if (facultyIds.length === 0) return []

		return mysql.selectFrom(`${FacultyTable._table} as f`).selectAll('f').where('f.id', 'in', facultyIds).execute()
	}

	private static async getCoursesForPlans(planIds: number[]): Promise<StudyPlanCourse[]> {
		if (planIds.length === 0) return []
		return mysql.selectFrom(`${StudyPlanCourseTable._table} as spc`).selectAll('spc').where('spc.study_plan_id', 'in', planIds).execute()
	}

	private static getStudyPlanSortColumn(sortBy?: string): string {
		const sortMap: Record<string, string> = {
			ident: 'sp.ident',
			title: 'sp.title',
			faculty_id: 'sp.faculty_id',
			year: 'sp.year',
			semester: 'sp.semester',
			level: 'sp.level'
		}
		return sortMap[sortBy ?? 'ident'] ?? 'sp.ident'
	}
}
