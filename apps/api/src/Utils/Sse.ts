import { Response } from 'express'

export function initSSE(res: Response): void {
	res.setHeader('Content-Type', 'text/event-stream')
	res.setHeader('Cache-Control', 'no-cache')
	res.setHeader('Connection', 'keep-alive')
	res.setHeader('X-Accel-Buffering', 'no')
	res.flushHeaders()
}

export function sendSSEEvent(res: Response, event: string, data: unknown): void {
	res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

export function startSSEHeartbeat(res: Response, intervalMs = 30_000): NodeJS.Timeout {
	return setInterval(() => {
		res.write(': heartbeat\n\n')
	}, intervalMs)
}

export function closeSSE(res: Response): void {
	res.end()
}
