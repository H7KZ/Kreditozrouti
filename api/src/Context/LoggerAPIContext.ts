import RequestContext from '@api/Context/RequestContext'
import { logger } from '@api/logger'

export interface LoggerWideEvent {
	method: string
	path: string

	timestamp: string
	environment: string
	service: string

	duration_ms?: number
	status_code?: number
	request_id?: string

	user_id?: number

	[key: string]: unknown
}

const LoggerAPIContext = {
	add: (context: Partial<LoggerWideEvent>) => {
		RequestContext.add(context)
	},

	log: logger.child({ context: 'http' })
}

export default LoggerAPIContext
