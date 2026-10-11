import type {
	CourseFilter,
	CoursesFilter,
	CourseWithRelations,
	Database,
	Day,
	InSISSemester,
	MCPCourse,
	MCPCourseUnit,
	MCPCourseUnitSlot
} from '@kreditozrouti/types'
import type { Kysely } from 'kysely'
import { CourseQueryService } from '../course-search/CourseQueryService.js'

/** A single token that looks like a course code (`4IT101`, `TVSBAD`, `ON_TON`) rather than a word to search for. */
const IDENT_LIKE = /^(?=.*\d|[A-Z_]{3,}$)\w{3,12}$/

/** Highest ECTS value used when only a lower bound is given. */
const MAX_ECTS = 60

/**
 * Course lookup for the MCP server. It adapts MCP's small filter and flat output shape onto the shared
 * search in `course-search`, so MCP, the web app and the partner API answer "find courses" the same way.
 */
export default class CourseService {
	static async search(
		db: Kysely<Database>,
		filter: CourseFilter,
		limit = 20,
		offset = 0
	): Promise<{
		courses: MCPCourse[]
		total: number
	}> {
		const base = CourseService.toSearchFilter(filter)
		const text = filter.search?.trim()

		// Words go to ranked full-text search. Course codes are not in the full-text index, so a code-shaped
		// query uses the substring match on ident and title instead.
		const primary: Partial<CoursesFilter> = text ? (IDENT_LIKE.test(text) ? { ...base, title: text } : { ...base, search: text }) : base

		let result = await CourseQueryService.getCoursesWithRelations(db, primary, limit, offset)

		// Full-text search ignores very short words and unindexed terms; fall back to the substring match so a
		// query that used to find something does not start finding nothing.
		if (result.total === 0 && primary.search) {
			result = await CourseQueryService.getCoursesWithRelations(db, { ...base, title: text }, limit, offset)
		}

		const links = await CourseService.fetchStudyPlanLinks(
			db,
			result.courses.map(c => c.id)
		)

		return { courses: result.courses.map(course => CourseService.toMCPCourse(course, links.get(course.id) ?? [])), total: result.total }
	}

	static async getById(db: Kysely<Database>, id: number): Promise<MCPCourse | null> {
		const { courses } = await CourseService.search(db, { ids: [id] }, 1, 0)
		return courses[0] ?? null
	}

	static async getWithRelations(
		db: Kysely<Database>,
		filter: CourseFilter,
		limit: number,
		offset: number
	): Promise<{
		courses: MCPCourse[]
		total: number
	}> {
		return CourseService.search(db, filter, limit, offset)
	}

	/** MCP filter to the shared filter. `search` is handled by the caller. */
	private static toSearchFilter(filter: CourseFilter): Partial<CoursesFilter> {
		const mapped: Partial<CoursesFilter> = { sort_by: 'ident', sort_dir: 'asc' }

		if (filter.ids?.length) mapped.ids = filter.ids
		if (filter.idents?.length) mapped.idents = filter.idents
		if (filter.faculty_ids?.length) mapped.faculty_ids = filter.faculty_ids
		if (filter.semesters?.length) mapped.semesters = filter.semesters as InSISSemester[]
		if (filter.years?.length) mapped.years = filter.years
		if (filter.levels?.length) mapped.levels = filter.levels
		if (filter.languages?.length) mapped.languages = filter.languages
		if (filter.study_plan_ids?.length) mapped.study_plan_ids = filter.study_plan_ids

		// The shared filter takes a list of ECTS values; credits are whole numbers at VSE.
		if (filter.ects_min != null || filter.ects_max != null) {
			const min = Math.max(0, Math.ceil(filter.ects_min ?? 0))
			const max = Math.min(MAX_ECTS, Math.floor(filter.ects_max ?? MAX_ECTS))
			mapped.ects = max >= min ? Array.from({ length: max - min + 1 }, (_, i) => min + i) : []
			// An impossible range must match nothing, but an empty list means "no filter" downstream.
			if (!mapped.ects.length) mapped.ids = [-1]
		}

		return mapped
	}

	private static toMCPCourse(course: CourseWithRelations, studyPlans: MCPCourse['study_plans']): MCPCourse {
		return {
			id: course.id,
			faculty_id: course.faculty_id ?? null,
			ident: course.ident,
			title: course.title ?? null,
			title_cs: course.title_cs ?? null,
			title_en: course.title_en ?? null,
			aims_of_the_course: course.aims_of_the_course ?? null,
			aims_of_the_course_en: course.aims_of_the_course_en ?? null,
			learning_outcomes: course.learning_outcomes ?? null,
			learning_outcomes_en: course.learning_outcomes_en ?? null,
			course_contents: course.course_contents ?? null,
			course_contents_en: course.course_contents_en ?? null,
			literature_required: course.literature_required ?? null,
			literature_recommended: course.literature_recommended ?? null,
			special_requirements: course.special_requirements ?? null,
			ects: course.ects ?? null,
			mode_of_delivery: course.mode_of_delivery ?? null,
			mode_of_completion: course.mode_of_completion ?? null,
			languages: course.languages ?? null,
			level: course.level ?? null,
			year_of_study: course.year_of_study ?? null,
			semester: course.semester ?? null,
			year: course.year ?? null,
			faculty: course.faculty ? { id: course.faculty.id, title: course.faculty.title ?? null } : null,
			units: course.units.map(unit => CourseService.toMCPUnit(unit)),
			assessments: course.assessments.map(a => ({
				id: a.id,
				course_id: a.course_id,
				method: a.method ?? null,
				method_en: a.method_en ?? null,
				weight: a.weight ?? null
			})),
			study_plans: studyPlans
		}
	}

	private static toMCPUnit(unit: CourseWithRelations['units'][number]): MCPCourseUnit {
		return {
			id: unit.id,
			course_id: unit.course_id,
			lecturer: unit.lecturer ?? null,
			capacity: unit.capacity ?? null,
			note: unit.note ?? null,
			slots: unit.slots.map((slot): MCPCourseUnitSlot => ({
				id: slot.id,
				unit_id: slot.unit_id,
				// The shared query already normalised the slot type and day; only the row typing is wider.
				type: slot.type as MCPCourseUnitSlot['type'],
				frequency: slot.frequency ?? null,
				date: slot.date ?? null,
				day: slot.day as Day | null,
				time_from: slot.time_from,
				time_to: slot.time_to,
				location: slot.location ?? null
			}))
		}
	}

	private static async fetchStudyPlanLinks(db: Kysely<Database>, courseIds: number[]): Promise<Map<number, MCPCourse['study_plans']>> {
		if (!courseIds.length) return new Map()
		const rows = await db
			.selectFrom('insis_study_plans_courses as spc')
			.innerJoin('insis_courses as c', 'c.ident', 'spc.course_ident')
			.select(['spc.id', 'spc.study_plan_id', 'spc.course_ident', 'spc.group', 'spc.category', 'c.id as course_id'])
			.where('c.id', 'in', courseIds)
			.execute()
		const map = new Map<number, MCPCourse['study_plans']>()
		for (const row of rows) {
			const arr = map.get(row.course_id) ?? []
			arr.push({
				id: row.id,
				study_plan_id: row.study_plan_id,
				course_ident: row.course_ident,
				group: row.group ?? null,
				category: row.category ?? null
			})
			map.set(row.course_id, arr)
		}
		return map
	}
}
