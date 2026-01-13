import { mysql } from '@api/clients'
import LoggerJobContext from '@api/Context/LoggerJobContext'
import { CourseTable, FacultyTable, NewExplicitStudyPlan, NewStudyPlanCourse, StudyPlanCourseTable, StudyPlanTable } from '@api/Database/types'
import ScraperInSISFaculty from '@scraper/Interfaces/ScraperInSISFaculty'
import { ScraperInSISStudyPlanResponseJob } from '@scraper/Interfaces/ScraperResponseJob'

/**
 * Syncs a scraped InSIS Study Plan into the database.
 */
export default async function ScraperResponseInSISStudyPlanJob(data: ScraperInSISStudyPlanResponseJob): Promise<void> {
	const { plan } = data

	if (!plan) return

	let facultyId: string | null = null
	if (plan.faculty) facultyId = await upsertFaculty(plan.faculty)

	let studyPlanId = plan.id
	const isUnknownId = studyPlanId === -1

	if (isUnknownId) {
		// ID is unknown (scraped from course page). Try to find existing plan by metadata.
		if (plan.ident && facultyId && plan.semester) {
			const existingPlan = await mysql
				.selectFrom(StudyPlanTable._table)
				.select('id')
				.where(eb =>
					eb.and([eb('ident', '=', plan.ident), eb('faculty_id', '=', facultyId), eb('semester', '=', plan.semester), eb('year', '=', plan.year)])
				)
				.executeTakeFirst()

			if (existingPlan) {
				studyPlanId = existingPlan.id
			} else {
				// Create new plan
				const result = await mysql
					.insertInto(StudyPlanTable._table)
					.values({
						url: plan.url,
						ident: plan.ident,
						title: plan.title,
						faculty_id: facultyId,
						semester: plan.semester,
						year: plan.year,
						level: plan.level,
						mode_of_study: plan.mode_of_study,
						study_length: plan.study_length
					})
					.executeTakeFirst()

				if (result.insertId) {
					studyPlanId = Number(result.insertId)
				} else {
					LoggerJobContext.add({ error: 'Failed to create new study plan for unknown ID' })
					return
				}
			}
		} else {
			LoggerJobContext.add({ error: 'Missing metadata for unknown study plan ID', plan_ident: plan.ident })
			return
		}
	} else {
		// ID is known (Full scrape). Upsert with explicit ID.
		const planPayload: NewExplicitStudyPlan = {
			id: studyPlanId ?? undefined,
			url: plan.url,
			ident: plan.ident,
			title: plan.title,
			faculty_id: facultyId,
			semester: plan.semester,
			year: plan.year,
			level: plan.level,
			mode_of_study: plan.mode_of_study,
			study_length: plan.study_length
		}

		await mysql.insertInto(StudyPlanTable._table).values(planPayload).onDuplicateKeyUpdate(planPayload).execute()
	}

	LoggerJobContext.add({
		study_plan_id: studyPlanId,
		study_plan_ident: plan.ident,
		operation_mode: isUnknownId ? 'merge' : 'overwrite'
	})

	// Only wipe existing courses if we are doing a FULL sync
	if (!isUnknownId) {
		await mysql.deleteFrom(StudyPlanCourseTable._table).where('study_plan_id', '=', studyPlanId).execute()
	}

	if (!plan.courses || plan.courses.length === 0) return

	// Resolve Real Course IDs (only checking CourseTable, redirects removed)
	const incomingCourseIds = plan.courses.map(c => c.id).filter((id): id is number => id != null)
	const validIdMap = new Map<number, number>()

	if (incomingCourseIds.length > 0) {
		const directMatches = await mysql.selectFrom(CourseTable._table).select('id').where('id', 'in', incomingCourseIds).execute()
		directMatches.forEach(c => validIdMap.set(c.id, c.id))
	}

	// Deduplicate courses
	const uniqueCourses = new Map<string, (typeof plan.courses)[0]>()
	plan.courses.forEach(c => uniqueCourses.set(c.ident, c))

	const rowsToInsert: NewStudyPlanCourse[] = Array.from(uniqueCourses.values()).map(item => {
		let verifiedId: number | null = null
		if (item.id != null && validIdMap.has(item.id)) verifiedId = validIdMap.get(item.id)!

		return {
			study_plan_id: studyPlanId,
			course_ident: item.ident,
			course_id: verifiedId,
			group: item.group,
			category: item.category
		}
	})

	if (rowsToInsert.length > 0) {
		if (isUnknownId) {
			await mysql
				.insertInto(StudyPlanCourseTable._table)
				.values(rowsToInsert)
				.onDuplicateKeyUpdate({
					group: eb => eb.ref('values.group' as any),
					category: eb => eb.ref('values.category' as any),
					course_id: eb => eb.ref('values.course_id' as any)
				})
				.execute()
		} else {
			await mysql.insertInto(StudyPlanCourseTable._table).values(rowsToInsert).execute()
		}
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
		.values({
			id: faculty.ident,
			title: faculty.title
		})
		.onDuplicateKeyUpdate({
			title: faculty.title
		})
		.execute()

	return faculty.ident
}
