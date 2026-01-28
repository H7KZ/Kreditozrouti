import { mysql } from '@api/clients'
import LoggerJobContext from '@api/Context/LoggerJobContext'
import { CourseTable, FacultyTable, NewStudyPlanCourse, StudyPlanCourseTable, StudyPlanTable } from '@api/Database/types'
import InSISService from '@api/Services/InSISService'
import ScraperInSISFaculty from '@scraper/Interfaces/ScraperInSISFaculty'
import { ScraperInSISStudyPlanResponseJob } from '@scraper/Interfaces/ScraperResponseJob'

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
		const result = await mysql
			.insertInto(StudyPlanTable._table)
			.values({
				ident: plan.ident,
				faculty_id: facultyId,
				semester: plan.semester,
				year: plan.year,
				...planMetadata
			} as never)
			.executeTakeFirst()

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
		const upcomingPeriod = InSISService.getUpcomingPeriod()

		const identMatches = await mysql
			.selectFrom(CourseTable._table)
			.select(['id', 'ident'])
			.where('ident', 'in', incomingCourseIdents)
			.where('semester', '=', upcomingPeriod.semester)
			.where('year', '=', upcomingPeriod.year)
			.execute()

		identMatches.forEach(c => {
			if (c.ident) identToIdMap.set(c.ident, c.id)
		})
	}

	// Deduplicate courses
	const uniqueCourses = new Map<string, (typeof plan.courses)[0]>()
	plan.courses.forEach(c => uniqueCourses.set(c.ident, c))

	const rowsToInsert: NewStudyPlanCourse[] = Array.from(uniqueCourses.values()).map(item => {
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
		await mysql
			.insertInto(StudyPlanCourseTable._table)
			.values(rowsToInsert as never)
			.execute()
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

	let query = mysql.insertInto(FacultyTable._table).values({
		id: faculty.ident,
		title: faculty.title
	} as never)

	if (faculty.title) query = query.onDuplicateKeyUpdate({ title: faculty.title })
	else query = query.onDuplicateKeyUpdate({ id: faculty.ident })

	await query.execute()

	return faculty.ident
}
