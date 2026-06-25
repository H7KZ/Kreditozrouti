import { createHash } from 'crypto'
import type { ScraperInSISCourse } from '@shared/queue/insis'
import type { ScraperInSISCourseRequestJob } from '@shared/queue/jobs'
import LoggerJobContext from '@scraper/Context/LoggerJobContext'
import { InSISNetworkError, InSISParseError, InSISRateLimitError } from '@scraper/Errors/InSISErrors'
import ExtractInSISCourseService from '@scraper/Services/ExtractInSISCourseService'
import { createInSISClient } from '@scraper/Services/InSISHTTPClientService'
import { QueueService } from '@scraper/Services/QueueService'
import { withCzechLang, withEnglishJazyk } from '@scraper/Utils/HTTPUtils'

/**
 * Scrapes a single InSIS course syllabus page.
 * Fetches both CS (jazyk=1) and EN (jazyk=3) versions.
 * Skips DB write only when both content hashes are unchanged.
 *
 * Throws InSISNetworkError on HTTP failures (retryable, up to 3 attempts).
 * Throws InSISParseError on extraction failures (UnrecoverableError, not retried).
 */
export default async function ScraperRequestInSISCourseJob(data: ScraperInSISCourseRequestJob): Promise<ScraperInSISCourse | null> {
	const courseId = ExtractInSISCourseService.extractIdFromUrl(data.url)
	const client = createInSISClient('course')

	LoggerJobContext.add({ course_id: courseId, url: data.url })

	const csResult = await client.get<string>(withCzechLang(data.url))

	if (!csResult.success) {
		if (csResult.status === 429) throw new InSISRateLimitError(csResult.retryAfter ?? 60)
		throw new InSISNetworkError(`HTTP request failed for course ${courseId} at ${data.url}`)
	}

	const csHash = createHash('sha256').update(csResult.data).digest('hex')

	// Best-effort EN fetch — failures are silently ignored
	let enHtml: string | null = null
	let enHash: string | null = null

	const enResult = await client.get<string>(withEnglishJazyk(withCzechLang(data.url)))
	if (enResult.success) {
		enHtml = enResult.data
		enHash = createHash('sha256').update(enHtml).digest('hex')
	}

	// Skip if both hashes are unchanged
	if (data.content_hash_cs && data.content_hash_cs === csHash) {
		if (!enHash || (data.content_hash_en && data.content_hash_en === enHash)) {
			LoggerJobContext.add({ hash_hit: true, course_id: courseId })
			return null
		}
	}
	LoggerJobContext.add({ hash_miss: true, course_id: courseId })

	if (ExtractInSISCourseService.isNotFound(csResult.data)) {
		LoggerJobContext.add({ not_found: true, course_id: courseId })
		if (courseId !== null) {
			await QueueService.addCourseNotFound(courseId)
		}
		return null
	}

	try {
		const course = ExtractInSISCourseService.extract(csResult.data, data.url)

		if (!course) {
			throw new InSISParseError(`Course extraction returned null for ${courseId}`)
		}

		course.content_hash_cs = csHash
		course.content_hash_en = enHash

		if (enHtml) {
			const enFields = ExtractInSISCourseService.extractEnglishFields(enHtml)
			Object.assign(course, enFields)

			const enMethodNames = ExtractInSISCourseService.extractEnglishAssessmentMethods(enHtml)
			if (course.assessment_methods && enMethodNames.length > 0) {
				course.assessment_methods = course.assessment_methods.map((m, i) => ({
					...m,
					method_en: enMethodNames[i] ?? null
				}))
			}
		}

		await QueueService.addCourseResponse(course)

		return course
	} catch (error) {
		if (error instanceof InSISParseError) throw error

		LoggerJobContext.add({
			error: 'Extraction error',
			message: (error as Error).message
		})
		throw new InSISParseError(`Extraction error for course ${courseId}: ${(error as Error).message}`)
	}
}
