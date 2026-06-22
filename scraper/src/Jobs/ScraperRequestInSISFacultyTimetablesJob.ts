import type { ScraperInSISFacultyTimetables } from '@scraper/types/insis'
import type { ScraperInSISFacultyTimetablesRequestJob } from '@scraper/types/jobs'
import Config from '@scraper/Config/Config'
import LoggerJobContext from '@scraper/Context/LoggerJobContext'
import { InSISRateLimitError } from '@scraper/Errors/InSISErrors'
import ExtractInSISFacultyTimetableService from '@scraper/Services/ExtractInSISFacultyTimetableService'
import { createInSISClient } from '@scraper/Services/InSISHTTPClientService'
import { QueueService } from '@scraper/Services/QueueService'

export default async function ScraperRequestInSISFacultyTimetablesJob(
	_data: ScraperInSISFacultyTimetablesRequestJob
): Promise<ScraperInSISFacultyTimetables | null> {
	const client = createInSISClient('rozvrhy')

	const result = await client.get<string>(Config.insis.rozvrhyViewUrl)

	if (!result.success) {
		if (result.status === 429) throw new InSISRateLimitError(result.retryAfter ?? 60)
		LoggerJobContext.add({ error: 'Failed to fetch faculty timetables nav', http_status: result.status })
		return null
	}

	try {
		const faculties = ExtractInSISFacultyTimetableService.extractFaculties(result.data)

		LoggerJobContext.add({ faculties_count: faculties.length })

		const data: ScraperInSISFacultyTimetables = { faculties_count: faculties.length }

		if (faculties.length > 0) {
			await QueueService.queueFacultyTimetableRequests(faculties)
		}

		await QueueService.addFacultyTimetablesResponse(data)

		return data
	} catch (error) {
		LoggerJobContext.add({ error: 'Processing error', message: (error as Error).message })
		return null
	}
}
