import { mysql } from '@api/clients'
import CoursesFilter from '@api/Interfaces/CoursesFilter'
import { sql } from 'kysely'

/**
 * Service responsible for retrieving Course data from the InSIS database.
 * This service implements a "Faceted Search" architecture. It provides methods
 * to fetch the actual data (`getCourses`) as well as the available filter options
 * (`getFacets`) based on the current search context.
 */
export default class InSISService {
    /**
     * Retrieves a paginated list of courses that match the provided filters.
     * @remarks
     * Results are cached in Redis to improve performance.
     * Because the courses are joined with timetable slots (1:N relationship),
     * this method uses `groupBy('c.id')` to ensure that a unique list of courses
     * is returned, rather than duplicate rows for every scheduled slot.
     * @param filters - The criteria to filter courses by (semester, day, lecturer, etc.).
     * @param limit - The maximum number of results to return (default: 20).
     * @param offset - The number of results to skip for pagination (default: 0).
     * @returns A Promise resolving to an array of course records.
     */
    static async getCourses(filters: CoursesFilter, limit = 20, offset = 0) {
        const query = this.getBaseQuery(filters).selectAll('c').groupBy('c.id').limit(limit).offset(offset)
        return await query.execute()
    }

    /**
     * Retrieves the available options (facets) for all filter categories based on the current selection.
     * @remarks
     * Results are cached in Redis to improve performance.
     * This method executes multiple aggregation queries in parallel using `Promise.all`.
     * Each facet query calculates counts for its specific category while adhering to
     * all *other* active filters.
     * @param filters - The currently active filters.
     * @returns An object containing arrays of available options for every filter type and the min/max time range.
     */
    static async getFacets(filters: CoursesFilter) {
        const [faculties, departments, days, lecturersRaw, languagesRaw, levels, semesters, time_range] = await Promise.all([
            this.getFacultyFacet(filters),
            this.getDepartmentFacet(filters),
            this.getDayFacet(filters),
            this.getLecturerFacet(filters),
            this.getLanguageFacet(filters),
            this.getLevelFacet(filters),
            this.getSemesterFacet(filters),
            this.getTimeRangeFacet(filters)
        ])

        const lecturers = this.processPipeFacet(lecturersRaw, 50)
        const languages = this.processPipeFacet(languagesRaw)

        return {
            faculties,
            departments,
            days,
            lecturers,
            languages,
            levels,
            semesters,
            time_range
        }
    }

    private static processPipeFacet(data: { value: string | null; count: number }[], limit?: number) {
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

    private static async getFacultyFacet(filters: CoursesFilter) {
        return await this.getBaseQuery(filters, 'faculty')
            .select(sql<string>`SUBSTRING(c.ident, 1, 1)`.as('value'))
            .select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
            .where('c.ident', 'is not', null)
            .groupBy(sql`SUBSTRING(c.ident, 1, 1)`)
            .orderBy('value')
            .execute()
    }

    private static async getDepartmentFacet(filters: CoursesFilter) {
        return await this.getBaseQuery(filters, 'ident')
            .select(sql<string>`SUBSTRING(c.ident, 1, 3)`.as('value'))
            .select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
            .where('c.ident', 'is not', null)
            .groupBy(sql`SUBSTRING(c.ident, 1, 3)`)
            .orderBy('count', 'desc')
            .limit(20)
            .execute()
    }

    private static async getDayFacet(filters: CoursesFilter) {
        return await this.getBaseQuery(filters, 'day')
            .select('s.day as value')
            .select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
            .where('s.day', 'is not', null)
            .groupBy('s.day')
            .orderBy('value')
            .execute()
    }

    private static async getLecturerFacet(filters: CoursesFilter) {
        return await this.getBaseQuery(filters, 'lecturer')
            .select(sql<string>`COALESCE(u.lecturer, c.lecturers)`.as('value'))
            .select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
            .where(sql`COALESCE(u.lecturer, c.lecturers)`, 'is not', null)
            .groupBy(sql`COALESCE(u.lecturer, c.lecturers)`)
            .orderBy('count', 'desc')
            .limit(50)
            .execute()
    }

    private static async getLanguageFacet(filters: CoursesFilter) {
        return await this.getBaseQuery(filters, 'language')
            .select('c.languages as value')
            .select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
            .where('c.languages', 'is not', null)
            .groupBy('c.languages')
            .orderBy('count', 'desc')
            .execute()
    }

    private static async getLevelFacet(filters: CoursesFilter) {
        return await this.getBaseQuery(filters, 'level')
            .select('c.level as value')
            .select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
            .where('c.level', 'is not', null)
            .groupBy('c.level')
            .orderBy('value')
            .execute()
    }

    private static async getSemesterFacet(filters: CoursesFilter) {
        return await this.getBaseQuery(filters, 'semester')
            .select('c.semester as value')
            .select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
            .where('c.semester', 'is not', null)
            .groupBy('c.semester')
            .orderBy('value', 'desc')
            .execute()
    }

    private static async getTimeRangeFacet(filters: CoursesFilter) {
        const result = await this.getBaseQuery(filters, 'time_from')
            .select(eb => [eb.fn.min<number>('s.time_from_minutes').as('min_time'), eb.fn.max<number>('s.time_to_minutes').as('max_time')])
            .executeTakeFirst()

        return {
            min_time: result?.min_time ?? 0,
            max_time: result?.max_time ?? 1440
        }
    }

    private static getBaseQuery(filters: CoursesFilter, ignore?: keyof CoursesFilter) {
        let query = mysql
            .selectFrom('insis_courses as c')
            .leftJoin('insis_courses_timetable_units as u', 'c.id', 'u.course_id')
            .leftJoin('insis_courses_timetable_slots as s', 'u.id', 's.timetable_unit_id')

        // Helper to normalize strings or arrays into a single array
        const toArray = (val: string | string[]) => (Array.isArray(val) ? val : [val])

        // 1. Semester (Exact Match / IN)
        if (filters.semester && ignore !== 'semester') {
            const vals = toArray(filters.semester)
            if (vals.length) query = query.where('c.semester', 'in', vals)
        }

        // 2. Ident/Course Code (Partial Match / LIKE OR)
        if (filters.ident && ignore !== 'ident') {
            const vals = toArray(filters.ident)
            if (vals.length) {
                query = query.where(eb => eb.or(vals.map(v => eb('c.ident', 'like', `%${v}%`))))
            }
        }

        // 3. Faculty (Prefix Match / LIKE OR)
        // Faculty is derived from the first digit of the ident, so we match the prefix.
        if (filters.faculty && ignore !== 'faculty') {
            const vals = toArray(filters.faculty)
            if (vals.length) {
                query = query.where(eb => eb.or(vals.map(v => eb('c.ident', 'like', `${v}%`))))
            }
        }

        // 4. Lecturer (Partial Match on Course OR Unit / LIKE OR)
        // Matches if ANY of the search terms appear in EITHER c.lecturers OR u.lecturer
        if (filters.lecturer && ignore !== 'lecturer') {
            const vals = toArray(filters.lecturer)
            if (vals.length) {
                query = query.where(eb => eb.or(vals.flatMap(v => [eb('c.lecturers', 'like', `%${v}%`), eb('u.lecturer', 'like', `%${v}%`)])))
            }
        }

        // 5. Day (Exact Match / IN)
        if (filters.day && ignore !== 'day') {
            const vals = toArray(filters.day)
            if (vals.length) query = query.where('s.day', 'in', vals)
        }

        // 6. Time Range (Numeric Range)
        const ignoreTime = ignore === 'time_from' || ignore === 'time_to'
        if (filters.time_from && !ignoreTime) {
            query = query.where('s.time_from_minutes', '>=', filters.time_from)
        }
        if (filters.time_to && !ignoreTime) {
            query = query.where('s.time_to_minutes', '<=', filters.time_to)
        }

        // 7. Language (Partial Match / LIKE OR)
        if (filters.language && ignore !== 'language') {
            const vals = toArray(filters.language)
            if (vals.length) {
                query = query.where(eb => eb.or(vals.map(v => eb('c.languages', 'like', `%${v}%`))))
            }
        }

        // 8. Level (Exact Match / IN)
        if (filters.level && ignore !== 'level') {
            const vals = toArray(filters.level)
            if (vals.length) query = query.where('c.level', 'in', vals)
        }

        return query
    }
}
