import { createRedisSubscriber } from '@api/clients'
import ScraperService from '@api/Services/ScraperService'
import { closeSSE, initSSE, sendSSEEvent, startSSEHeartbeat } from '@api/utils/sse'
import { Request, Response } from 'express'

const SSE_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

export class CourseScraperController {
	static async trigger(req: Request, res: Response): Promise<void> {
		const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
		const courseId = parseInt(rawId, 10)

		if (isNaN(courseId)) {
			res.status(400).json({ type: 'INVALID_PARAM', message: 'Course ID must be a valid integer.' })
			return
		}

		const jobId = await ScraperService.enqueueCourseScrapeById(courseId)
		res.status(202).json({ jobId })
	}

	static async status(req: Request, res: Response): Promise<void> {
		const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
		const courseId = parseInt(rawId, 10)

		if (isNaN(courseId)) {
			res.status(400).json({ type: 'INVALID_PARAM', message: 'Course ID must be a valid integer.' })
			return
		}

		initSSE(res)

		const heartbeat = startSSEHeartbeat(res)
		const sub = createRedisSubscriber()
		const channel = `course:updated:${courseId}`

		function cleanup() {
			clearInterval(heartbeat)
			sub.disconnect()
		}

		const timeout = setTimeout(() => {
			sendSSEEvent(res, 'error', { type: 'TIMEOUT', message: 'Scrape did not complete within the allowed time.' })
			cleanup()
			closeSSE(res)
		}, SSE_TIMEOUT_MS)

		await sub.subscribe(channel)

		sub.on('message', (_ch: string, msg: string) => {
			try {
				sendSSEEvent(res, 'complete', JSON.parse(msg))
			} catch {
				sendSSEEvent(res, 'complete', { raw: msg })
			}
			clearTimeout(timeout)
			cleanup()
			closeSSE(res)
		})

		sendSSEEvent(res, 'progress', { status: 'waiting' })

		req.on('close', () => {
			clearTimeout(timeout)
			cleanup()
		})
	}
}
