import { Nullable, SelectQueryBuilder } from 'kysely'
import { mysql } from '@api/clients'
import { StudyPlansFilter } from '@api/Controllers/Kreditozrouti/StudyPlansController'
import { Database, StudyPlanCourseTable, StudyPlanTable } from '@api/Database/types'

type QueryBuilder = SelectQueryBuilder<Database & { sp: StudyPlanTable } & { spc: Nullable<StudyPlanCourseTable> }, 'sp' | 'spc', object>

export class StudyPlanFilterBuilder {
	/**
	 * Builds the base Kysely query for study plans, conditionally joining study_plan_courses
	 * when the active filters require it, then applies all filter conditions.
	 *
	 * @param {Partial<StudyPlansFilter>} filters - Active filter criteria.
	 * @param {string} [ignoreFacet] - Facet dimension to exclude from filtering (used for cross-filtering).
	 * @returns {QueryBuilder} Kysely SelectQueryBuilder with filters and optional left join applied.
	 */
	public static buildFilterQuery(filters: Partial<StudyPlansFilter>, ignoreFacet?: string): QueryBuilder {
		const needsJoin = this.needsCoursesJoin(filters, ignoreFacet)

		let query: QueryBuilder = mysql.selectFrom(`${StudyPlanTable._table} as sp`) as QueryBuilder

		if (needsJoin) {
			query = query.leftJoin(`${StudyPlanCourseTable._table} as spc`, 'sp.id', 'spc.study_plan_id')
		}

		return this.applyFilters(query, filters, ignoreFacet)
	}

	/**
	 * Returns true when the active filters require a left join on study_plan_courses.
	 *
	 * @param {Partial<StudyPlansFilter>} filters - Active filter criteria.
	 * @param {string} [ignore] - Facet dimension to ignore when evaluating join necessity.
	 * @returns {boolean} True when has_course_ids or has_course_idents is present and not ignored.
	 */
	public static needsCoursesJoin(filters: Partial<StudyPlansFilter>, ignore?: string): boolean {
		return (!!filters.has_course_ids?.length && ignore !== 'has_course_ids') || (!!filters.has_course_idents?.length && ignore !== 'has_course_idents')
	}

	/**
	 * Applies all active filter conditions to the provided query, skipping the dimension
	 * named by ignoreFacet (used for cross-filtering facet counts).
	 *
	 * @param {QueryBuilder} query - Base Kysely query to extend.
	 * @param {Partial<StudyPlansFilter>} filters - Active filter criteria.
	 * @param {string} [ignoreFacet] - Facet dimension to skip when applying filters.
	 * @returns {QueryBuilder} Query with all applicable where clauses applied.
	 */
	public static applyFilters(query: QueryBuilder, filters: Partial<StudyPlansFilter>, ignoreFacet?: string): QueryBuilder {
		// Identity filters
		if (filters.ids?.length && ignoreFacet !== 'ids') {
			query = query.where('sp.id', 'in', filters.ids)
		}

		if (filters.idents?.length && ignoreFacet !== 'idents') {
			query = query.where(eb => eb.or(filters.idents!.map((v: string) => eb('sp.ident', 'like', `%${v}%`))))
		}

		if (filters.title && ignoreFacet !== 'title') {
			query = query.where('sp.title', 'like', `%${filters.title}%`)
		}

		// Faculty & Period
		if (filters.faculty_ids?.length && ignoreFacet !== 'faculty_ids') {
			query = query.where('sp.faculty_id', 'in', filters.faculty_ids)
		}

		if (filters.years?.length && ignoreFacet !== 'years') {
			query = query.where('sp.year', 'in', filters.years)
		}

		if (filters.semesters?.length && ignoreFacet !== 'semesters') {
			query = query.where('sp.semester', 'in', filters.semesters)
		}

		if (filters.levels?.length && ignoreFacet !== 'levels') {
			query = query.where('sp.level', 'in', filters.levels)
		}

		if (filters.mode_of_studies?.length && ignoreFacet !== 'mode_of_studies') {
			query = query.where('sp.mode_of_study', 'in', filters.mode_of_studies)
		}

		if (filters.study_lengths?.length && ignoreFacet !== 'study_lengths') {
			query = query.where('sp.study_length', 'in', filters.study_lengths)
		}

		// Course-related filters
		if (filters.has_course_ids?.length && ignoreFacet !== 'has_course_ids') {
			query = query.where('spc.course_id', 'in', filters.has_course_ids)
		}

		if (filters.has_course_idents?.length && ignoreFacet !== 'has_course_idents') {
			query = query.where('spc.course_ident', 'in', filters.has_course_idents)
		}

		return query
	}
}
