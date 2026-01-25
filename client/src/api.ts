import type ErrorResponse from '@api/Error/ErrorResponse.ts'
import { i18n } from '@client/index.ts'
import { useAlertsStore } from '@client/stores/alerts.ts'
import axios, { AxiosError, type AxiosInstance } from 'axios'

const api: AxiosInstance = axios.create({
	baseURL: import.meta.env.VITE_API_URL ?? '/api',
	headers: {
		'Content-Type': 'application/json',
		Accept: 'application/json',
	},
	timeout: 10000,
})

api.interceptors.response.use(
	(response) => response,
	(error: Error | AxiosError<ErrorResponse>): Promise<Error | ErrorResponse> => {
		const alerts = useAlertsStore()
		const t = (key: string) => i18n.global.t(key)

		let title = t('errors.failed')
		let description

		// Handle Axios Errors (Network, 4xx, 5xx)
		if (axios.isAxiosError(error)) {
			const status = error.response?.status
			const data = error.response?.data

			title = `${status}. ${t(`errors.types.${data?.type ?? 'Unknown'}`)}`
			description = t(`errors.types.${data?.code ?? '0'}`)
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
			timeout: 20000,
		})

		if (axios.isAxiosError(error)) {
			return Promise.reject(error.response?.data ?? error)
		}

		return Promise.reject(error)
	},
)

export default api
