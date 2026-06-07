import type { ScraperInSISFacultyTimetablesResponseJob } from '@shared/queue/jobs'
import LoggerJobContext from '@api/Context/LoggerJobContext'

export default async function ScraperResponseInSISFacultyTimetablesJob(data: ScraperInSISFacultyTimetablesResponseJob): Promise<void> {
	LoggerJobContext.add({ faculties_count: data.data.faculties_count })
}
