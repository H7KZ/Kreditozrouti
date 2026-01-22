import { mysql } from '@api/clients'
import { Faculty, FacultyTable, StudyPlanCourse, StudyPlanCourseTable, StudyPlanTable, StudyPlanWithRelations } from '@api/Database/types'
import FacetItem from '@api/Interfaces/FacetItem'
import { StudyPlansFilter } from '@api/Validations/StudyPlansFilterValidation'

/**
 * Service for Study Plan retrieval and analysis.
 * Handles fetching plans with their nested course structures and statistical facets.
 */
export default class StudyPlanService {
	/**
	 * Retrieves paginated study plans with full relational data.
	 * Includes faculty details and nested course lists with categories (compulsory/elective).
	 * Calculates simple stats (total courses, compulsory count) on the fly.
	 */
	static async getStudyPlansWithRelations(
		filters: Partial<StudyPlansFilter>,
		limit = 20,
		offset = 0
	): Promise<{ plans: StudyPlanWithRelations[]; total: number }> {
		// Get total count
		const countResult = await this.buildStudyPlanQuery(filters)
			.select(eb => eb.fn.countAll<number>().as('total'))
			.executeTakeFirst()

		const total = countResult?.total ?? 0

		// Get paginated plans
		const plans = await this.buildStudyPlanQuery(filters)
			.selectAll('sp')
			.orderBy(this.getStudyPlanSortColumn(filters.sort_by) as any, filters.sort_dir ?? 'asc')
			.limit(limit)
			.offset(offset)
			.execute()

		if (plans.length === 0) {
			return { plans: [], total }
		}

		const planIds = plans.map(p => p.id)

		// Fetch related data
		const [faculties, planCourses] = await Promise.all([this.getFacultiesForPlans(plans), this.getCoursesForPlans(planIds)])

		// Build faculty map
		const facultyMap = new Map<string, Partial<Faculty>>()
		for (const f of faculties) {
			facultyMap.set(f.id, { id: f.id, title: f.title })
		}

		// Build courses map
		const coursesMap = new Map<number, Partial<StudyPlanCourse>[]>()
		for (const pc of planCourses) {
			if (!coursesMap.has(pc.study_plan_id)) {
				coursesMap.set(pc.study_plan_id, [])
			}
			coursesMap.get(pc.study_plan_id)!.push({
				id: pc.id,
				course_id: pc.course_id,
				course_ident: pc.course_ident,
				group: pc.group,
				category: pc.category
			})
		}

		// Assemble final response
		const plansWithRelations: StudyPlanWithRelations[] = plans.map(plan => {
			const courses = coursesMap.get(plan.id) ?? []
			return {
				...plan,
				faculty: plan.faculty_id ? (facultyMap.get(plan.faculty_id) ?? null) : null,
				courses,
				stats: {
					total_courses: courses.length,
					compulsory_courses: courses.filter(c => c.category === 'compulsory').length,
					elective_courses: courses.filter(c => c.category !== 'elective').length
				}
			}
		})

		return { plans: plansWithRelations, total }
	}

	/**
	 * Aggregates all available facets for Study Plans (Explicitly typed).
	 * Computes counts for Faculties, Levels, Modes of Study, etc.
	 */
	static async getStudyPlanFacets(filters: StudyPlansFilter) {
		const [faculties, levels, modesOfStudies, semesters, years, studyLengths] = await Promise.all([
			this.getFacultyFacet(filters),
			this.getLevelFacet(filters),
			this.getModeOfStudyFacet(filters),
			this.getSemesterFacet(filters),
			this.getYearFacet(filters),
			this.getStudyLengthFacet(filters)
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

	private static async getFacultyFacet(filters: StudyPlansFilter): Promise<FacetItem[]> {
		return this.buildStudyPlanQuery(filters, 'faculty_id')
			.select('sp.faculty_id as value')
			.select(eb => eb.fn.count<number>('sp.id').as('count'))
			.where('sp.faculty_id', 'is not', null)
			.groupBy('sp.faculty_id')
			.orderBy('count', 'desc')
			.execute()
	}

	private static async getLevelFacet(filters: StudyPlansFilter): Promise<FacetItem[]> {
		return this.buildStudyPlanQuery(filters, 'level')
			.select('sp.level as value')
			.select(eb => eb.fn.count<number>('sp.id').as('count'))
			.where('sp.level', 'is not', null)
			.groupBy('sp.level')
			.orderBy('count', 'desc')
			.execute()
	}

	private static async getModeOfStudyFacet(filters: StudyPlansFilter): Promise<FacetItem[]> {
		return this.buildStudyPlanQuery(filters, 'mode_of_study')
			.select('sp.mode_of_study as value')
			.select(eb => eb.fn.count<number>('sp.id').as('count'))
			.where('sp.mode_of_study', 'is not', null)
			.groupBy('sp.mode_of_study')
			.orderBy('count', 'desc')
			.execute()
	}

	private static async getSemesterFacet(filters: StudyPlansFilter): Promise<FacetItem[]> {
		return this.buildStudyPlanQuery(filters, 'semester')
			.select('sp.semester as value')
			.select(eb => eb.fn.count<number>('sp.id').as('count'))
			.where('sp.semester', 'is not', null)
			.groupBy('sp.semester')
			.orderBy('count', 'desc')
			.execute()
	}

	private static async getYearFacet(filters: StudyPlansFilter): Promise<FacetItem[]> {
		return this.buildStudyPlanQuery(filters, 'year')
			.select('sp.year as value')
			.select(eb => eb.fn.count<number>('sp.id').as('count'))
			.where('sp.year', 'is not', null)
			.groupBy('sp.year')
			.orderBy('count', 'desc')
			.execute()
	}

	private static async getStudyLengthFacet(filters: StudyPlansFilter): Promise<FacetItem[]> {
		return this.buildStudyPlanQuery(filters, 'study_length')
			.select('sp.study_length as value')
			.select(eb => eb.fn.count<number>('sp.id').as('count'))
			.where('sp.study_length', 'is not', null)
			.groupBy('sp.study_length')
			.orderBy('count', 'desc')
			.execute()
	}

	/**
	 * Constructs the central Kysely query builder for Study Plans.
	 * Can filter by properties of the plan itself or by the courses it contains.
	 *
	 * @param filters - The filtering criteria for study plans.
	 * @param ignoreFacet - An optional facet to ignore when building the query (used for facet calculations).
	 */
	private static buildStudyPlanQuery(filters: Partial<StudyPlansFilter>, ignoreFacet?: keyof StudyPlansFilter) {
		const toArray = <T>(val: T | T[] | undefined): T[] => (val === undefined ? [] : Array.isArray(val) ? val : [val])

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

		// Academic period filters
		if (filters.semester && ignoreFacet !== 'semester') {
			const semesters = toArray(filters.semester)
			if (semesters.length) query = query.where('sp.semester', 'in', semesters)
		}

		if (filters.year && ignoreFacet !== 'year') {
			const years = toArray(filters.year)
			if (years.length) query = query.where('sp.year', 'in', years)
		}

		// Organizational filters
		if (filters.faculty_id && ignoreFacet !== 'faculty_id') {
			const faculties = toArray(filters.faculty_id)
			if (faculties.length) query = query.where('sp.faculty_id', 'in', faculties)
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

		// Course filters
		if (filters.has_course_id && ignoreFacet !== 'has_course_id') {
			const courseIds = toArray(filters.has_course_id)
			if (courseIds.length) query = query.where('spc.course_id', 'in', courseIds)
		}

		if (filters.has_course_ident && ignoreFacet !== 'has_course_ident') {
			const idents = toArray(filters.has_course_ident)
			if (idents.length) {
				query = query.where(eb => eb.or(idents.map(v => eb('spc.course_ident', 'like', `%${v}%`))))
			}
		}

		return query
	}

	private static async getFacultiesForPlans(plans: { faculty_id: string | null }[]) {
		const facultyIds = [...new Set(plans.map(p => p.faculty_id).filter(Boolean))] as string[]
		if (facultyIds.length === 0) return []

		return mysql.selectFrom(`${FacultyTable._table} as f`).selectAll('f').where('f.id', 'in', facultyIds).execute()
	}

	private static async getCoursesForPlans(planIds: number[]) {
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
