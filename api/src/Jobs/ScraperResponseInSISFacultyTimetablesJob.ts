import type { ScraperInSISFacultyTimetablesResponseJob } from '@shared/queue/jobs'
import LoggerJobContext from '@api/Context/LoggerJobContext'

// Discovery summary only — individual faculty data arrives via InSIS:FacultyTimetable jobs.
export default function ScraperResponseInSISFacultyTimetablesJob(data: ScraperInSISFacultyTimetablesResponseJob): void {
	LoggerJobContext.add({ faculties_count: data.data.faculties_count })
}
