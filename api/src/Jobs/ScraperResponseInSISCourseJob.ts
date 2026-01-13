import { mysql } from '@api/clients'
import LoggerJobContext from '@api/Context/LoggerJobContext'
import {
	CourseAssessmentMethodTable,
	CourseTable,
	CourseTimetableSlotTable,
	CourseTimetableUnitTable,
	FacultyTable,
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

	let facultyId: string | null = null
	if (course.faculty) facultyId = await upsertFaculty(course.faculty)

	const coursePayload = {
		id: course.id,
		url: course.url,
		ident: course.ident ?? '',
		title: course.title,
		czech_title: course.czech_title,
		ects: course.ects,
		faculty_id: facultyId,
		mode_of_delivery: course.mode_of_delivery,
		mode_of_completion: course.mode_of_completion,
		languages: course.languages?.join('|') ?? null,
		level: course.level,
		year_of_study: course.year_of_study,
		semester: course.semester,
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

	await mysql.insertInto(CourseTable._table).values(coursePayload).onDuplicateKeyUpdate(coursePayload).execute()

	await syncAssessmentMethods(course.id, course.assessment_methods ?? [])
	await syncTimetable(course.id, course.timetable ?? [])

	// Sync Study Plans derived from the course page
	if (course.study_plans && course.study_plans.length > 0) {
		await syncStudyPlansFromCourse(course.id, course.ident ?? '', course.study_plans)
	}

	LoggerJobContext.add({
		assessment_method_count: course.assessment_methods?.length ?? 0,
		timetable_unit_count: course.timetable?.length ?? 0,
		study_plan_link_count: course.study_plans?.length ?? 0
	})
}

/**
 * Upsert Faculty helper.
 */
async function upsertFaculty(faculty: ScraperInSISFaculty): Promise<string | null> {
	if (!faculty.ident) return null
	await mysql.insertInto(FacultyTable._table).values({ id: faculty.ident, title: faculty.title }).onDuplicateKeyUpdate({ title: faculty.title }).execute()
	return faculty.ident
}

/**
 * Reconciles assessment methods.
 */
async function syncAssessmentMethods(courseId: number, incomingMethods: ScraperInSISCourseAssessmentMethod[]): Promise<void> {
	const existingMethods = await mysql.selectFrom(CourseAssessmentMethodTable._table).selectAll().where('course_id', '=', courseId).execute()
	const incomingMap = new Map(incomingMethods.map(m => [m.method, m]))
	const existingMap = new Map(existingMethods.map(m => [m.method, m]))

	// Delete removed
	const toDeleteIds = existingMethods.filter(em => em.method && !incomingMap.has(em.method)).map(em => em.id)
	if (toDeleteIds.length > 0) {
		await mysql.deleteFrom(CourseAssessmentMethodTable._table).where('id', 'in', toDeleteIds).execute()
	}

	// Update weights
	for (const existing of existingMethods) {
		const incoming = existing.method ? incomingMap.get(existing.method) : null
		if (incoming && existing.weight !== incoming.weight) {
			await mysql.updateTable(CourseAssessmentMethodTable._table).set({ weight: incoming.weight }).where('id', '=', existing.id).execute()
		}
	}

	// Insert new
	const toInsert = incomingMethods
		.filter(im => im.method && !existingMap.has(im.method))
		.map(im => ({ course_id: courseId, method: im.method, weight: im.weight }))

	if (toInsert.length > 0) {
		await mysql.insertInto(CourseAssessmentMethodTable._table).values(toInsert).execute()
	}
}

/**
 * Reconciles timetable units.
 */
async function syncTimetable(courseId: number, incomingUnits: ScraperInSISCourseTimetableUnit[]): Promise<void> {
	const existingUnits = await mysql
		.selectFrom(CourseTimetableUnitTable._table)
		.select(['id', 'lecturer', 'capacity', 'note'])
		.where('course_id', '=', courseId)
		.execute()

	const getUnitHash = (u: { lecturer: string | null; capacity: number | null; note: string | null }) =>
		`${u.lecturer ?? ''}|${u.capacity ?? 0}|${u.note ?? ''}`

	const existingMap = new Map(existingUnits.map(u => [getUnitHash(u), u]))
	const processedIds: number[] = []

	for (const incoming of incomingUnits) {
		const hash = getUnitHash(incoming)
		let unitId: number

		if (existingMap.has(hash)) {
			const match = existingMap.get(hash)!
			unitId = match.id
			processedIds.push(unitId)
		} else {
			const res = await mysql
				.insertInto(CourseTimetableUnitTable._table)
				.values({
					course_id: courseId,
					lecturer: incoming.lecturer,
					capacity: incoming.capacity,
					note: incoming.note
				})
				.executeTakeFirstOrThrow()
			unitId = Number(res.insertId)
		}
		await syncSlotsForUnit(unitId, incoming.slots ?? [])
	}

	const toDeleteIds = existingUnits.map(u => u.id).filter(id => !processedIds.includes(id))
	if (toDeleteIds.length > 0) {
		await mysql.deleteFrom(CourseTimetableUnitTable._table).where('id', 'in', toDeleteIds).execute()
	}
}

async function syncSlotsForUnit(unitId: number, incomingSlots: ScraperInSISCourseTimetableSlot[]): Promise<void> {
	await mysql.deleteFrom(CourseTimetableSlotTable._table).where('timetable_unit_id', '=', unitId).execute()
	if (incomingSlots.length > 0) {
		const slotRows = incomingSlots.map(slot => ({
			timetable_unit_id: unitId,
			type: slot.type,
			frequency: slot.frequency,
			date: slot.date,
			day: slot.day,
			time_from: slot.time_from,
			time_to: slot.time_to,
			time_from_minutes: timeToMinutes(slot.time_from),
			time_to_minutes: timeToMinutes(slot.time_to),
			location: slot.location
		}))
		await mysql.insertInto(CourseTimetableSlotTable._table).values(slotRows).execute()
	}
}

/**
 * Links this course to Study Plans found on the course page.
 */
async function syncStudyPlansFromCourse(courseId: number, courseIdent: string, plans: ScraperInSISCourseStudyPlan[]): Promise<void> {
	for (const plan of plans) {
		// 1. Ensure Faculty exists
		if (plan.facultyIdent) {
			await mysql.insertInto(FacultyTable._table).values({ id: plan.facultyIdent, title: null }).onDuplicateKeyUpdate({ id: plan.facultyIdent }).execute()
		}

		// 2. Find or Create Study Plan (Partial)
		let studyPlanId: number | null = null

		const existingPlan = await mysql
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
			studyPlanId = existingPlan.id
		} else {
			// Create partial plan
			const res = await mysql
				.insertInto(StudyPlanTable._table)
				.values({
					url: '',
					ident: plan.ident,
					faculty_id: plan.facultyIdent,
					semester: plan.semester,
					year: plan.year,
					mode_of_study: plan.mode_of_study
				})
				.executeTakeFirst()

			if (res.insertId) studyPlanId = Number(res.insertId)
		}

		// 3. Link Course to Plan
		if (studyPlanId) {
			await mysql
				.insertInto(StudyPlanCourseTable._table)
				.values({
					study_plan_id: studyPlanId,
					course_id: courseId,
					course_ident: courseIdent,
					group: plan.group,
					category: plan.category
				})
				.onDuplicateKeyUpdate({
					group: plan.group,
					category: plan.category
				})
				.execute()
		}
	}
}

function timeToMinutes(time: string | null): number | null {
	if (!time?.includes(':')) return null
	const [hours, minutes] = time.split(':').map(Number)
	return hours * 60 + minutes
}
