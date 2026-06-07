import type { ScraperInSISFaculty } from '@shared/queue/insis'
import type { ScraperInSISStudyPlanResponseJob } from '@shared/queue/jobs'
import { mysql } from '@api/clients'
import LoggerJobContext from '@api/Context/LoggerJobContext'
import { CourseTable, FacultyTable, NewStudyPlan, NewStudyPlanCourse, StudyPlanCourseTable, StudyPlanTable } from '@api/Database/types'

/**
 * Syncs a scraped InSIS Study Plan into the database.
 */
export default async function ScraperResponseInSISStudyPlanJob(data: ScraperInSISStudyPlanResponseJob): Promise<void> {
	const { plan } = data

	if (!plan) return

	let facultyId: string | null = null
	if (plan.faculty) {
		facultyId = await upsertFaculty(plan.faculty)
	}

	let studyPlanId: number | null = null

	// We need these 4 fields to uniquely identify a plan
	if (!plan.ident || !facultyId || !plan.semester || !plan.year) {
		LoggerJobContext.add({
			error: 'Missing required metadata (ident, faculty, semester, or year) for study plan resolution',
			plan_ident: plan.ident
		})
		return
	}

	const existingPlan = await mysql
		.selectFrom(StudyPlanTable._table)
		.select('id')
		.where(eb => eb.and([eb('ident', '=', plan.ident), eb('faculty_id', '=', facultyId), eb('semester', '=', plan.semester), eb('year', '=', plan.year)]))
		.executeTakeFirst()

	const planMetadata = {
		url: plan.url,
		title: plan.title,
		level: plan.level,
		mode_of_study: plan.mode_of_study,
		study_length: plan.study_length
	}

	if (existingPlan) {
		studyPlanId = existingPlan.id

		await mysql.updateTable(StudyPlanTable._table).set(planMetadata).where('id', '=', studyPlanId).execute()
	} else {
		const newPlanValues: NewStudyPlan = {
			ident: plan.ident,
			faculty_id: facultyId,
			semester: plan.semester,
			year: plan.year,
			...planMetadata
		}
		const result = await mysql.insertInto(StudyPlanTable._table).values(newPlanValues).executeTakeFirst()

		studyPlanId = Number(result.insertId)
	}

	LoggerJobContext.add({
		study_plan_id: studyPlanId,
		study_plan_ident: plan.ident
	})

	// 3. Sync Courses (Always overwrite for a full plan scrape)
	// Wipe existing courses for this plan to ensure deleted courses are removed
	await mysql.deleteFrom(StudyPlanCourseTable._table).where('study_plan_id', '=', studyPlanId).execute()

	if (!plan.courses || plan.courses.length === 0) return

	const incomingCourseIdents = plan.courses.map(c => c.ident)

	// Map from ident -> verified DB ID (for ident+semester+year matches)
	const identToIdMap = new Map<string, number>()

	// Check by ident + semester + year
	if (incomingCourseIdents.length > 0 && plan.semester && plan.year) {
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

	const rowsToInsert: NewStudyPlanCourse[] = plan.courses.map(item => {
		let verifiedId: number | null = null

		if (identToIdMap.has(item.ident)) {
			verifiedId = identToIdMap.get(item.ident)!
		}

		return {
			study_plan_id: studyPlanId,
			course_ident: item.ident,
			course_id: verifiedId,
			group: item.group,
			category: item.category
		}
	})

	if (rowsToInsert.length > 0) {
		await mysql.insertInto(StudyPlanCourseTable._table).values(rowsToInsert).execute()
	}

	LoggerJobContext.add({
		course_count: rowsToInsert.length
	})
}

/**
 * Helper to Upsert Faculty and return its ID.
 */
async function upsertFaculty(faculty: ScraperInSISFaculty): Promise<string | null> {
	if (!faculty.ident) return null

	await mysql
		.insertInto(FacultyTable._table)
		.ignore()
		.values({ id: faculty.ident, title: null, is_schedule_publicly_visible: false })
		.execute()

	return faculty.ident
}
