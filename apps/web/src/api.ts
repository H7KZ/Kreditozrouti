import type { AxiosInstance } from 'axios'
import axios, { AxiosError } from 'axios'
import { i18n } from '@web/index.ts'
import { useAlertsStore } from '@web/stores'

interface ErrorResponse {
	type?: string
	code?: string
	message?: string
}

const clientConfig = {
	baseURL: import.meta.env.VITE_API_URL ?? '/api',
	headers: {
		'Content-Type': 'application/json',
		Accept: 'application/json'
	},
	timeout: 10000
}

const api: AxiosInstance = axios.create(clientConfig)

/** For optional data: no global alert interceptor, so callers handle every failure themselves. */
export const quietApi: AxiosInstance = axios.create(clientConfig)

api.interceptors.response.use(
	response => response,
	(error: Error | AxiosError<ErrorResponse>): Promise<Error | ErrorResponse> => {
		const alerts = useAlertsStore()
		const t = (key: string) => i18n.global.t(key)

		let title = t('errors.failed')
		let description

		// Handle Axios Errors (Network, 4xx, 5xx)
		if (axios.isAxiosError(error)) {
			const status = error.response?.status
			const data = error.response?.data

			title = `${status}. ${t(`errors.types.${data?.type ?? 'UNKNOWN'}`)}`
			description = t(`errors.codes.${data?.code ?? '0'}`)
		}

		// Handle Generic JS Errors
		else {
			description = error.message
		}

		// Trigger global alert
		alerts.addAlert({
			type: 'error',
			title,
			description,
			timeout: 20000
		})

		if (axios.isAxiosError(error)) {
			return Promise.reject(error.response?.data ?? error)
		}

		return Promise.reject(error)
	}
)

export default api
