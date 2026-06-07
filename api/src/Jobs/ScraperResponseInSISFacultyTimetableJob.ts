import type { ScraperInSISFacultyTimetableResponseJob } from '@shared/queue/jobs'
import { mysql } from '@api/clients'
import LoggerJobContext from '@api/Context/LoggerJobContext'
import { FacultyTable } from '@api/Database/types'

export default async function ScraperResponseInSISFacultyTimetableJob(data: ScraperInSISFacultyTimetableResponseJob): Promise<void> {
	const { ident, is_schedule_publicly_visible } = data.timetable

	LoggerJobContext.add({ faculty_ident: ident, is_schedule_publicly_visible })

	// Ensure faculty row exists (FK constraint)
	const existingFaculty = await mysql.selectFrom(FacultyTable._table).select('id').where('id', '=', ident).executeTakeFirst()

	if (!existingFaculty) {
		await mysql
			.insertInto(FacultyTable._table)
			.values({ id: ident, title: null, is_schedule_publicly_visible: false })
			.onDuplicateKeyUpdate({ id: ident })
			.execute()
	}

	await mysql.updateTable(FacultyTable._table).set({ is_schedule_publicly_visible }).where('id', '=', ident).execute()
}
