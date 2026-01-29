import { mysql } from '@api/clients'
import LoggerJobContext from '@api/Context/LoggerJobContext'
import {
	CourseAssessmentTable,
	CourseTable,
	CourseUnitSlotTable,
	CourseUnitTable,
	Database,
	FacultyTable,
	NewCourse,
	NewCourseUnitSlot,
	StudyPlanCourseTable,
	StudyPlanTable
} from '@api/Database/types'
import {
	ScraperInSISCourseAssessmentMethod,
	ScraperInSISCourseStudyPlan,
	ScraperInSISCourseTimetableSlot,
	ScraperInSISCourseTimetableUnit
} from '@scraper/Interfaces/ScraperInSISCourse'
import ScraperInSISFaculty from '@scraper/Interfaces/ScraperInSISFaculty'
import { ScraperInSISCourseResponseJob } from '@scraper/Interfaces/ScraperResponseJob'
import { Transaction } from 'kysely'

/**
 * Syncs a scraped InSIS course into the database.
 */
export default async function ScraperResponseInSISCourseJob(data: ScraperInSISCourseResponseJob): Promise<void> {
	const { course } = data

	LoggerJobContext.add({
		course_id: course?.id,
		course_ident: course?.ident
	})

	if (!course?.id) return

	await mysql.transaction().execute(async trx => {
		let facultyId: string | null = null
		if (course.faculty) facultyId = await upsertFaculty(trx, course.faculty)

		const coursePayload: NewCourse = {
			id: course.id,
			url: course.url,
			ident: course.ident ?? '',
			title: course.title,
			title_cs: course.title_cs,
			title_en: course.title_en,
			ects: course.ects,
			faculty_id: facultyId,
			mode_of_delivery: course.mode_of_delivery,
			mode_of_completion: course.mode_of_completion,
			languages: course.languages?.join('|') ?? null,
			level: course.level,
			year_of_study: course.year_of_study,
			semester: course.semester,
			year: course.year,
			lecturers: course.lecturers?.join('|') ?? null,
			prerequisites: course.prerequisites,
			recommended_programmes: course.recommended_programmes,
			required_work_experience: course.required_work_experience,
			aims_of_the_course: course.aims_of_the_course,
			learning_outcomes: course.learning_outcomes,
			course_contents: course.course_contents,
			special_requirements: course.special_requirements,
			literature: course.literature
		}

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { id, ...updatePayload } = coursePayload

		await trx
			.insertInto(CourseTable._table)
			.values(coursePayload as never)
			.onDuplicateKeyUpdate(updatePayload)
			.execute()

		await syncAssessmentMethods(trx, course.id, course.assessment_methods ?? [])
		await syncTimetable(trx, course.id, course.timetable ?? [])

		if (course.study_plans && course.study_plans.length > 0) {
			await syncStudyPlansFromCourse(trx, course.id, course.ident ?? '', course.study_plans)
		}
	})

	LoggerJobContext.add({
		assessment_method_count: course.assessment_methods?.length ?? 0,
		timetable_unit_count: course.timetable?.length ?? 0,
		study_plan_link_count: course.study_plans?.length ?? 0
	})
}

/**
 * Reconciles assessment methods.
 */
async function syncAssessmentMethods(trx: Transaction<Database>, courseId: number, incomingMethods: ScraperInSISCourseAssessmentMethod[]): Promise<void> {
	const existingMethods = await trx.selectFrom(CourseAssessmentTable._table).selectAll().where('course_id', '=', courseId).execute()

	// 1. Deduplicate incoming methods using a Map
	const incomingMap = new Map(incomingMethods.map(m => [m.method, m]))
	const existingMap = new Map(existingMethods.map(m => [m.method, m]))

	// Delete removed
	// (Iterate existing methods; if not found in incoming unique map, delete it)
	const toDeleteIds = existingMethods.filter(em => em.method && !incomingMap.has(em.method)).map(em => em.id)
	if (toDeleteIds.length > 0) {
		await trx.deleteFrom(CourseAssessmentTable._table).where('id', 'in', toDeleteIds).execute()
	}

	// Update weights
	for (const existing of existingMethods) {
		const incoming = existing.method ? incomingMap.get(existing.method) : null
		if (incoming && existing.weight !== incoming.weight) {
			await trx.updateTable(CourseAssessmentTable._table).set({ weight: incoming.weight }).where('id', '=', existing.id).execute()
		}
	}

	// Insert new
	const toInsert = Array.from(incomingMap.values())
		.filter(im => im.method && !existingMap.has(im.method))
		.map(im => ({
			course_id: courseId,
			method: im.method,
			weight: im.weight
		}))

	if (toInsert.length > 0) {
		await trx
			.insertInto(CourseAssessmentTable._table)
			.values(toInsert as never)
			.execute()
	}
}

/**
 * Reconciles timetable units.
 */
async function syncTimetable(trx: Transaction<Database>, courseId: number, incomingUnits: ScraperInSISCourseTimetableUnit[]): Promise<void> {
	// 1. Fetch existing unit IDs for this course
	const existingUnits = await trx.selectFrom(CourseUnitTable._table).select('id').where('course_id', '=', courseId).execute()

	const existingIds = existingUnits.map(u => u.id)

	// 2. Cleanup: Delete existing slots and units
	// We must delete slots first to respect Foreign Key constraints (unless ON DELETE CASCADE is set in DB)
	if (existingIds.length > 0) {
		await trx.deleteFrom(CourseUnitSlotTable._table).where('unit_id', 'in', existingIds).execute()

		await trx.deleteFrom(CourseUnitTable._table).where('id', 'in', existingIds).execute()
	}

	// 3. Recreate: Insert new units and their slots
	for (const incoming of incomingUnits) {
		const res = await trx
			.insertInto(CourseUnitTable._table)
			.values({
				course_id: courseId,
				lecturer: incoming.lecturer,
				capacity: incoming.capacity,
				note: incoming.note
			} as never)
			.executeTakeFirstOrThrow()

		const newUnitId = Number(res.insertId)

		// Insert slots for the new unit
		// We can reuse syncSlotsForUnit, or inline the insert if we want to save the "delete" query inside it
		await syncSlotsForUnit(trx, newUnitId, incoming.slots ?? [])
	}
}

async function syncSlotsForUnit(trx: Transaction<Database>, unitId: number, incomingSlots: ScraperInSISCourseTimetableSlot[]): Promise<void> {
	// We already deleted existing slots in the parent function

	if (incomingSlots.length > 0) {
		const slotRows: NewCourseUnitSlot[] = incomingSlots.map(slot => ({
			unit_id: unitId,
			type: slot.type,
			frequency: slot.frequency,
			date: slot.date,
			day: slot.day,
			time_from: timeToMinutes(slot.time_from),
			time_to: timeToMinutes(slot.time_to),
			location: slot.location
		}))

		await trx
			.insertInto(CourseUnitSlotTable._table)
			.values(slotRows as never)
			.execute()
	}
}

/**
 * Links this course to Study Plans found on the course page.
 */
async function syncStudyPlansFromCourse(
	trx: Transaction<Database>,
	courseId: number,
	courseIdent: string,
	plans: ScraperInSISCourseStudyPlan[]
): Promise<void> {
	for (const plan of plans) {
		// 1. Ensure Faculty exists
		if (plan.facultyIdent) {
			await trx.insertInto(FacultyTable._table).values({ id: plan.facultyIdent, title: null }).onDuplicateKeyUpdate({ id: plan.facultyIdent }).execute()
		}

		// 2. Find or Create Study Plan (Partial)
		let studyPlanId: number | null = null

		const existingPlan = await trx
			.selectFrom(StudyPlanTable._table)
			.select('id')
			.where(eb =>
				eb.and([
					eb('ident', '=', plan.ident),
					plan.facultyIdent ? eb('faculty_id', '=', plan.facultyIdent) : eb.val(true),
					eb('semester', '=', plan.semester),
					eb('year', '=', plan.year)
				])
			)
			.executeTakeFirst()

		if (existingPlan) {
			studyPlanId = existingPlan.id!
		} else {
			// Create partial plan
			const res = await trx
				.insertInto(StudyPlanTable._table)
				.values({
					url: '',
					ident: plan.ident,
					faculty_id: plan.facultyIdent,
					semester: plan.semester,
					year: plan.year,
					mode_of_study: plan.mode_of_study
				} as never)
				.executeTakeFirst()

			if (res.insertId) studyPlanId = Number(res.insertId)
		}

		if (!studyPlanId) continue

		// 3. Link Course to Plan
		const linkedCourseStudyPlans = await trx
			.selectFrom(StudyPlanCourseTable._table)
			.selectAll()
			.where('study_plan_id', '=', studyPlanId)
			.where('course_id', '=', courseId)
			.where('course_ident', '=', courseIdent)
			.where('group', '=', plan.group)
			.where('category', '=', plan.category)
			.execute()

		if (linkedCourseStudyPlans.length > 0) continue

		await trx
			.insertInto(StudyPlanCourseTable._table)
			.values({
				study_plan_id: studyPlanId,
				course_id: courseId,
				course_ident: courseIdent,
				group: plan.group,
				category: plan.category
			} as never)
			.execute()
	}
}

/**
 * Helper to Upsert Faculty and return its ID.
 */
async function upsertFaculty(trx: Transaction<Database>, faculty: ScraperInSISFaculty): Promise<string | null> {
	if (!faculty.ident) return null

	let query = trx.insertInto(FacultyTable._table).values({
		id: faculty.ident,
		title: faculty.title
	} as never)

	if (faculty.title) query = query.onDuplicateKeyUpdate({ title: faculty.title })
	else query = query.onDuplicateKeyUpdate({ id: faculty.ident })

	await query.execute()

	return faculty.ident
}

function timeToMinutes(time: string | null): number | null {
	if (!time?.includes(':')) return null
	const [hours, minutes] = time.split(':').map(Number)
	return hours * 60 + minutes
}
