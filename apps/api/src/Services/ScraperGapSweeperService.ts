import { mysql } from '@api/clients'
import { CourseTable, StudyPlanCourseIdentTable } from '@api/Database/types'

/**
 * DB-only gap detection. Returns distinct course_idents that exist in
 * insis_study_plans_course_idents but have no corresponding insis_courses row.
 *
 * Safe to import from bullmq.ts — does NOT import from @api/bullmq.
 */
export default class ScraperGapSweeperService {
	static async getMissingIdents(): Promise<string[]> {
		const rows = await mysql
			.selectFrom(`${StudyPlanCourseIdentTable._table} as sci`)
			.leftJoin(`${CourseTable._table} as ic`, 'ic.ident', 'sci.course_ident')
			.select('sci.course_ident')
			.where('ic.id', 'is', null)
			.distinct()
			.execute()

		return rows.map(r => r.course_ident)
	}
}
