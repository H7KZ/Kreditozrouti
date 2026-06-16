import type { ScraperInSISStudyPlanResponseJob } from '@shared/queue/jobs'
import { priorityOf } from '@shared/domain/studyPlan'
import { sql } from 'kysely'
import { mysql } from '@api/clients'
import LoggerJobContext from '@api/Context/LoggerJobContext'
import { NewStudyPlanCourseIdent, StudyPlanCourseIdentTable, StudyPlanCourseTable, StudyPlanTable } from '@api/Database/types'
import { insertFacultiesBatch } from '@api/Jobs/helpers'

export default async function ScraperResponseInSISStudyPlanJob(data: ScraperInSISStudyPlanResponseJob): Promise<void> {
	const { plan } = data

	if (!plan) return

	const facultyId = plan.faculty?.ident ?? null

	if (!plan.ident || !facultyId || !plan.semester || !plan.year) {
		LoggerJobContext.add({
			error: 'Missing required metadata (ident, faculty, semester, or year) for study plan resolution',
			plan_ident: plan.ident
		})
		return
	}

	await insertFacultiesBatch(mysql, [facultyId])

	const planMetadata = {
		url: plan.url,
		title: plan.title,
		level: plan.level,
		mode_of_study: plan.mode_of_study,
		study_length: plan.study_length
	}

	await mysql
		.insertInto(StudyPlanTable._table)
		.values({
			ident: plan.ident,
			faculty_id: facultyId,
			semester: plan.semester,
			year: plan.year,
			...planMetadata
		})
		.onDuplicateKeyUpdate(planMetadata)
		.execute()

	const planRow = await mysql
		.selectFrom(StudyPlanTable._table)
		.select('id')
		.where('ident', '=', plan.ident)
		.where('faculty_id', '=', facultyId)
		.where('semester', '=', plan.semester)
		.where('year', '=', plan.year)
		.executeTakeFirstOrThrow()

	const studyPlanId = planRow.id

	LoggerJobContext.add({
		study_plan_id: studyPlanId,
		study_plan_ident: plan.ident
	})

	if (!plan.courses || plan.courses.length === 0) {
		await mysql.deleteFrom(StudyPlanCourseIdentTable._table).where('study_plan_id', '=', studyPlanId).execute()
		await mysql.deleteFrom(StudyPlanCourseTable._table).where('study_plan_id', '=', studyPlanId).execute()
		return
	}

	const bestByCourseIdent = new Map<string, NewStudyPlanCourseIdent>()
	for (const item of plan.courses) {
		const candidate: NewStudyPlanCourseIdent = {
			study_plan_id: studyPlanId,
			course_ident: item.ident,
			group: item.group,
			category: item.category
		}
		const existing = bestByCourseIdent.get(item.ident)
		if (!existing || priorityOf(item.group, item.category) < priorityOf(existing.group, existing.category)) {
			bestByCourseIdent.set(item.ident, candidate)
		}
	}
	const rowsToInsert = [...bestByCourseIdent.values()]

	// Fetch existing rows for this plan
	const existingRows = await mysql
		.selectFrom(StudyPlanCourseIdentTable._table)
		.select(['id', 'course_ident', 'group', 'category'])
		.where('study_plan_id', '=', studyPlanId)
		.execute()

	if (rowsToInsert.length > 0) {
		await mysql
			.insertInto(StudyPlanCourseIdentTable._table)
			.values(rowsToInsert)
			.onDuplicateKeyUpdate({
				group: sql`VALUES(\`group\`)`, // group is a MySQL reserved word — must be escaped in VALUES()
				category: sql`VALUES(category)`
			})
			.execute()
	}

	// DELETE only the specific IDs no longer in the plan — point locks, not a range lock
	const newIdents = new Set(rowsToInsert.map(r => r.course_ident))
	const staleIdents = existingRows.filter(e => !newIdents.has(e.course_ident))
	const toDeleteIds = staleIdents.map(e => e.id)
	const toDeleteIdents = staleIdents.map(e => e.course_ident)

	if (toDeleteIds.length > 0) {
		await mysql.deleteFrom(StudyPlanCourseIdentTable._table).where('id', 'in', toDeleteIds).execute()
		await mysql.deleteFrom(StudyPlanCourseTable._table).where('study_plan_id', '=', studyPlanId).where('course_ident', 'in', toDeleteIdents).execute()
	}

	LoggerJobContext.add({
		incoming_course_count: rowsToInsert.length,
		deleted_course_count: toDeleteIds.length
	})
}
