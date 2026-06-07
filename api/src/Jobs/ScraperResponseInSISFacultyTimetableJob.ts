import type { ScraperInSISFacultyTimetableResponseJob } from '@shared/queue/jobs'
import { mysql } from '@api/clients'
import LoggerJobContext from '@api/Context/LoggerJobContext'

export default async function ScraperResponseInSISFacultyTimetableJob(data: ScraperInSISFacultyTimetableResponseJob): Promise<void> {
	const { timetable } = data
	if (!timetable?.ident) return

	await mysql
		.insertInto('insis_faculties')
		.ignore()
		.values({ id: timetable.ident, title: null, is_schedule_publicly_visible: false })
		.execute()

	await mysql
		.updateTable('insis_faculties')
		.set({ is_schedule_publicly_visible: timetable.is_schedule_publicly_visible })
		.where('id', '=', timetable.ident)
		.execute()

	LoggerJobContext.add({
		faculty_ident: timetable.ident,
		is_schedule_publicly_visible: timetable.is_schedule_publicly_visible
	})
}
