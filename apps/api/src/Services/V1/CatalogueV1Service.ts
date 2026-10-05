import type { CoursesQuery, LecturersQuery, PeriodsQuery, StudyPlansQuery } from '@api/Controllers/V1/schemas'
import type {
	CoursesFilter,
	PublicCourse,
	PublicCourseDetail,
	PublicFaculty,
	PublicLecturer,
	PublicLecturerDetail,
	PublicLecturerRef,
	PublicPage,
	PublicPeriod,
	PublicStudyPlan,
	PublicStudyPlanDetail
} from '@kreditozrouti/types'
import { timeToMinutes } from '@kreditozrouti/core/domain'
import { mysql } from '@api/clients'
import {
	AcademicPeriodTable,
	CourseLecturerTable,
	CourseTable,
	FacultyTable,
	LecturerTable,
	StudyPlanCourseIdentTable,
	StudyPlanTable
} from '@api/Database/types'
import CourseService from '@api/Services/CourseService'
import { PublicMapper } from './PublicMapper'
import { VisibilityService } from './VisibilityService'

function emptyPage<T>(limit: number, offset: number): PublicPage<T> {
	return { data: [], meta: { total: 0, limit, offset } }
}

function datetimeToIso(value: Date | string): string {
	return (value instanceof Date ? value : new Date(value)).toISOString()
}

async function lecturerRefsByCourse(courseIds: number[]): Promise<Map<number, PublicLecturerRef[]>> {
	const result = new Map<number, PublicLecturerRef[]>()
	if (courseIds.length === 0) return result

	const rows = await mysql
		.selectFrom(`${CourseLecturerTable._table} as cl`)
		.innerJoin(`${LecturerTable._table} as l`, 'l.id', 'cl.lecturer_id')
		.select(['cl.course_id', 'l.id', 'l.name', 'cl.role'])
		.where('cl.course_id', 'in', courseIds)
		.orderBy('cl.role', 'desc')
		.orderBy('l.name', 'asc')
		.execute()

	for (const row of rows) {
		const refs = result.get(row.course_id) ?? []
		refs.push({ id: row.id, name: row.name, role: row.role })
		result.set(row.course_id, refs)
	}
	return result
}

/**
 * Read-only catalogue behind `/v1`. Every query goes through `VisibilityService`, so a faculty InSIS does not
 * publish never leaks through a side door such as a lecturer's course list.
 *
 * An empty visible-faculty list must short-circuit to an empty result: the internal filter treats an empty
 * `faculty_ids` as "no filter" and would otherwise return everything.
 */
export const CatalogueV1Service = {
	async listCourses(query: CoursesQuery, includeLecturers: boolean): Promise<PublicPage<PublicCourse>> {
		const empty = emptyPage<PublicCourse>(query.limit, query.offset)

		const facultyIds = await VisibilityService.restrict(query.faculty)
		if (facultyIds.length === 0) return empty

		const filters: Partial<CoursesFilter> = { faculty_ids: facultyIds }

		if (query.year !== undefined) filters.years = [query.year]
		if (query.semester) filters.semesters = [query.semester]
		if (query.level.length) filters.levels = query.level
		if (query.language.length) filters.languages = query.language
		if (query.q) filters.search = query.q
		if (query.study_plan_id) filters.study_plan_ids = [query.study_plan_id]

		if (query.ects_min !== undefined || query.ects_max !== undefined) {
			const min = query.ects_min ?? 0
			const max = query.ects_max ?? 60
			filters.ects = Array.from({ length: max - min + 1 }, (_, i) => min + i)
		}

		if (query.day) {
			filters.include_times = [
				{ day: query.day, time_from: timeToMinutes(query.time_from ?? '00:00') ?? 0, time_to: timeToMinutes(query.time_to ?? '23:59') ?? 1439 }
			]
		}

		if (query.lecturer_id) {
			const rows = await mysql.selectFrom(CourseLecturerTable._table).select('course_id').where('lecturer_id', '=', query.lecturer_id).execute()
			if (rows.length === 0) return empty
			filters.ids = rows.map(r => r.course_id)
		}

		filters.sort_by = query.sort
		filters.sort_dir = query.order

		const { courses, total } = await CourseService.getCoursesWithRelations(filters, query.limit, query.offset)
		const lecturers = includeLecturers ? await lecturerRefsByCourse(courses.map(c => c.id)) : null

		return {
			data: courses.map(course => PublicMapper.course(course, lecturers ? (lecturers.get(course.id) ?? []) : undefined)),
			meta: { total, limit: query.limit, offset: query.offset }
		}
	},

	async getCourse(id: number, includeLecturers: boolean): Promise<PublicCourseDetail | null> {
		const facultyIds = await VisibilityService.visibleFacultyIds()
		if (facultyIds.length === 0) return null

		const { courses } = await CourseService.getCoursesWithRelations({ ids: [id], faculty_ids: facultyIds }, 1, 0)
		const course = courses[0]
		if (!course) return null

		const lecturers = includeLecturers ? ((await lecturerRefsByCourse([course.id])).get(course.id) ?? []) : undefined
		return PublicMapper.courseDetail(course, lecturers)
	},

	async listLecturers(query: LecturersQuery): Promise<PublicPage<PublicLecturer>> {
		const facultyIds = await VisibilityService.visibleFacultyIds()
		if (facultyIds.length === 0) return emptyPage(query.limit, query.offset)

		const base = mysql
			.selectFrom(`${LecturerTable._table} as l`)
			.innerJoin(`${CourseLecturerTable._table} as cl`, 'cl.lecturer_id', 'l.id')
			.innerJoin(`${CourseTable._table} as c`, 'c.id', 'cl.course_id')
			.where('c.faculty_id', 'in', facultyIds)
			.$if(!!query.q, qb => qb.where('l.name', 'like', `%${query.q}%`))

		const [totalRow, rows] = await Promise.all([
			base.select(eb => eb.fn.count<number>('l.id').distinct().as('total')).executeTakeFirst(),
			base.select(['l.id', 'l.name']).distinct().orderBy('l.name', 'asc').limit(query.limit).offset(query.offset).execute()
		])

		return { data: rows.map(r => ({ id: r.id, name: r.name })), meta: { total: Number(totalRow?.total ?? 0), limit: query.limit, offset: query.offset } }
	},

	async getLecturer(id: number): Promise<PublicLecturerDetail | null> {
		const facultyIds = await VisibilityService.visibleFacultyIds()
		if (facultyIds.length === 0) return null

		const lecturer = await mysql.selectFrom(LecturerTable._table).select(['id', 'name']).where('id', '=', id).executeTakeFirst()
		if (!lecturer) return null

		const courses = await mysql
			.selectFrom(`${CourseLecturerTable._table} as cl`)
			.innerJoin(`${CourseTable._table} as c`, 'c.id', 'cl.course_id')
			.select(['c.id', 'c.ident', 'c.title', 'c.year', 'c.semester', 'cl.role'])
			.where('cl.lecturer_id', '=', id)
			.where('c.faculty_id', 'in', facultyIds)
			.orderBy('c.year', 'desc')
			.orderBy('c.ident', 'asc')
			.execute()

		// A lecturer who only teaches at hidden faculties does not exist as far as the partner API is concerned.
		if (courses.length === 0) return null

		return { id: lecturer.id, name: lecturer.name, courses }
	},

	async listFaculties(): Promise<{ data: PublicFaculty[] }> {
		const facultyIds = await VisibilityService.visibleFacultyIds()
		if (facultyIds.length === 0) return { data: [] }

		const rows = await mysql.selectFrom(FacultyTable._table).select(['id', 'title']).where('id', 'in', facultyIds).orderBy('id', 'asc').execute()
		return { data: rows }
	},

	async listPeriods(query: PeriodsQuery): Promise<{ data: PublicPeriod[] }> {
		const facultyIds = await VisibilityService.restrict(query.faculty)
		if (facultyIds.length === 0) return { data: [] }

		const rows = await mysql
			.selectFrom(AcademicPeriodTable._table)
			.select(['faculty_id', 'year', 'semester', 'level', 'starts_at', 'ends_at'])
			.where('faculty_id', 'in', facultyIds)
			.$if(query.year !== undefined, qb => qb.where('year', '=', query.year!))
			.$if(!!query.semester, qb => qb.where('semester', '=', query.semester!))
			.orderBy('year', 'desc')
			.orderBy('faculty_id', 'asc')
			.execute()

		return {
			data: rows.map(r => ({
				faculty_id: r.faculty_id,
				year: r.year,
				semester: r.semester,
				level: r.level,
				starts_at: datetimeToIso(r.starts_at),
				ends_at: datetimeToIso(r.ends_at)
			}))
		}
	},

	async listStudyPlans(query: StudyPlansQuery): Promise<PublicPage<PublicStudyPlan>> {
		const facultyIds = await VisibilityService.restrict(query.faculty)
		if (facultyIds.length === 0) return emptyPage(query.limit, query.offset)

		const base = mysql
			.selectFrom(StudyPlanTable._table)
			.where('faculty_id', 'in', facultyIds)
			.$if(query.year !== undefined, qb => qb.where('year', '=', query.year!))
			.$if(!!query.semester, qb => qb.where('semester', '=', query.semester!))
			.$if(query.level.length > 0, qb => qb.where('level', 'in', query.level))

		const [totalRow, rows] = await Promise.all([
			base.select(eb => eb.fn.countAll<number>().as('total')).executeTakeFirst(),
			base.selectAll().orderBy('ident', 'asc').orderBy('id', 'asc').limit(query.limit).offset(query.offset).execute()
		])

		return { data: rows.map(row => PublicMapper.studyPlan(row)), meta: { total: Number(totalRow?.total ?? 0), limit: query.limit, offset: query.offset } }
	},

	async getStudyPlan(id: number): Promise<PublicStudyPlanDetail | null> {
		const facultyIds = await VisibilityService.visibleFacultyIds()
		if (facultyIds.length === 0) return null

		const plan = await mysql.selectFrom(StudyPlanTable._table).selectAll().where('id', '=', id).where('faculty_id', 'in', facultyIds).executeTakeFirst()
		if (!plan) return null

		const courses = await mysql
			.selectFrom(StudyPlanCourseIdentTable._table)
			.select(['course_ident', 'group', 'category'])
			.where('study_plan_id', '=', id)
			.orderBy('course_ident', 'asc')
			.execute()

		return { ...PublicMapper.studyPlan(plan), courses: courses.map(c => ({ ident: c.course_ident, group: c.group, category: c.category })) }
	}
}
