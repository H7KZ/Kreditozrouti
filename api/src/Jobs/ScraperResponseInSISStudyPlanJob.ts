import type { InSISStudyPlanCourseCategory, InSISStudyPlanCourseGroup } from '@shared/domain/insis'
import type { ScraperInSISStudyPlanResponseJob } from '@shared/queue/jobs'
import { sql } from 'kysely'
import { mysql } from '@api/clients'
import LoggerJobContext from '@api/Context/LoggerJobContext'
import { CourseTable, NewStudyPlanCourse, StudyPlanCourseTable, StudyPlanTable } from '@api/Database/types'
import { insertFacultiesBatch } from '@api/Jobs/helpers'

const GROUP_RANK: Record<InSISStudyPlanCourseGroup, number> = {
	field_specific_bachelor: 0,
	field_specific_master:   1,
	faculty_specific:        2,
	minor_specialization:    3,
	university_wide:         4,
}

const CATEGORY_RANK: Record<InSISStudyPlanCourseCategory, number> = {
	state_exam:         0,
	compulsory:         1,
	elective:           2,
	language:           3,
	physical_education: 4,
	beyond_scope:       5,
	exchange_program:   6,
	prohibited:         7,
}

function priorityOf(group: InSISStudyPlanCourseGroup, category: InSISStudyPlanCourseCategory): number {
	return GROUP_RANK[group] * 10 + CATEGORY_RANK[category]
}

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

	const bestByCourseIdent = new Map<string, NewStudyPlanCourse>()
	for (const item of plan.courses) {
		const candidate: NewStudyPlanCourse = {
			study_plan_id: studyPlanId,
			course_ident: item.ident,
			course_id: identToIdMap.get(item.ident) ?? null,
			group: item.group,
			category: item.category,
		}
		const existing = bestByCourseIdent.get(item.ident)
		if (!existing || priorityOf(item.group, item.category) < priorityOf(existing.group, existing.category)) {
			bestByCourseIdent.set(item.ident, candidate)
		}
	}
	const rowsToInsert = [...bestByCourseIdent.values()]

	// Fetch existing rows for this plan
	const existingRows = await mysql
		.selectFrom(StudyPlanCourseTable._table)
		.select(['id', 'course_ident', 'group', 'category'])
		.where('study_plan_id', '=', studyPlanId)
		.execute()

	if (rowsToInsert.length > 0) {
		await mysql
			.insertInto(StudyPlanCourseTable._table)
			.values(rowsToInsert)
			.onDuplicateKeyUpdate({
				course_id: sql`VALUES(course_id)`,
				group:     sql`VALUES(\`group\`)`, // group is a MySQL reserved word — must be escaped in VALUES()
				category:  sql`VALUES(category)`,
			})
			.execute()
	}

	// DELETE only the specific IDs no longer in the plan — point locks, not a range lock
	const newIdents = new Set(rowsToInsert.map(r => r.course_ident))
	const toDeleteIds = existingRows.filter(e => !newIdents.has(e.course_ident)).map(e => e.id)

	if (toDeleteIds.length > 0) {
		await mysql.deleteFrom(StudyPlanCourseTable._table).where('id', 'in', toDeleteIds).execute()
	}

	LoggerJobContext.add({
		incoming_course_count: rowsToInsert.length,
		deleted_course_count: toDeleteIds.length
	})
}
