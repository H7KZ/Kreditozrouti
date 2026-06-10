import type { ScraperInSISStudyPlanResponseJob } from '@shared/queue/jobs'
import { mysql } from '@api/clients'
import LoggerJobContext from '@api/Context/LoggerJobContext'
import { CourseTable, NewStudyPlanCourse, StudyPlanCourseTable, StudyPlanTable } from '@api/Database/types'
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
		await mysql.deleteFrom(StudyPlanCourseTable._table).where('study_plan_id', '=', studyPlanId).execute()
		return
	}

	const incomingCourseIdents = plan.courses.map(c => c.ident)

	const identToIdMap = new Map<string, number>()

	if (incomingCourseIdents.length > 0) {
		const identMatches = await mysql
			.selectFrom(CourseTable._table)
			.select(['id', 'ident'])
			.where('ident', 'in', incomingCourseIdents)
			.where('semester', '=', plan.semester)
			.where('year', '=', plan.year)
			.execute()

		for (const c of identMatches) {
			if (c.ident) identToIdMap.set(c.ident, c.id)
		}
	}

	const seen = new Set<string>()
	const rowsToInsert: NewStudyPlanCourse[] = []
	for (const item of plan.courses) {
		const key = `${item.ident}|${item.group}|${item.category}`
		if (seen.has(key)) continue
		seen.add(key)
		rowsToInsert.push({
			study_plan_id: studyPlanId,
			course_ident: item.ident,
			course_id: identToIdMap.get(item.ident) ?? null,
			group: item.group,
			category: item.category
		})
	}

	// Fetch existing rows for this plan
	const existing = await mysql
		.selectFrom(StudyPlanCourseTable._table)
		.select(['id', 'course_ident', 'group', 'category'])
		.where('study_plan_id', '=', studyPlanId)
		.execute()

	// INSERT IGNORE new rows — insert intention locks only, no range lock
	if (rowsToInsert.length > 0) {
		await mysql.insertInto(StudyPlanCourseTable._table).ignore().values(rowsToInsert).execute()
	}

	// DELETE only the specific IDs no longer in the plan — point locks, not a range lock
	const newKeys = new Set(rowsToInsert.map(r => `${r.course_ident}|${r.group}|${r.category}`))
	const toDeleteIds = existing
		.filter(e => !newKeys.has(`${e.course_ident}|${e.group}|${e.category}`))
		.map(e => e.id)

	if (toDeleteIds.length > 0) {
		await mysql.deleteFrom(StudyPlanCourseTable._table).where('id', 'in', toDeleteIds).execute()
	}

	LoggerJobContext.add({
		course_count: rowsToInsert.length
	})
}
