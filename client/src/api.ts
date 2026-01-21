import type ErrorResponse from '@api/Error/ErrorResponse.ts'
import { i18n } from '@client/index.ts'
import { useAlertsStore } from '@client/stores/alerts.ts'
import axios, { type AxiosInstance } from 'axios'

const api: AxiosInstance = axios.create({
	baseURL: import.meta.env.VITE_API_URL,
	headers: {
		'Content-Type': 'application/json',
		Accept: 'application/json',
	},
	timeout: 10000,
})

api.interceptors.response.use(
	(response) => response,
	(error: unknown) => {
		const alerts = useAlertsStore()
		const t = (key: string) => i18n.global.t(key)

		const title = t('errors.failed')
		let description = t('errors.unexpected')

		// Handle Axios Errors (Network, 4xx, 5xx)
		if (axios.isAxiosError(error)) {
			const status = error.response?.status
			const data = error.response?.data as ErrorResponse | undefined

			if (status === 401) {
				alerts.addAlert({
					type: 'error',
					title: t('errors.auth.unauthorized'),
					description: t('errors.auth.pleaseSignIn'),
					timeout: 20000,
				})

				return Promise.reject(error)
			}

			if (data?.message) description = data.message || description
		}

		// Handle Generic JS Errors
		else if (error instanceof Error) {
			description = error.message
		}

		// Trigger global alert
		alerts.addAlert({
			type: 'error',
			title,
			description,
			timeout: 20000,
		})

		return Promise.reject(error)
	},
)

export default api
