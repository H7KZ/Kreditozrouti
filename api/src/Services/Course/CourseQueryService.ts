import { sql } from 'kysely'
import { jsonArrayFrom } from 'kysely/helpers/mysql'
import { mysql } from '@api/clients'
import { CoursesFilter } from '@api/Controllers/Kreditozrouti/CoursesController'
import {
	Course,
	CourseAssessmentTable,
	CourseTable,
	CourseUnitSlotTable,
	CourseUnitTable,
	CourseWithRelations,
	FacultyTable,
	StudyPlanCourseTable
} from '@api/Database/types'
import { CourseFilterBuilder } from './CourseFilterBuilder'

export class CourseQueryService {
	static async getCoursesWithRelations(filters: Partial<CoursesFilter>, limit = 20, offset = 0): Promise<{ courses: CourseWithRelations[]; total: number }> {
		if (limit <= 0) return { courses: [], total: 0 }

		// 1. Count total matching courses
		const total = await this.countFilteredCourses(filters)
		if (total === 0) return { courses: [], total: 0 }

		// 2. Fetch paginated course IDs only
		const courseIds = await this.fetchPaginatedCourseIds(filters, limit, offset)
		if (courseIds.length === 0) return { courses: [], total }

		// 3. Load all relations in parallel
		const [courses, faculties, units, assessments, studyPlans] = await Promise.all([
			this.fetchCoursesByIds(courseIds),
			this.fetchFacultiesByCourseIds(courseIds),
			this.fetchUnitsWithSlotsByCourseIds(courseIds),
			this.fetchAssessmentsByCourseIds(courseIds),
			filters.study_plan_ids?.length ? this.fetchStudyPlanCoursesByCourseIds(courseIds, filters.study_plan_ids) : Promise.resolve([])
		])

		// 4. Merge relations in-memory
		const facultyMap = new Map(faculties.map(f => [f.id, f]))
		const unitsMap = this.groupBy(units, 'course_id')
		const assessmentsMap = this.groupBy(assessments, 'course_id')
		const studyPlansMap = this.groupBy(studyPlans, 'course_id')

		const enrichedCourses = courses.map(course => ({
			...course,
			faculty: course.faculty_id ? (facultyMap.get(course.faculty_id) ?? null) : null,
			units: unitsMap.get(course.id) ?? [],
			assessments: assessmentsMap.get(course.id) ?? [],
			study_plans: studyPlansMap.get(course.id) ?? []
		}))

		return { courses: enrichedCourses as unknown as CourseWithRelations[], total }
	}

	static getCoursesByStudyPlan(studyPlanIds: number[]): Promise<Course[]> {
		return mysql
			.selectFrom(`${CourseTable._table} as c1`)
			.innerJoin(`${StudyPlanCourseTable._table} as spc1`, 'c1.id', 'spc1.course_id')
			.selectAll('c1')
			.where('spc1.study_plan_id', 'in', studyPlanIds)
			.where('c1.id', '=', eb =>
				eb
					.selectFrom(`${CourseTable._table} as c2`)
					.innerJoin(`${StudyPlanCourseTable._table} as spc2`, 'c2.id', 'spc2.course_id')
					.select(eb2 => eb2.fn.max('c2.id').as('id'))
					.where('spc2.study_plan_id', 'in', studyPlanIds)
					.whereRef('c2.ident', '=', 'c1.ident')
			)
			.execute()
	}

	static async countFilteredCourses(filters: Partial<CoursesFilter>): Promise<number> {
		const query = CourseFilterBuilder.buildFilterQuery(filters).select(eb => eb.fn.count<number>('c1.id').distinct().as('total'))

		const result = await query.executeTakeFirst()
		return result?.total ?? 0
	}

	static async fetchPaginatedCourseIds(filters: Partial<CoursesFilter>, limit: number, offset: number): Promise<number[]> {
		const results = await CourseFilterBuilder.buildFilterQuery(filters)
			.select('c1.id')
			.groupBy('c1.id')
			.orderBy(this.resolveSortColumn(filters.sort_by, 'c1'), filters.sort_dir ?? 'asc')
			.limit(limit)
			.offset(offset)
			.execute()

		return results.map(r => r.id)
	}

	static fetchCoursesByIds(ids: number[]) {
		return mysql
			.selectFrom(`${CourseTable._table} as c1`)
			.selectAll('c1')
			.where('c1.id', 'in', ids)
			.orderBy(sql`FIELD(c1.id, ${sql.join(ids)})`)
			.execute()
	}

	static fetchFacultiesByCourseIds(courseIds: number[]) {
		return mysql
			.selectFrom(`${FacultyTable._table} as f1`)
			.selectAll('f1')
			.where(
				'f1.id',
				'in',
				mysql.selectFrom(`${CourseTable._table} as c1`).select('c1.faculty_id').where('c1.id', 'in', courseIds).where('c1.faculty_id', 'is not', null)
			)
			.execute()
	}

	static async fetchUnitsWithSlotsByCourseIds(courseIds: number[]) {
		const units = await mysql
			.selectFrom(`${CourseUnitTable._table} as cu1`)
			.selectAll('cu1')
			.select(eb => [
				jsonArrayFrom(
					eb
						.selectFrom(`${CourseUnitSlotTable._table} as cus1`)
						.select([
							'cus1.id',
							'cus1.unit_id',
							'cus1.created_at',
							'cus1.updated_at',
							'cus1.type',
							'cus1.frequency',
							'cus1.date',
							'cus1.day',
							'cus1.time_from',
							'cus1.time_to',
							'cus1.location'
						])
						.whereRef('cus1.unit_id', '=', 'cu1.id')
				).as('slots')
			])
			.where('cu1.course_id', 'in', courseIds)
			.execute()

		return units.map(u => ({
			...u,
			slots: u.slots ?? []
		}))
	}

	static fetchAssessmentsByCourseIds(courseIds: number[]) {
		return mysql.selectFrom(`${CourseAssessmentTable._table} as ca1`).selectAll('ca1').where('ca1.course_id', 'in', courseIds).execute()
	}

	static fetchStudyPlanCoursesByCourseIds(courseIds: number[], studyPlanIds: number[]) {
		return mysql
			.selectFrom(`${StudyPlanCourseTable._table} as spc1`)
			.selectAll('spc1')
			.where('spc1.course_id', 'in', courseIds)
			.where('spc1.study_plan_id', 'in', studyPlanIds)
			.execute()
	}

	private static resolveSortColumn(sortBy?: string, tableAlias = 'c1'): ReturnType<typeof sql.ref> {
		const sortMap: Record<string, string> = {
			relevance: 'fts.relevance_score',
			ident: `${tableAlias}.ident`,
			title: `${tableAlias}.title`,
			ects: `${tableAlias}.ects`,
			faculty: `${tableAlias}.faculty_id`,
			year: `${tableAlias}.year`,
			semester: `${tableAlias}.semester`
		}

		const col = sortMap[sortBy ?? 'ident'] ?? `${tableAlias}.ident`
		return sql.ref(col)
	}

	private static groupBy<T, K extends keyof T>(array: T[], key: K): Map<T[K], T[]> {
		return array.reduce((map, item) => {
			const keyValue = item[key]
			const existing = map.get(keyValue) ?? []
			existing.push(item)
			map.set(keyValue, existing)
			return map
		}, new Map<T[K], T[]>())
	}
}
