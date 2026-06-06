import type { ScraperInSISAcademicScheduleResponseJob } from '@shared/queue/jobs'
import { mysql } from '@api/clients'
import LoggerJobContext from '@api/Context/LoggerJobContext'
import { AcademicPeriodTable, AcademicScheduleEventTable, FacultyTable, NewAcademicPeriod, NewAcademicScheduleEvent } from '@api/Database/types'

export default async function ScraperResponseInSISAcademicScheduleJob(data: ScraperInSISAcademicScheduleResponseJob): Promise<void> {
	const { schedule } = data

	LoggerJobContext.add({
		insis_period_id: schedule.insis_period_id,
		faculty_ident: schedule.faculty_ident,
		events_count: schedule.events.length
	})

	// Ensure faculty row exists (FK constraint)
	const existingFaculty = await mysql.selectFrom(FacultyTable._table).select('id').where('id', '=', schedule.faculty_ident).executeTakeFirst()

	if (!existingFaculty) {
		await mysql
			.insertInto(FacultyTable._table)
			.values({ id: schedule.faculty_ident, title: null, is_schedule_publicly_visible: false })
			.onDuplicateKeyUpdate({ id: schedule.faculty_ident })
			.execute()
	}

	const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

	const periodPayload: NewAcademicPeriod = {
		insis_period_id: schedule.insis_period_id,
		faculty_id: schedule.faculty_ident,
		semester: schedule.semester,
		year: schedule.year,
		level: schedule.level,
		starts_at: schedule.starts_at,
		ends_at: schedule.ends_at,
		last_scraped_at: now
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { insis_period_id, ...updatePayload } = periodPayload

	await mysql.insertInto(AcademicPeriodTable._table).values(periodPayload).onDuplicateKeyUpdate(updatePayload).execute()

	// Fetch the period id for event reconciliation
	const period = await mysql
		.selectFrom(AcademicPeriodTable._table)
		.select('id')
		.where('insis_period_id', '=', schedule.insis_period_id)
		.executeTakeFirstOrThrow()

	// Delete + recreate events (no stable natural key)
	await mysql.deleteFrom(AcademicScheduleEventTable._table).where('period_id', '=', period.id).execute()

	if (schedule.events.length > 0) {
		const eventRows: NewAcademicScheduleEvent[] = schedule.events.map(event => ({
			period_id: period.id,
			title: event.title,
			starts_at: event.starts_at,
			ends_at: event.ends_at
		}))

		await mysql.insertInto(AcademicScheduleEventTable._table).values(eventRows).execute()
	}
}
