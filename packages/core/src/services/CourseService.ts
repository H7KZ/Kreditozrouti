import type { Kysely } from 'kysely'
import type { Database } from '../db/index.js'
import type { CourseFilter, MCPCourse, MCPCourseAssessment, MCPCourseUnit, MCPCourseUnitSlot } from '@kreditozrouti/types'
import type { Day } from '../domain/constants.js'
import type { CourseUnitType, InSISSemester } from '../domain/insis.js'
import { sql } from 'kysely'
import { getSlotType } from '../domain/insis.js'

const INSIS_DAY_NORM: Record<string, Day> = {
  Po: 'monday', Ut: 'tuesday', St: 'wednesday', Ct: 'thursday', Pa: 'friday',
  Monday: 'monday', Tuesday: 'tuesday', Wednesday: 'wednesday', Thursday: 'thursday', Friday: 'friday'
}

export default class CourseService {
  static async search(db: Kysely<Database>, filter: CourseFilter, limit = 20, offset = 0): Promise<{ courses: MCPCourse[]; total: number }> {
    const { ids, total } = await CourseService.fetchCourseIds(db, filter, limit, offset)
    if (!ids.length) return { courses: [], total }

    const [courseRows, unitsByCourse, assessmentsByCourse, studyPlanLinks] = await Promise.all([
      CourseService.fetchCourseRows(db, ids),
      CourseService.fetchUnitsWithSlots(db, ids),
      CourseService.fetchAssessments(db, ids),
      CourseService.fetchStudyPlanLinks(db, ids)
    ])

    const facultyIds = [...new Set(courseRows.map(c => c.faculty_id).filter(Boolean) as string[])]
    const facultyMap = await CourseService.fetchFacultiesByIds(db, facultyIds)

    const courses: MCPCourse[] = courseRows.map(c => ({
      id: c.id,
      faculty_id: c.faculty_id ?? null,
      ident: c.ident,
      title: c.title ?? null,
      title_cs: c.title_cs ?? null,
      title_en: c.title_en ?? null,
      aims_of_the_course: c.aims_of_the_course ?? null,
      aims_of_the_course_en: c.aims_of_the_course_en ?? null,
      learning_outcomes: c.learning_outcomes ?? null,
      learning_outcomes_en: c.learning_outcomes_en ?? null,
      course_contents: c.course_contents ?? null,
      course_contents_en: c.course_contents_en ?? null,
      literature_required: c.literature_required ?? null,
      literature_recommended: c.literature_recommended ?? null,
      special_requirements: c.special_requirements ?? null,
      ects: c.ects ?? null,
      mode_of_delivery: c.mode_of_delivery ?? null,
      mode_of_completion: c.mode_of_completion ?? null,
      languages: c.languages ?? null,
      level: c.level ?? null,
      year_of_study: c.year_of_study ?? null,
      semester: c.semester ?? null,
      year: c.year ?? null,
      faculty: c.faculty_id ? (facultyMap.get(c.faculty_id) ?? null) : null,
      units: unitsByCourse.get(c.id) ?? [],
      assessments: assessmentsByCourse.get(c.id) ?? [],
      study_plans: studyPlanLinks.get(c.id) ?? []
    }))

    return { courses, total }
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
  ): Promise<{ courses: MCPCourse[]; total: number }> {
    return CourseService.search(db, filter, limit, offset)
  }

  private static normalizeDay(raw: string | null): Day | null {
    if (!raw) return null
    return INSIS_DAY_NORM[raw] ?? (raw as Day)
  }

  private static buildSlot(row: {
    id: number; unit_id: number; type: string | null; frequency: string | null
    date: string | null; day: string | null; time_from: number | null; time_to: number | null; location: string | null
  }): MCPCourseUnitSlot {
    return {
      id: row.id,
      unit_id: row.unit_id,
      type: getSlotType(row) as CourseUnitType | null,
      frequency: (row.frequency as MCPCourseUnitSlot['frequency']) ?? null,
      date: row.date ?? null,
      day: CourseService.normalizeDay(row.day),
      time_from: row.time_from,
      time_to: row.time_to,
      location: row.location ?? null
    }
  }

  private static async fetchCourseIds(db: Kysely<Database>, filter: CourseFilter, limit: number, offset: number): Promise<{ ids: number[]; total: number }> {
    let baseQuery = db.selectFrom('insis_courses')
    if (filter.ids?.length) baseQuery = baseQuery.where('id', 'in', filter.ids)
    if (filter.idents?.length) baseQuery = baseQuery.where('ident', 'in', filter.idents)
    if (filter.faculty_ids?.length) baseQuery = baseQuery.where('faculty_id', 'in', filter.faculty_ids)
    if (filter.semesters?.length) baseQuery = baseQuery.where('semester', 'in', filter.semesters as InSISSemester[])
    if (filter.years?.length) baseQuery = baseQuery.where('year', 'in', filter.years)
    if (filter.levels?.length) baseQuery = baseQuery.where('level', 'in', filter.levels)
    if (filter.ects_min != null) baseQuery = baseQuery.where('ects', '>=', filter.ects_min)
    if (filter.ects_max != null) baseQuery = baseQuery.where('ects', '<=', filter.ects_max)
    if (filter.search) {
      const like = `%${filter.search}%`
      baseQuery = baseQuery.where(eb =>
        eb.or([eb('ident', 'like', like), eb('title', 'like', like), eb('title_cs', 'like', like), eb('title_en', 'like', like)])
      )
    }
    if (filter.languages?.length) {
      for (const lang of filter.languages) {
        baseQuery = baseQuery.where(sql<boolean>`FIND_IN_SET(${lang}, REPLACE(languages, '|', ',')) > 0`)
      }
    }
    if (filter.study_plan_ids?.length) {
      baseQuery = baseQuery.where(eb =>
        eb.exists(
          eb.selectFrom('insis_study_plans_courses as spc')
            .innerJoin('insis_study_plans as sp', 'sp.id', 'spc.study_plan_id')
            .whereRef('spc.course_ident', '=', 'insis_courses.ident')
            .where('sp.id', 'in', filter.study_plan_ids!)
            .select('spc.id')
        )
      )
    }
    const [countRow, rows] = await Promise.all([
      baseQuery.select(eb => eb.fn.countAll<number>().as('n')).executeTakeFirstOrThrow(),
      baseQuery.select('id').orderBy('id', 'asc').limit(limit).offset(offset).execute()
    ])
    return { ids: rows.map(r => r.id), total: Number(countRow.n) }
  }

  private static async fetchCourseRows(db: Kysely<Database>, ids: number[]) {
    if (!ids.length) return []
    return db.selectFrom('insis_courses').selectAll().where('id', 'in', ids).execute()
  }

  private static async fetchFacultiesByIds(db: Kysely<Database>, ids: string[]): Promise<Map<string, { id: string; title: string | null }>> {
    if (!ids.length) return new Map()
    const rows = await db.selectFrom('insis_faculties').select(['id', 'title']).where('id', 'in', ids).execute()
    return new Map(rows.map(r => [r.id, r]))
  }

  private static async fetchUnitsWithSlots(db: Kysely<Database>, courseIds: number[]): Promise<Map<number, MCPCourseUnit[]>> {
    if (!courseIds.length) return new Map()
    const [unitRows, slotRows] = await Promise.all([
      db.selectFrom('insis_courses_units').selectAll().where('course_id', 'in', courseIds).execute(),
      db.selectFrom('insis_courses_units_slots').selectAll()
        .where('unit_id', 'in', db.selectFrom('insis_courses_units').select('id').where('course_id', 'in', courseIds))
        .execute()
    ])
    const slotsByUnit = new Map<number, MCPCourseUnitSlot[]>()
    for (const slot of slotRows) {
      const arr = slotsByUnit.get(slot.unit_id) ?? []
      arr.push(CourseService.buildSlot(slot))
      slotsByUnit.set(slot.unit_id, arr)
    }
    const unitsByCourse = new Map<number, MCPCourseUnit[]>()
    for (const unit of unitRows) {
      const u: MCPCourseUnit = {
        id: unit.id, course_id: unit.course_id, lecturer: unit.lecturer ?? null,
        capacity: unit.capacity ?? null, note: unit.note ?? null,
        slots: slotsByUnit.get(unit.id) ?? []
      }
      const arr = unitsByCourse.get(unit.course_id) ?? []
      arr.push(u)
      unitsByCourse.set(unit.course_id, arr)
    }
    return unitsByCourse
  }

  private static async fetchAssessments(db: Kysely<Database>, courseIds: number[]): Promise<Map<number, MCPCourseAssessment[]>> {
    if (!courseIds.length) return new Map()
    const rows = await db.selectFrom('insis_courses_assessments').selectAll().where('course_id', 'in', courseIds).execute()
    const map = new Map<number, MCPCourseAssessment[]>()
    for (const row of rows) {
      const arr = map.get(row.course_id) ?? []
      arr.push({ id: row.id, course_id: row.course_id, method: row.method ?? null, method_en: row.method_en ?? null, weight: row.weight ?? null })
      map.set(row.course_id, arr)
    }
    return map
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
      arr.push({ id: row.id, study_plan_id: row.study_plan_id, course_ident: row.course_ident, group: row.group ?? null, category: row.category ?? null })
      map.set(row.course_id, arr)
    }
    return map
  }
}
